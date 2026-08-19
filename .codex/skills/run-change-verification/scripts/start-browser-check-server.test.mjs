import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const workspaceRoot = process.cwd();
const serverScript = resolve(
  workspaceRoot,
  '.codex/skills/run-change-verification/scripts/start-browser-check-server.mjs',
);

function timestampFor(offset) {
  return new Date(Date.now() + offset * 1000)
    .toISOString()
    .replaceAll(/[-:TZ.]/g, '')
    .slice(0, 14);
}

function allocateRunDirectory(label) {
  const changeRoot = resolve(
    workspaceRoot,
    'test-results/change-verification',
    `SERVER-ENV-TEST-${process.pid}-${label}`,
  );
  mkdirSync(changeRoot, { recursive: true, mode: 0o700 });
  for (let offset = 0; offset < 60; offset += 1) {
    const runDir = resolve(changeRoot, timestampFor(offset));
    if (!existsSync(runDir)) {
      mkdirSync(runDir, { mode: 0o700 });
      return { changeRoot, runDir };
    }
  }
  throw new Error('Could not allocate a browser-check server test run');
}

function runEnvironment(runDir, overrides = {}) {
  const runDirRelative = runDir.slice(workspaceRoot.length + 1);
  return {
    ...process.env,
    BROWSER_CHECK_RUN_DIR: runDirRelative,
    PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:8765',
    BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
    BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runDirRelative}/runtime/browser-check.sqlite`,
    ...overrides,
  };
}

function shellSingleQuote(value) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

void test('passes only a sanitized environment and bootstraps config from the run-local env path', () => {
  const { changeRoot, runDir } = allocateRunDirectory('allowlist');
  const fakeBin = resolve(runDir, 'fake-bin');
  const capturePath = resolve(runDir, 'php-invocations.txt');
  const fakePhp = resolve(fakeBin, 'php');
  mkdirSync(fakeBin, { mode: 0o700 });
  writeFileSync(
    fakePhp,
    `#!/bin/sh
{
  printf '%s\\n' '--- invocation ---'
  env | sort
  printf '%s' 'ARGS='
  for argument in "$@"; do
    printf '<%s>' "$argument"
  done
  printf '\\n'
} >> ${shellSingleQuote(capturePath)}

case " $* " in
  *"/isolated-config-cache.php"*)
    mkdir -p "$(dirname "$APP_CONFIG_CACHE")"
    : > "$APP_CONFIG_CACHE"
    ;;
esac

exit 0
`,
    { encoding: 'utf8', mode: 0o700 },
  );
  chmodSync(fakePhp, 0o700);

  try {
    const result = spawnSync(process.execPath, [serverScript], {
      cwd: workspaceRoot,
      env: runEnvironment(runDir, {
        PATH: `${fakeBin}:${process.env.PATH}`,
        HOME: '/ambient/home/must-not-pass',
        AWS_ACCESS_KEY_ID: 'ambient-aws-secret-must-not-pass',
        OPENAI_API_KEY: 'ambient-openai-secret-must-not-pass',
        REDIS_HOST: 'ambient-redis.example.test',
        HTTP_PROXY: 'http://ambient-proxy.example.test:8080',
        INERTIA_SSR_ENABLED: 'true',
        UNRELATED_AMBIENT_SECRET: 'unrelated-ambient-secret-must-not-pass',
      }),
      encoding: 'utf8',
      timeout: 30_000,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);

    const capture = readFileSync(capturePath, 'utf8');
    assert.match(capture, /^APP_ENV=testing$/m);
    assert.match(capture, /^APP_DEBUG=false$/m);
    assert.match(capture, /^AWS_ACCESS_KEY_ID=$/m);
    assert.match(capture, /^AWS_EC2_METADATA_DISABLED=true$/m);
    assert.match(capture, /^OPENAI_API_KEY=$/m);
    assert.match(capture, /^OPENAI_BASE_URL=http:\/\/127\.0\.0\.1:9$/m);
    assert.match(capture, /^ALPHA_VANTAGE_BASE_URL=http:\/\/127\.0\.0\.1:9$/m);
    assert.match(capture, /^REDIS_HOST=127\.0\.0\.1$/m);
    assert.match(capture, /^REDIS_PORT=9$/m);
    assert.match(capture, /^DB_HOST=127\.0\.0\.1$/m);
    assert.match(capture, /^DB_PORT=9$/m);
    assert.match(capture, /^DB_USERNAME=browser_check_disabled$/m);
    assert.match(capture, /^DB_PASSWORD=$/m);
    assert.match(capture, /^MAIL_SENDMAIL_PATH=\/usr\/bin\/false$/m);
    assert.match(capture, /^INERTIA_SSR_ENABLED=false$/m);
    assert.match(capture, /^MAIL_MAILER=array$/m);
    assert.match(capture, /^FILESYSTEM_DISK=local$/m);
    assert.match(
      capture,
      new RegExp(`^HOME=${runDir.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}/runtime$`, 'm'),
    );
    assert.doesNotMatch(capture, /ambient-(?:aws|openai)-secret-must-not-pass/);
    assert.doesNotMatch(capture, /ambient-redis\.example\.test/);
    assert.doesNotMatch(capture, /ambient-proxy\.example\.test/);
    assert.doesNotMatch(capture, /unrelated-ambient-secret-must-not-pass/);
    assert.doesNotMatch(capture, /^HTTP_PROXY=/m);
    assert.doesNotMatch(capture, /^HTTPS_PROXY=/m);
    assert.doesNotMatch(capture, /^NO_PROXY=/m);
    assert.doesNotMatch(capture, /^ALL_PROXY=/m);
    assert.doesNotMatch(capture, /^HOME=\/ambient\/home\/must-not-pass$/m);
    assert.match(capture, /isolated-config-cache\.php/);
    assert.match(capture, /\/runtime\/environment/);

    const isolatedLauncher = readFileSync(
      resolve(runDir, 'runtime/isolated-config-cache.php'),
      'utf8',
    );
    assert.match(isolatedLauncher, /->useEnvironmentPath\(\$environmentPath\)/);
    assert.ok(
      isolatedLauncher.indexOf('->useEnvironmentPath($environmentPath)') <
        isolatedLauncher.indexOf('->make(ConsoleKernel::class)->bootstrap()'),
    );
    assert.doesNotMatch(isolatedLauncher, /config:cache|handleCommand/);

    assert.equal(
      readFileSync(resolve(runDir, 'runtime/environment/.env.testing'), 'utf8'),
      '# Values are supplied only by the sanitized browser-check process environment.\n',
    );
    assert.equal(
      statSync(resolve(runDir, 'runtime/bootstrap-cache/config.php')).mode & 0o777,
      0o600,
    );
  } finally {
    rmSync(changeRoot, { force: true, recursive: true });
  }
});

void test('refuses a PATH with relative search directories', () => {
  const { changeRoot, runDir } = allocateRunDirectory('unsafe-path');
  try {
    const result = spawnSync(process.execPath, [serverScript], {
      cwd: workspaceRoot,
      env: runEnvironment(runDir, { PATH: `relative-bin:${process.env.PATH}` }),
      encoding: 'utf8',
      timeout: 30_000,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /PATH may contain only non-empty absolute directories/);
    assert.equal(existsSync(resolve(runDir, 'runtime')), false);
  } finally {
    rmSync(changeRoot, { force: true, recursive: true });
  }
});
