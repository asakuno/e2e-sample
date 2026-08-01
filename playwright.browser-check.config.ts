/// <reference types="node" />

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { revisionSnapshot } from './.codex/skills/run-change-verification/scripts/revision-fingerprint.mjs';

type Revision = {
  baseSha: string;
  headSha: string;
  worktreeFingerprint: string;
};

type RunClaim = {
  schemaVersion?: unknown;
  tokenHash?: unknown;
  runDir?: unknown;
  planHash?: unknown;
  generatedSourceHash?: unknown;
  planRevision?: unknown;
  preflightRevision?: unknown;
  runtime?: unknown;
};

type RuntimeSettings = {
  baseUrl: string;
  useAuthState: boolean;
  browser: 'chromium';
  locale: 'ja-JP';
  timezone: 'Asia/Tokyo';
  authStateHash?: string;
};

const shaPattern = /^[0-9a-f]{40}$/;
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/;
const safeGitRefPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const allowedBaseUrlHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx']);

function isRevision(value: unknown): value is Revision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const revision = value as Partial<Revision>;
  return (
    typeof revision.baseSha === 'string' &&
    shaPattern.test(revision.baseSha) &&
    typeof revision.headSha === 'string' &&
    shaPattern.test(revision.headSha) &&
    typeof revision.worktreeFingerprint === 'string' &&
    fingerprintPattern.test(revision.worktreeFingerprint)
  );
}

function revisionsEqual(left: Revision, right: Revision): boolean {
  return (
    left.baseSha === right.baseSha &&
    left.headSha === right.headSha &&
    left.worktreeFingerprint === right.worktreeFingerprint
  );
}

function isSafeBaseRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    safeGitRefPattern.test(value) &&
    !value.includes('..') &&
    !value.includes('//') &&
    !value.includes('@{')
  );
}

function canonicalBaseUrl(
  value: unknown,
  label: string,
): { canonical: string; isDocker: boolean; parsed: URL } {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty URL`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, a query string, or a fragment`);
  }
  const isDocker = parsed.hostname === 'nginx';
  if (!allowedBaseUrlHosts.has(parsed.hostname)) {
    throw new Error(`${label} must target localhost, loopback, or Docker nginx`);
  }
  if (isDocker) {
    parsed.hostname = 'localhost';
  }
  return { canonical: parsed.toString(), isDocker, parsed };
}

function isRuntimeSettings(value: unknown): value is RuntimeSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const runtime = value as Partial<RuntimeSettings>;
  const expectedKeys = runtime.useAuthState
    ? ['authStateHash', 'baseUrl', 'browser', 'locale', 'timezone', 'useAuthState']
    : ['baseUrl', 'browser', 'locale', 'timezone', 'useAuthState'];
  return (
    Object.keys(runtime).sort().join(',') === expectedKeys.sort().join(',') &&
    typeof runtime.baseUrl === 'string' &&
    typeof runtime.useAuthState === 'boolean' &&
    runtime.browser === 'chromium' &&
    runtime.locale === 'ja-JP' &&
    runtime.timezone === 'Asia/Tokyo' &&
    (runtime.useAuthState
      ? typeof runtime.authStateHash === 'string' && fingerprintPattern.test(runtime.authStateHash)
      : runtime.authStateHash === undefined)
  );
}

function runtimesEqual(left: RuntimeSettings, right: RuntimeSettings): boolean {
  return (
    left.baseUrl === right.baseUrl &&
    left.useAuthState === right.useAuthState &&
    left.browser === right.browser &&
    left.locale === right.locale &&
    left.timezone === right.timezone &&
    left.authStateHash === right.authStateHash
  );
}

const runDirInput = process.env.BROWSER_CHECK_RUN_DIR?.trim();
if (!runDirInput) {
  throw new Error('BROWSER_CHECK_RUN_DIR is required');
}

const changeVerificationRoot = resolve(process.cwd(), 'test-results/change-verification');
const runDir = resolve(process.cwd(), runDirInput);
const runDirRelativePath = relative(changeVerificationRoot, runDir);
const runDirSegments = runDirRelativePath.split(sep);
const realWorkspaceRoot = realpathSync(process.cwd());

if (
  runDirRelativePath === '' ||
  runDirRelativePath === '..' ||
  runDirRelativePath.startsWith(`..${sep}`) ||
  isAbsolute(runDirRelativePath) ||
  runDirSegments.length !== 2 ||
  runDirSegments.some((segment) => segment === '')
) {
  throw new Error(
    'BROWSER_CHECK_RUN_DIR must identify test-results/change-verification/{change-id}/{run-id}',
  );
}

let realRunDir: string;
try {
  const realChangeVerificationRoot = realpathSync(changeVerificationRoot);
  realRunDir = realpathSync(runDir);
  if (
    realChangeVerificationRoot !== resolve(realWorkspaceRoot, 'test-results/change-verification')
  ) {
    throw new Error('test-results/change-verification must not be a symlink');
  }
  if (relative(realChangeVerificationRoot, realRunDir) !== runDirRelativePath) {
    throw new Error('the run path contains a symlink or resolves to another location');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`BROWSER_CHECK_RUN_DIR must exist without symlink indirection: ${message}`);
}

function assertNoSymlinkDescendants(path: string): void {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink()) {
    throw new Error(`run directories and files must not be symlinks: ${path}`);
  }
  if (pathStat.isDirectory()) {
    readdirSync(path).forEach((entry) => assertNoSymlinkDescendants(resolve(path, entry)));
  }
}

assertNoSymlinkDescendants(realRunDir);

const generatedDir = resolve(realRunDir, 'generated');
if (!existsSync(generatedDir) || !statSync(generatedDir).isDirectory()) {
  throw new Error('BROWSER_CHECK_RUN_DIR/generated must exist and be a directory');
}

function collectGeneratedChecks(path: string, checks: string[] = []): string[] {
  for (const entry of readdirSync(path)) {
    const entryPath = resolve(path, entry);
    const entryStat = statSync(entryPath);
    if (entryStat.isDirectory()) {
      collectGeneratedChecks(entryPath, checks);
    } else if (!entryStat.isFile() || !entry.endsWith('.check.spec.ts')) {
      throw new Error(`generated may contain only *.check.spec.ts source files: ${entryPath}`);
    } else {
      checks.push(entryPath);
    }
  }
  return checks;
}

function generatedSourceFingerprint(): string {
  const checks = collectGeneratedChecks(generatedDir);
  if (checks.length === 0) {
    throw new Error('BROWSER_CHECK_RUN_DIR/generated must contain a temporary check');
  }
  const fingerprint = createHash('sha256');
  for (const check of checks.sort((left, right) => {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  })) {
    fingerprint.update(relative(generatedDir, check).split(sep).join('/'));
    fingerprint.update('\0');
    fingerprint.update(readFileSync(check));
    fingerprint.update('\0');
  }
  return `sha256:${fingerprint.digest('hex')}`;
}

const planPath = resolve(realRunDir, 'plan.json');
if (
  !existsSync(planPath) ||
  lstatSync(planPath).isSymbolicLink() ||
  !statSync(planPath).isFile() ||
  realpathSync(planPath) !== planPath
) {
  throw new Error('The browser-check plan is missing or invalid');
}
const planSource = readFileSync(planPath, 'utf8');
let plan: {
  schemaVersion?: unknown;
  change?: { baseRef?: unknown };
  environment?: {
    baseUrl?: unknown;
    appEnvironment?: unknown;
    browser?: unknown;
    locale?: unknown;
    timezone?: unknown;
    useAuthState?: unknown;
  };
  revision?: unknown;
};
try {
  plan = JSON.parse(planSource) as typeof plan;
} catch {
  throw new Error('The browser-check plan is not valid JSON');
}
const baseRef = plan.change?.baseRef;
if (plan.schemaVersion !== '1.0' || !isSafeBaseRef(baseRef) || !isRevision(plan.revision)) {
  throw new Error('plan.json must use schemaVersion 1.0 with a safe baseRef and Git revision');
}
const appEnvironment = plan.environment?.appEnvironment;
if (
  typeof appEnvironment !== 'string' ||
  appEnvironment.trim() === '' ||
  ['prod', 'production', 'live'].includes(appEnvironment.trim().toLowerCase()) ||
  plan.environment?.browser !== 'chromium' ||
  plan.environment?.locale !== 'ja-JP' ||
  plan.environment?.timezone !== 'Asia/Tokyo'
) {
  throw new Error(
    'plan.environment must be non-production with browser=chromium, locale=ja-JP, and timezone=Asia/Tokyo',
  );
}
const planRevision = plan.revision;
const planHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
const generatedSourceHash = generatedSourceFingerprint();
const plannedBaseUrl = canonicalBaseUrl(plan.environment?.baseUrl, 'plan.environment.baseUrl');
const runtimeBaseUrl = canonicalBaseUrl(
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000',
  'PLAYWRIGHT_BASE_URL',
);
if (plannedBaseUrl.canonical !== runtimeBaseUrl.canonical) {
  throw new Error('PLAYWRIGHT_BASE_URL must match plan.environment.baseUrl');
}
const plannedUseAuthState = plan.environment?.useAuthState ?? false;
if (typeof plannedUseAuthState !== 'boolean') {
  throw new Error('plan.environment.useAuthState must be boolean when provided');
}
const authStatePreference = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() ?? 'false';
if (!['true', 'false'].includes(authStatePreference)) {
  throw new Error('BROWSER_CHECK_USE_AUTH_STATE must be true or false when provided');
}
const useAuthState = authStatePreference === 'true';
if (useAuthState !== plannedUseAuthState) {
  throw new Error('BROWSER_CHECK_USE_AUTH_STATE must match plan.environment.useAuthState');
}
const authStatePath = resolve(realWorkspaceRoot, 'playwright/.auth/user.json');
let authStateHash: string | undefined;
if (useAuthState) {
  if (
    !existsSync(authStatePath) ||
    lstatSync(authStatePath).isSymbolicLink() ||
    !statSync(authStatePath).isFile() ||
    realpathSync(authStatePath) !== authStatePath
  ) {
    throw new Error('BROWSER_CHECK_USE_AUTH_STATE=true requires an immutable workspace auth file');
  }
  authStateHash = `sha256:${createHash('sha256')
    .update(readFileSync(authStatePath))
    .digest('hex')}`;
}
const runtime: RuntimeSettings = {
  baseUrl: runtimeBaseUrl.canonical,
  useAuthState,
  browser: 'chromium',
  locale: 'ja-JP',
  timezone: 'Asia/Tokyo',
  ...(authStateHash ? { authStateHash } : {}),
};

const claimPath = resolve(realRunDir, '.browser-check-run.json');
const runToken = process.env.BROWSER_CHECK_RUN_TOKEN?.trim();
if (!runToken) {
  throw new Error('Use npm run test:browser-check so the run is claimed atomically');
}
if (
  !existsSync(claimPath) ||
  lstatSync(claimPath).isSymbolicLink() ||
  !statSync(claimPath).isFile()
) {
  throw new Error('The browser-check run claim is missing or invalid');
}
let runClaim: RunClaim;
try {
  runClaim = JSON.parse(readFileSync(claimPath, 'utf8')) as RunClaim;
} catch {
  throw new Error('The browser-check run claim is not valid JSON');
}
const suppliedRunTokenHash = createHash('sha256').update(runToken).digest('hex');
if (
  runClaim.schemaVersion !== '1.0' ||
  runClaim.tokenHash !== suppliedRunTokenHash ||
  runClaim.runDir !== realRunDir ||
  runClaim.planHash !== planHash ||
  runClaim.generatedSourceHash !== generatedSourceHash ||
  !isRevision(runClaim.planRevision) ||
  !revisionsEqual(runClaim.planRevision, planRevision) ||
  !isRevision(runClaim.preflightRevision) ||
  !revisionsEqual(runClaim.preflightRevision, planRevision) ||
  !isRuntimeSettings(runClaim.runtime) ||
  !runtimesEqual(runClaim.runtime, runtime)
) {
  throw new Error('The browser-check run claim does not match this execution');
}

let currentRevision: Revision;
try {
  currentRevision = revisionSnapshot(baseRef, realWorkspaceRoot) as Revision;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`The browser-check Git revision could not be resolved: ${message}`);
}
if (!isRevision(currentRevision) || !revisionsEqual(currentRevision, planRevision)) {
  throw new Error('The browser-check plan is stale for the current Git worktree');
}

// Generated checks inherit the verified canonical path instead of the untrusted input path.
process.env.BROWSER_CHECK_RUN_DIR = realRunDir;

const parsedBaseURL = runtimeBaseUrl.parsed;
const isDocker = runtimeBaseUrl.isDocker;
const browserBaseURL = runtimeBaseUrl.canonical;
const webServerPort = parsedBaseURL.port || (parsedBaseURL.protocol === 'https:' ? '443' : '80');
const webServerHost = parsedBaseURL.hostname === '[::1]' ? '::1' : parsedBaseURL.hostname;

export default defineConfig({
  testDir: resolve(realRunDir, 'generated'),
  testMatch: '**/*.check.spec.ts',
  outputDir: resolve(realRunDir, 'artifacts'),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  reporter: [
    ['list'],
    ['json', { outputFile: resolve(realRunDir, 'playwright-results.json') }],
    ['html', { outputFolder: resolve(realRunDir, 'playwright-report'), open: 'never' }],
  ],

  use: {
    baseURL: browserBaseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    ...(isDocker
      ? {
          launchOptions: {
            args: ['--host-resolver-rules=MAP localhost nginx'],
          },
        }
      : {}),
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(useAuthState ? { storageState: authStatePath } : {}),
      },
    },
  ],

  ...(isDocker || parsedBaseURL.protocol === 'https:'
    ? {}
    : {
        webServer: {
          command: `php artisan serve --host=${webServerHost} --port=${webServerPort}`,
          url: parsedBaseURL.origin,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
});
