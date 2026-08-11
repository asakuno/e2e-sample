#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function fail(message) {
  console.error(`The isolated browser-check server could not start: ${message}`);
  process.exit(2);
}

function pathStaysInside(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function resolvePhpBinary(rawPath) {
  if (!rawPath || rawPath.includes('\0') || rawPath.includes('\n') || rawPath.includes('\r')) {
    fail('PATH must be a non-empty, single-line executable search path');
  }

  const searchDirectories = rawPath.split(delimiter);
  if (
    searchDirectories.some(
      (directory) => directory === '' || !isAbsolute(directory) || directory.includes('\0'),
    )
  ) {
    fail('PATH may contain only non-empty absolute directories');
  }

  for (const searchDirectory of searchDirectories) {
    try {
      const candidate = realpathSync(resolve(searchDirectory, 'php'));
      if (!lstatSync(candidate).isFile()) {
        continue;
      }
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) {
        throw error;
      }
    }
  }

  fail('an executable php binary could not be resolved from PATH');
}

const workspaceRoot = realpathSync(process.cwd());
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
try {
  lstatSync(resolve(workspaceRoot, 'public/storage'));
  fail('host mode requires public/storage to be absent so shared storage cannot be exposed');
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}
const runDirInput = process.env.BROWSER_CHECK_RUN_DIR?.trim();
if (!runDirInput) {
  fail('BROWSER_CHECK_RUN_DIR is required');
}

let runDir;
let verificationRootRealPath;
try {
  verificationRootRealPath = realpathSync(verificationRoot);
  runDir = realpathSync(resolve(workspaceRoot, runDirInput));
} catch (error) {
  fail(`the run directory must already exist: ${error.message}`);
}

const runRelativePath = relative(verificationRootRealPath, runDir);
const runSegments = runRelativePath.split(sep);
if (
  verificationRootRealPath !== verificationRoot ||
  !pathStaysInside(verificationRootRealPath, runDir) ||
  runSegments.length !== 2 ||
  !/^\d{14}$/.test(runSegments[1])
) {
  fail(
    'BROWSER_CHECK_RUN_DIR must identify test-results/change-verification/{change-id}/{yyyyMMddHHmmss} without symlinks',
  );
}

const rawBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
if (!rawBaseUrl) {
  fail('PLAYWRIGHT_BASE_URL is required');
}

let baseUrl;
try {
  baseUrl = new URL(rawBaseUrl);
} catch {
  fail('PLAYWRIGHT_BASE_URL must be a valid URL');
}
if (
  baseUrl.protocol !== 'http:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname) ||
  baseUrl.username ||
  baseUrl.password ||
  baseUrl.search ||
  baseUrl.hash
) {
  fail('the host runtime requires a credential-free HTTP loopback PLAYWRIGHT_BASE_URL');
}
const port = Number(baseUrl.port || '80');
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  fail('the host runtime requires an explicit unprivileged port');
}
const serveHost = baseUrl.hostname === '[::1]' ? '::1' : baseUrl.hostname;

const databaseConnection = process.env.BROWSER_CHECK_DATABASE_CONNECTION?.trim();
if (databaseConnection !== 'sqlite') {
  fail('the host runtime requires BROWSER_CHECK_DATABASE_CONNECTION=sqlite');
}

const databasePathRelative = `${relative(workspaceRoot, runDir)
  .split(sep)
  .join('/')}/runtime/browser-check.sqlite`;
const expectedDatabaseIdentifier = `sqlite:${databasePathRelative}`;
const rawDatabaseIdentifier = process.env.BROWSER_CHECK_DATABASE_IDENTIFIER;
if (!rawDatabaseIdentifier || rawDatabaseIdentifier.trim() === '') {
  fail('BROWSER_CHECK_DATABASE_IDENTIFIER is required');
}
if (rawDatabaseIdentifier !== expectedDatabaseIdentifier) {
  fail(
    `BROWSER_CHECK_DATABASE_IDENTIFIER must identify this run-local SQLite database (${expectedDatabaseIdentifier})`,
  );
}
const phpBinary = resolvePhpBinary(process.env.PATH);

const runtimeDir = resolve(runDir, 'runtime');
const runtimeBootstrapCacheDir = resolve(runtimeDir, 'bootstrap-cache');
const runtimeEnvironmentDir = resolve(runtimeDir, 'environment');
const runtimeStorageDir = resolve(runtimeDir, 'storage');
const runtimeTmpDir = resolve(runtimeDir, 'tmp');
const runtimeViewsDir = resolve(runtimeStorageDir, 'framework/views');
const databasePath = resolve(runtimeDir, 'browser-check.sqlite');
try {
  mkdirSync(runtimeDir, { mode: 0o700 });
  mkdirSync(runtimeBootstrapCacheDir, { mode: 0o700 });
  mkdirSync(runtimeEnvironmentDir, { mode: 0o700 });
  mkdirSync(runtimeTmpDir, { mode: 0o700 });
  for (const storagePath of [
    'app/private',
    'app/public',
    'framework/cache/data',
    'framework/sessions',
    'framework/views',
    'logs',
  ]) {
    mkdirSync(resolve(runtimeStorageDir, storagePath), { recursive: true, mode: 0o700 });
  }
  const databaseDescriptor = openSync(databasePath, 'wx', 0o600);
  closeSync(databaseDescriptor);
  writeFileSync(
    resolve(runtimeEnvironmentDir, '.env.testing'),
    '# Values are supplied only by the sanitized browser-check process environment.\n',
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  fail(`the run-local runtime must be fresh and writable: ${error.message}`);
}

const runtimeHash = createHash('sha256').update(rawDatabaseIdentifier).digest();
const disabledNetworkEndpoint = 'http://127.0.0.1:9';
const childEnvironment = {
  PATH: [dirname(phpBinary), '/usr/bin', '/bin'].join(delimiter),
  HOME: runtimeDir,
  TMPDIR: runtimeTmpDir,
  LANG: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
  TERM: 'dumb',
  NO_COLOR: '1',
  APP_NAME: 'Browser Check',
  APP_ENV: 'testing',
  APP_DEBUG: 'false',
  APP_KEY: `base64:${runtimeHash.toString('base64')}`,
  APP_PREVIOUS_KEYS: '',
  APP_URL: baseUrl.origin,
  APP_CONFIG_CACHE: resolve(runtimeBootstrapCacheDir, 'config.php'),
  APP_EVENTS_CACHE: resolve(runtimeBootstrapCacheDir, 'events.php'),
  APP_PACKAGES_CACHE: resolve(runtimeBootstrapCacheDir, 'packages.php'),
  APP_ROUTES_CACHE: resolve(runtimeBootstrapCacheDir, 'routes.php'),
  APP_SERVICES_CACHE: resolve(runtimeBootstrapCacheDir, 'services.php'),
  LARAVEL_STORAGE_PATH: runtimeStorageDir,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: databasePath,
  DB_FOREIGN_KEYS: 'true',
  DB_HOST: '127.0.0.1',
  DB_PORT: '9',
  DB_USERNAME: 'browser_check_disabled',
  DB_PASSWORD: '',
  DB_SOCKET: '',
  DB_URL: 'null',
  MYSQL_ATTR_SSL_CA: 'null',
  CACHE_STORE: 'array',
  CACHE_DRIVER: 'array',
  CACHE_PREFIX: `browser_check_${runtimeHash.toString('hex').slice(0, 24)}`,
  QUEUE_CONNECTION: 'sync',
  QUEUE_FAILED_DRIVER: 'null',
  MARKET_DATA_DISPLAY_SOURCE: 'demo',
  SESSION_DRIVER: 'database',
  SESSION_CONNECTION: 'sqlite',
  SESSION_COOKIE: `browser_check_${runtimeHash.toString('hex').slice(0, 24)}`,
  SESSION_DOMAIN: 'null',
  SESSION_ENCRYPT: 'true',
  SESSION_SECURE_COOKIE: 'false',
  SESSION_SAME_SITE: 'lax',
  SESSION_STORE: 'null',
  LOG_CHANNEL: 'stderr',
  LOG_LEVEL: 'warning',
  LOG_SLACK_WEBHOOK_URL: '',
  MAIL_MAILER: 'array',
  MAIL_URL: 'null',
  MAIL_HOST: '127.0.0.1',
  MAIL_PORT: '9',
  MAIL_USERNAME: 'null',
  MAIL_PASSWORD: 'null',
  MAIL_SENDMAIL_PATH: '/usr/bin/false',
  BROADCAST_CONNECTION: 'log',
  FILESYSTEM_DISK: 'local',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_BUCKET: '',
  AWS_EC2_METADATA_DISABLED: 'true',
  AWS_ENDPOINT: disabledNetworkEndpoint,
  AWS_URL: disabledNetworkEndpoint,
  AWS_USE_PATH_STYLE_ENDPOINT: 'true',
  POSTMARK_API_KEY: '',
  RESEND_API_KEY: '',
  SLACK_BOT_USER_OAUTH_TOKEN: '',
  SLACK_BOT_USER_DEFAULT_CHANNEL: '',
  SQS_PREFIX: disabledNetworkEndpoint,
  SQS_QUEUE: 'disabled',
  DYNAMODB_ENDPOINT: disabledNetworkEndpoint,
  MEMCACHED_HOST: '127.0.0.1',
  MEMCACHED_PORT: '9',
  REDIS_URL: 'null',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '9',
  REDIS_USERNAME: 'null',
  REDIS_PASSWORD: 'null',
  ALPHA_VANTAGE_API_KEY: '',
  ALPHA_VANTAGE_BASE_URL: disabledNetworkEndpoint,
  ALPHA_VANTAGE_TIMEOUT: '1',
  OPENAI_API_KEY: '',
  OPENAI_BASE_URL: disabledNetworkEndpoint,
  OPENAI_ANALYSIS_TIMEOUT: '1',
  INERTIA_SSR_ENABLED: 'false',
  INERTIA_SSR_URL: disabledNetworkEndpoint,
  FRONTEND_URL: baseUrl.origin,
  VIEW_COMPILED_PATH: runtimeViewsDir,
  PHP_CLI_SERVER_WORKERS: '1',
  PLAYWRIGHT_BASE_URL: rawBaseUrl,
  BROWSER_CHECK_RUN_DIR: runDir,
  BROWSER_CHECK_DATABASE_CONNECTION: databaseConnection,
  BROWSER_CHECK_DATABASE_IDENTIFIER: rawDatabaseIdentifier,
};

const isolatedBootstrapPath = resolve(runtimeDir, 'isolated-config-cache.php');
try {
  writeFileSync(
    isolatedBootstrapPath,
    `<?php

use Illuminate\\Contracts\\Console\\Kernel as ConsoleKernel;
use Illuminate\\Foundation\\Application;

define('LARAVEL_START', microtime(true));

$workspaceRoot = $argv[1] ?? null;
$environmentPath = $argv[2] ?? null;
$storagePath = $argv[3] ?? null;
$configCachePath = $argv[4] ?? null;
if (! is_string($workspaceRoot) || ! is_string($environmentPath)
    || ! is_string($storagePath) || ! is_string($configCachePath)) {
    fwrite(STDERR, "The isolated config-cache launcher requires four paths.\\n");
    exit(2);
}

require $workspaceRoot.'/vendor/autoload.php';

/** @var Application $app */
$app = require $workspaceRoot.'/bootstrap/app.php';
$app->useEnvironmentPath($environmentPath);
$app->useStoragePath($storagePath);
$app->make(ConsoleKernel::class)->bootstrap();

$contents = '<?php return '.var_export($app['config']->all(), true).';'.PHP_EOL;
if (file_put_contents($configCachePath, $contents, LOCK_EX) === false) {
    fwrite(STDERR, "The isolated config cache could not be written.\\n");
    exit(1);
}

try {
    $cachedConfig = require $configCachePath;
    if (! is_array($cachedConfig)) {
        throw new RuntimeException('The isolated config cache did not return an array.');
    }
} catch (Throwable $error) {
    @unlink($configCachePath);
    fwrite(STDERR, "The isolated config cache could not be loaded safely.\\n");
    exit(1);
}
`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  fail(`the isolated Artisan launcher could not be created: ${error.message}`);
}

const configCacheResult = spawnSync(
  phpBinary,
  [
    isolatedBootstrapPath,
    workspaceRoot,
    runtimeEnvironmentDir,
    runtimeStorageDir,
    childEnvironment.APP_CONFIG_CACHE,
  ],
  {
    cwd: workspaceRoot,
    env: childEnvironment,
    stdio: 'inherit',
    timeout: 120_000,
    killSignal: 'SIGTERM',
  },
);
if (configCacheResult.error) {
  fail(`the isolated Laravel config cache could not start: ${configCacheResult.error.message}`);
}
if (configCacheResult.signal) {
  fail(`the isolated Laravel config cache ended from signal ${configCacheResult.signal}`);
}
if (configCacheResult.status !== 0) {
  fail(`the isolated Laravel config cache exited ${configCacheResult.status}`);
}
try {
  const configCachePath = childEnvironment.APP_CONFIG_CACHE;
  const configCacheStat = lstatSync(configCachePath);
  if (!configCacheStat.isFile() || realpathSync(configCachePath) !== configCachePath) {
    fail('the isolated Laravel config cache must be a run-local regular file without symlinks');
  }
  chmodSync(configCachePath, 0o600);
} catch (error) {
  fail(`the isolated Laravel config cache was not created safely: ${error.message}`);
}

function runArtisan(arguments_) {
  const result = spawnSync(phpBinary, ['artisan', ...arguments_], {
    cwd: workspaceRoot,
    env: childEnvironment,
    stdio: 'inherit',
    timeout: 120_000,
    killSignal: 'SIGTERM',
  });
  if (result.error) {
    fail(`php artisan ${arguments_.join(' ')} could not start: ${result.error.message}`);
  }
  if (result.signal) {
    fail(`php artisan ${arguments_.join(' ')} ended from signal ${result.signal}`);
  }
  if (result.status !== 0) {
    fail(`php artisan ${arguments_.join(' ')} exited ${result.status}`);
  }
}

runArtisan(['migrate:fresh', '--force', '--env=testing']);
runArtisan(['db:seed', '--class=StockAnalysisDemoSeeder', '--force', '--env=testing']);

const server = spawn(
  phpBinary,
  ['artisan', 'serve', '--env=testing', '--no-reload', `--host=${serveHost}`, `--port=${port}`],
  {
    cwd: workspaceRoot,
    env: childEnvironment,
    stdio: 'inherit',
  },
);

server.on('error', (error) => {
  fail(`php artisan serve could not start: ${error.message}`);
});
server.on('exit', (code, signal) => {
  if (signal) {
    console.error(`The isolated browser-check server ended from signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!server.killed) {
      server.kill(signal);
    }
  });
}
