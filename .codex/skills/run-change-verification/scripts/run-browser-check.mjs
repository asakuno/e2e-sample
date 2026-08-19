#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { frontendAssetsFingerprint } from './browser-check-assets.mjs';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SAFE_GIT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const CHECK_ID_PATTERN_SOURCE =
  '(?<![A-Za-z0-9-])BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{3}(?![A-Za-z0-9-])';
const ALLOWED_BASE_URL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx-browser-check']);
const DATABASE_CONNECTIONS = new Set(['mysql', 'sqlite']);
const ZIP_SIGNATURES = new Set(['504b0304', '504b0506', '504b0708']);
const TRUSTED_REVISION_ENVIRONMENT = {
  baseSha: 'BROWSER_CHECK_TRUSTED_BASE_SHA',
  headSha: 'BROWSER_CHECK_TRUSTED_HEAD_SHA',
  worktreeFingerprint: 'BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT',
};
const TRUSTED_DEPENDENCIES_ENVIRONMENT = 'BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT';
const FILE_READ_CHUNK_BYTES = 64 * 1024;
const MAX_STRUCTURED_FILE_BYTES = 16 * 1024 * 1024;
const CONTRACT_TEST_PLAYWRIGHT_TIMEOUT_MS = 15_000;
const CONTRACT_TEST_TERMINATION_GRACE_MS = 500;
const MAX_TEMPORARY_CHECKS_PER_RUN = 12;
const PLAYWRIGHT_TEST_TIMEOUT_MS = 30_000;
const PLAYWRIGHT_PER_CHECK_BUDGET_MS = PLAYWRIGHT_TEST_TIMEOUT_MS * 2;
const PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS = 120_000;
const PLAYWRIGHT_WRAPPER_OVERHEAD_MS = 30_000;
const PLAYWRIGHT_TERMINATION_GRACE_MS = 5_000;
const LOCATOR_METHODS = new Set([
  'and',
  'filter',
  'first',
  'frameLocator',
  'getByAltText',
  'getByLabel',
  'getByPlaceholder',
  'getByRole',
  'getByTestId',
  'getByText',
  'getByTitle',
  'last',
  'locator',
  'nth',
  'or',
]);
const PAGE_OBSERVATION_METHODS = new Set([
  'boundingBox',
  'count',
  'isChecked',
  'isDisabled',
  'isEditable',
  'isEnabled',
  'isHidden',
  'isVisible',
  'title',
]);
const PAGE_ASSERTION_MATCHERS = new Set(['toHaveTitle', 'toHaveURL']);
const LOCATOR_ASSERTION_MATCHERS = new Set([
  'toBeAttached',
  'toBeChecked',
  'toBeDisabled',
  'toBeEditable',
  'toBeEmpty',
  'toBeEnabled',
  'toBeFocused',
  'toBeHidden',
  'toBeInViewport',
  'toBeVisible',
  'toContainClass',
  'toContainText',
  'toHaveAccessibleDescription',
  'toHaveAccessibleErrorMessage',
  'toHaveAccessibleName',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveCount',
  'toHaveCSS',
  'toHaveId',
  'toHaveJSProperty',
  'toHaveRole',
  'toHaveText',
  'toHaveValue',
  'toHaveValues',
]);
const OBSERVED_ASSERTION_MATCHERS = new Set([
  'toBe',
  'toContain',
  'toContainEqual',
  'toEqual',
  'toHaveLength',
  'toHaveProperty',
  'toMatchObject',
  'toStrictEqual',
]);
const OBSERVED_MUTATING_METHODS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
]);
const LOCATOR_ACTION_METHODS = new Set([
  'blur',
  'check',
  'clear',
  'click',
  'dblclick',
  'dispatchEvent',
  'dragTo',
  'fill',
  'focus',
  'hover',
  'press',
  'pressSequentially',
  'selectOption',
  'setChecked',
  'tap',
  'uncheck',
  'waitFor',
]);
const PAGE_ACTION_METHODS = new Set([
  'goBack',
  'goForward',
  'reload',
  'waitForLoadState',
  'waitForURL',
]);
const FORBIDDEN_IDENTIFIERS = new Set([
  'AggregateError',
  'Error',
  'Bun',
  'Deno',
  'EventSource',
  'Function',
  'Object',
  'Promise',
  'Proxy',
  'Reflect',
  'WebAssembly',
  'WebSocket',
  'XMLHttpRequest',
  'arguments',
  'console',
  'eval',
  'fetch',
  'global',
  'globalThis',
  'module',
  'process',
  'require',
  'setImmediate',
  'setInterval',
  'setTimeout',
]);
const FORBIDDEN_PROPERTIES = new Set([
  '__proto__',
  '$$eval',
  '$eval',
  'addInitScript',
  'addListener',
  'addLocatorHandler',
  'addScriptTag',
  'addStyleTag',
  'apply',
  'arguments',
  'attach',
  'browser',
  'browserType',
  'call',
  'callee',
  'caller',
  'connect',
  'connectOverCDP',
  'context',
  'constructor',
  'createReadStream',
  'download',
  'eval',
  'evaluate',
  'evaluateAll',
  'evaluateHandle',
  'eventNames',
  'exposeBinding',
  'exposeFunction',
  'extend',
  'fetch',
  'fileChooser',
  'global',
  'globalThis',
  'launch',
  'launchPersistentContext',
  'launchServer',
  'listenerCount',
  'listeners',
  'module',
  'newBrowserCDPSession',
  'newCDPSession',
  'newContext',
  'off',
  'on',
  'once',
  'path',
  'pdf',
  'prependListener',
  'prependOnceListener',
  'process',
  'prototype',
  'rawListeners',
  'removeAllListeners',
  'removeListener',
  'request',
  'require',
  'route',
  'routeFromHAR',
  'routeWebSocket',
  'saveAs',
  'setContent',
  'setFiles',
  'setInputFiles',
  'storageState',
  'tracing',
  'unroute',
  'unrouteAll',
  'video',
  'waitForFunction',
]);

const plannedScreenshotTargets = new Set();
const plannedNavigationTargets = [];
const approvedDirectGotoMembers = new WeakSet();
const approvedPageFixtureBindings = new WeakSet();
const approvedRuntimeCalls = new WeakSet();

function hasZipSignature(contents) {
  return contents.byteLength >= 4 && ZIP_SIGNATURES.has(contents.subarray(0, 4).toString('hex'));
}

function regularFileStatsMatch(beforeStat, afterStat) {
  return (
    afterStat.isFile() &&
    !afterStat.isSymbolicLink() &&
    afterStat.nlink === 1 &&
    beforeStat.dev === afterStat.dev &&
    beforeStat.ino === afterStat.ino &&
    beforeStat.size === afterStat.size &&
    beforeStat.mtimeMs === afterStat.mtimeMs
  );
}

function streamRegularFileSync(
  filePath,
  beforeStat,
  label,
  onChunk,
  { capturePrefixBytes = 0, maxBytes } = {},
) {
  if (beforeStat.isSymbolicLink() || !beforeStat.isFile() || beforeStat.nlink !== 1) {
    throw new Error(`${label} must be a real, single-link regular file`);
  }
  if (maxBytes !== undefined && beforeStat.size > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte structural file limit`);
  }

  const prefix = Buffer.alloc(Math.min(capturePrefixBytes, beforeStat.size));
  let prefixBytes = 0;
  let descriptor;
  let descriptorAfterStat;
  let totalBytes = 0;
  try {
    descriptor = openSync(filePath, 'r');
    const descriptorBeforeStat = fstatSync(descriptor);
    if (!regularFileStatsMatch(beforeStat, descriptorBeforeStat)) {
      throw new Error(`${label} changed before it could be read`);
    }
    const chunk = Buffer.allocUnsafe(FILE_READ_CHUNK_BYTES);
    while (true) {
      const bytesRead = readSync(descriptor, chunk, 0, chunk.byteLength, null);
      if (bytesRead === 0) {
        break;
      }
      totalBytes += bytesRead;
      if (maxBytes !== undefined && totalBytes > maxBytes) {
        throw new Error(`${label} exceeds the ${maxBytes}-byte structural file limit`);
      }
      const currentChunk = chunk.subarray(0, bytesRead);
      if (prefixBytes < prefix.byteLength) {
        const bytesToCopy = Math.min(prefix.byteLength - prefixBytes, currentChunk.byteLength);
        currentChunk.copy(prefix, prefixBytes, 0, bytesToCopy);
        prefixBytes += bytesToCopy;
      }
      onChunk(currentChunk);
    }
    descriptorAfterStat = fstatSync(descriptor);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }

  const pathAfterStat = lstatSync(filePath);
  if (
    totalBytes !== beforeStat.size ||
    !descriptorAfterStat ||
    !regularFileStatsMatch(beforeStat, descriptorAfterStat) ||
    !regularFileStatsMatch(beforeStat, pathAfterStat)
  ) {
    throw new Error(`${label} changed while it was being read`);
  }
  return { prefix, size: totalBytes };
}

function hashRegularFileSync(filePath, beforeStat, label) {
  const hash = createHash('sha256');
  const { prefix, size } = streamRegularFileSync(
    filePath,
    beforeStat,
    label,
    (chunk) => hash.update(chunk),
    { capturePrefixBytes: 4 },
  );
  return { prefix, sha256: `sha256:${hash.digest('hex')}`, size };
}

function readBoundedRegularFileSync(filePath, beforeStat, label) {
  const chunks = [];
  streamRegularFileSync(filePath, beforeStat, label, (chunk) => chunks.push(Buffer.from(chunk)), {
    maxBytes: MAX_STRUCTURED_FILE_BYTES,
  });
  return Buffer.concat(chunks, beforeStat.size);
}

function readRegularFilePrefixSync(filePath, beforeStat, label, byteCount = 4) {
  if (beforeStat.isSymbolicLink() || !beforeStat.isFile() || beforeStat.nlink !== 1) {
    throw new Error(`${label} must be a real, single-link regular file`);
  }
  const prefix = Buffer.alloc(Math.min(byteCount, beforeStat.size));
  let descriptor;
  let descriptorAfterStat;
  let bytesRead = 0;
  try {
    descriptor = openSync(filePath, 'r');
    const descriptorBeforeStat = fstatSync(descriptor);
    if (!regularFileStatsMatch(beforeStat, descriptorBeforeStat)) {
      throw new Error(`${label} changed before it could be inspected`);
    }
    if (prefix.byteLength > 0) {
      bytesRead = readSync(descriptor, prefix, 0, prefix.byteLength, 0);
    }
    descriptorAfterStat = fstatSync(descriptor);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
  const pathAfterStat = lstatSync(filePath);
  if (
    bytesRead !== prefix.byteLength ||
    !descriptorAfterStat ||
    !regularFileStatsMatch(beforeStat, descriptorAfterStat) ||
    !regularFileStatsMatch(beforeStat, pathAfterStat)
  ) {
    throw new Error(`${label} changed while it was being inspected`);
  }
  return prefix;
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

function canonicalBaseUrl(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty URL`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== 'http:') {
    throw new Error(`${label} must use HTTP for the dedicated testing runtime`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, a query string, or a fragment`);
  }
  if (!ALLOWED_BASE_URL_HOSTS.has(parsed.hostname)) {
    throw new Error(`${label} must target localhost, loopback, or Docker nginx-browser-check`);
  }
  if (parsed.hostname === 'nginx-browser-check') {
    parsed.hostname = 'localhost';
  }
  return parsed.toString();
}

function dockerRuntimeFromRawBaseUrl(value, label) {
  const parsed = new URL(value);
  const isDockerRuntime = parsed.hostname === 'nginx-browser-check';
  if (isDockerRuntime) {
    if (value !== 'http://nginx-browser-check:80') {
      throw new Error(`${label} must use the exact Docker URL http://nginx-browser-check:80`);
    }
    return true;
  }
  const port = Number(parsed.port);
  if (!parsed.port || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${label} must use an explicit host port from 1024 through 65535`);
  }
  return false;
}

function trustedRevisionFromEnvironment(isDockerRuntime) {
  const revision = Object.fromEntries(
    Object.entries(TRUSTED_REVISION_ENVIRONMENT).map(([key, environmentName]) => [
      key,
      process.env[environmentName],
    ]),
  );
  const suppliedNames = Object.values(TRUSTED_REVISION_ENVIRONMENT).filter(
    (environmentName) => process.env[environmentName] !== undefined,
  );
  if (!isDockerRuntime) {
    if (suppliedNames.length > 0) {
      throw new Error(
        `${suppliedNames.join(', ')} must be absent in host mode because Git is verified directly`,
      );
    }
    return undefined;
  }
  if (suppliedNames.length !== Object.keys(TRUSTED_REVISION_ENVIRONMENT).length) {
    throw new Error(
      `${Object.values(TRUSTED_REVISION_ENVIRONMENT).join(', ')} are all required in Docker mode`,
    );
  }
  if (
    !SHA_PATTERN.test(revision.baseSha ?? '') ||
    !SHA_PATTERN.test(revision.headSha ?? '') ||
    !FINGERPRINT_PATTERN.test(revision.worktreeFingerprint ?? '')
  ) {
    throw new Error(
      'the trusted Docker revision must contain exact lowercase base/head SHAs and a sha256 worktree fingerprint',
    );
  }
  return revision;
}

function trustedDependenciesFingerprintFromEnvironment(isDockerRuntime) {
  const fingerprint = process.env[TRUSTED_DEPENDENCIES_ENVIRONMENT];
  if (!isDockerRuntime) {
    if (fingerprint !== undefined) {
      throw new Error(
        `${TRUSTED_DEPENDENCIES_ENVIRONMENT} must be absent in host mode because dependencies are used directly`,
      );
    }
    return undefined;
  }
  if (!fingerprint || !FINGERPRINT_PATTERN.test(fingerprint)) {
    throw new Error(
      `${TRUSTED_DEPENDENCIES_ENVIRONMENT} must be a lowercase sha256 fingerprint in Docker mode`,
    );
  }
  return fingerprint;
}

function databaseRuntimeBinding(isDockerRuntime, workspaceRelativeRunDir) {
  const databaseConnection = process.env.BROWSER_CHECK_DATABASE_CONNECTION?.trim();
  if (!databaseConnection || !DATABASE_CONNECTIONS.has(databaseConnection)) {
    throw new Error('BROWSER_CHECK_DATABASE_CONNECTION must be sqlite or mysql');
  }
  const databaseIdentifier = process.env.BROWSER_CHECK_DATABASE_IDENTIFIER;
  if (typeof databaseIdentifier !== 'string' || databaseIdentifier.trim() === '') {
    throw new Error('BROWSER_CHECK_DATABASE_IDENTIFIER must be nonempty');
  }
  const expectedConnection = isDockerRuntime ? 'mysql' : 'sqlite';
  const expectedIdentifier = isDockerRuntime
    ? 'mysql:mysql-browser-check/browser_check'
    : `sqlite:${workspaceRelativeRunDir}/runtime/browser-check.sqlite`;
  if (databaseConnection !== expectedConnection) {
    throw new Error(
      `BROWSER_CHECK_DATABASE_CONNECTION must be ${expectedConnection} for this runtime`,
    );
  }
  if (databaseIdentifier !== expectedIdentifier) {
    throw new Error('BROWSER_CHECK_DATABASE_IDENTIFIER must identify this dedicated runtime');
  }
  return {
    databaseConnection,
    databaseIdentifierHash: `sha256:${createHash('sha256')
      .update(databaseIdentifier)
      .digest('hex')}`,
  };
}

function playwrightExecutionBudget(checkCount, isDockerRuntime) {
  if (
    !Number.isSafeInteger(checkCount) ||
    checkCount < 1 ||
    checkCount > MAX_TEMPORARY_CHECKS_PER_RUN
  ) {
    throw new Error(
      `a browser-check run must contain between 1 and ${MAX_TEMPORARY_CHECKS_PER_RUN} temporary checks`,
    );
  }
  const contractTestOverride = process.env.BROWSER_CHECK_CONTRACT_TEST_TIMEOUT;
  if (contractTestOverride !== undefined) {
    if (contractTestOverride !== 'true' || process.env.NODE_ENV !== 'test') {
      throw new Error(
        'BROWSER_CHECK_CONTRACT_TEST_TIMEOUT is available only as true with NODE_ENV=test',
      );
    }
    return {
      timeoutMs: CONTRACT_TEST_PLAYWRIGHT_TIMEOUT_MS,
      terminationGraceMs: CONTRACT_TEST_TERMINATION_GRACE_MS,
    };
  }
  const startupBudgetMs = isDockerRuntime ? 0 : PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS;
  const timeoutMs =
    startupBudgetMs + PLAYWRIGHT_PER_CHECK_BUDGET_MS * checkCount + PLAYWRIGHT_WRAPPER_OVERHEAD_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs > 900_000) {
    throw new Error(
      'the derived Playwright execution timeout exceeds the bounded 900000 ms wrapper budget',
    );
  }
  return { timeoutMs, terminationGraceMs: PLAYWRIGHT_TERMINATION_GRACE_MS };
}

const passthroughArguments = process.argv.slice(2);
if (passthroughArguments.some((argument) => argument !== '--headed')) {
  console.error('The isolated browser-check wrapper accepts only the optional --headed flag');
  process.exit(2);
}
if (passthroughArguments.filter((argument) => argument === '--headed').length > 1) {
  console.error('--headed may be provided at most once');
  process.exit(2);
}

const runDirInput = process.env.BROWSER_CHECK_RUN_DIR?.trim();
if (!runDirInput) {
  console.error('BROWSER_CHECK_RUN_DIR is required');
  process.exit(2);
}

const workspaceRoot = realpathSync(process.cwd());
try {
  lstatSync(resolve(workspaceRoot, 'public/storage'));
  console.error(
    'public/storage must be absent so isolated browser checks cannot serve shared user files',
  );
  process.exit(2);
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error(`public/storage cannot be inspected safely: ${error.message}`);
    process.exit(2);
  }
}
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const runDir = resolve(workspaceRoot, runDirInput);
const runDirRelativePath = relative(verificationRoot, runDir);
const runDirSegments = runDirRelativePath.split(sep);

if (
  runDirRelativePath === '' ||
  runDirRelativePath === '..' ||
  runDirRelativePath.startsWith(`..${sep}`) ||
  isAbsolute(runDirRelativePath) ||
  runDirSegments.length !== 2 ||
  runDirSegments.some((segment) => segment === '') ||
  !/^\d{14}$/.test(runDirSegments[1])
) {
  console.error(
    'BROWSER_CHECK_RUN_DIR must identify test-results/change-verification/{change-id}/{yyyyMMddHHmmss}',
  );
  process.exit(2);
}

let realRunDir;
try {
  const realVerificationRoot = realpathSync(verificationRoot);
  realRunDir = realpathSync(runDir);
  if (realVerificationRoot !== verificationRoot) {
    throw new Error('test-results/change-verification must not be a symlink');
  }
  if (relative(realVerificationRoot, realRunDir) !== runDirRelativePath) {
    throw new Error('the run path contains a symlink or resolves to another location');
  }
} catch (error) {
  console.error(`BROWSER_CHECK_RUN_DIR must exist without symlink indirection: ${error.message}`);
  process.exit(2);
}
const workspaceRelativeRunDir = relative(workspaceRoot, realRunDir).split(sep).join('/');

function assertNoSymlinkDescendants(path) {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink()) {
    throw new Error(`run directories and files must not be symlinks: ${path}`);
  }
  if (pathStat.isFile() && pathStat.nlink !== 1) {
    throw new Error(`run files must not be hard-linked: ${path}`);
  }
  if (pathStat.isDirectory()) {
    readdirSync(path).forEach((entry) => assertNoSymlinkDescendants(resolve(path, entry)));
  }
}

try {
  assertNoSymlinkDescendants(realRunDir);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const generatedDir = resolve(realRunDir, 'generated');
if (!existsSync(generatedDir) || !statSync(generatedDir).isDirectory()) {
  console.error('BROWSER_CHECK_RUN_DIR/generated must exist and be a directory');
  process.exit(2);
}
const screenshotEvidenceRoot = resolve(realRunDir, 'evidence/screenshots');
if (!existsSync(screenshotEvidenceRoot) || !statSync(screenshotEvidenceRoot).isDirectory()) {
  console.error('BROWSER_CHECK_RUN_DIR/evidence/screenshots must exist and be a directory');
  process.exit(2);
}
const consoleEvidenceRoot = resolve(realRunDir, 'evidence/console');
const networkEvidenceRoot = resolve(realRunDir, 'evidence/network');

const artifactManifestPath = resolve(realRunDir, '.browser-check-artifacts.json');
const executionErrorPath = resolve(realRunDir, '.browser-check-execution-error.json');
const playwrightResultsPath = resolve(realRunDir, 'playwright-results.json');

const outputMarkers = [
  resolve(realRunDir, 'artifacts'),
  playwrightResultsPath,
  resolve(realRunDir, 'playwright-report'),
  consoleEvidenceRoot,
  networkEvidenceRoot,
  screenshotEvidenceRoot,
  resolve(realRunDir, 'traces'),
  resolve(realRunDir, 'videos'),
  artifactManifestPath,
  executionErrorPath,
];
const existingOutputs = outputMarkers.filter((path) => {
  if (!existsSync(path)) {
    return false;
  }
  const pathStat = statSync(path);
  return pathStat.isFile() || (pathStat.isDirectory() && readdirSync(path).length > 0);
});
if (existingOutputs.length > 0) {
  console.error(
    `BROWSER_CHECK_RUN_DIR already contains execution output; create a new run: ${existingOutputs.join(', ')}`,
  );
  process.exit(2);
}

const claimPath = resolve(realRunDir, '.browser-check-run.json');
if (existsSync(claimPath)) {
  console.error('BROWSER_CHECK_RUN_DIR was already claimed; create a new run');
  process.exit(2);
}

function collectGeneratedChecks(path, checks = []) {
  for (const entry of readdirSync(path)) {
    const entryPath = resolve(path, entry);
    const entryStat = lstatSync(entryPath);
    if (entryStat.isSymbolicLink()) {
      throw new Error(`generated entries must not be symlinks: ${entryPath}`);
    }
    if (entryStat.isDirectory()) {
      collectGeneratedChecks(entryPath, checks);
    } else if (!entryStat.isFile()) {
      throw new Error(`generated entries must be regular files or directories: ${entryPath}`);
    } else if (entryStat.nlink !== 1) {
      throw new Error(`generated source files must not be hard-linked: ${entryPath}`);
    } else if (!entry.endsWith('.check.spec.ts')) {
      throw new Error(
        `generated may contain only *.check.spec.ts source files; helpers are not executable: ${entryPath}`,
      );
    } else {
      checks.push(entryPath);
    }
  }
  return checks;
}

let generatedChecks;
try {
  generatedChecks = collectGeneratedChecks(generatedDir);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (generatedChecks.length === 0) {
  console.error('BROWSER_CHECK_RUN_DIR/generated must contain at least one *.check.spec.ts file');
  process.exit(2);
}

const fixturePath = resolve(workspaceRoot, 'playwright.browser-check.fixture.ts');

function canonicalFixtureSpecifier(generatedCheck) {
  const relativeFixturePath = relative(dirname(generatedCheck), fixturePath)
    .split(sep)
    .join('/')
    .replace(/\.ts$/, '');
  return relativeFixturePath.startsWith('.') ? relativeFixturePath : `./${relativeFixturePath}`;
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (ts.isElementAccessExpression(node)) {
    const argument = node.argumentExpression;
    if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
      return argument.text;
    }
    if (!ts.isNumericLiteral(argument)) {
      return '<computed>';
    }
  }
  return undefined;
}

function declaredPropertyName(node) {
  if (!node) {
    return undefined;
  }
  if (ts.isComputedPropertyName(node)) {
    return '<computed>';
  }
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  return undefined;
}

function staticStringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

const approvedScreenshotPathProperties = new WeakSet();
const approvedDirectScreenshotMembers = new WeakSet();
const validatedScreenshotPaths = new WeakMap();

function validateScreenshotCall(member, generatedCheck) {
  const validatedScreenshotPath = validatedScreenshotPaths.get(member);
  if (validatedScreenshotPath !== undefined) {
    return validatedScreenshotPath;
  }
  if (
    !ts.isPropertyAccessExpression(member) ||
    member.questionDotToken ||
    !ts.isCallExpression(member.parent) ||
    member.parent.expression !== member ||
    member.parent.arguments.length !== 1
  ) {
    throw new Error(`${generatedCheck} screenshot must be a direct call with inline options`);
  }
  const options = member.parent.arguments[0];
  if (!options || !ts.isObjectLiteralExpression(options)) {
    throw new Error(`${generatedCheck} screenshot options must be an inline object literal`);
  }
  const pathProperties = options.properties.filter(
    (property) =>
      ts.isPropertyAssignment(property) && declaredPropertyName(property.name) === 'path',
  );
  if (pathProperties.length !== 1) {
    throw new Error(`${generatedCheck} screenshot requires exactly one static path`);
  }
  const pathProperty = pathProperties[0];
  const screenshotPath = pathProperty ? staticStringValue(pathProperty.initializer) : undefined;
  if (!pathProperty || screenshotPath === undefined || isAbsolute(screenshotPath)) {
    throw new Error(`${generatedCheck} screenshot path must be a relative static string`);
  }
  const absoluteScreenshotPath = resolve(workspaceRoot, screenshotPath);
  const canonicalScreenshotPath = relative(workspaceRoot, absoluteScreenshotPath)
    .split(sep)
    .join('/');
  if (
    screenshotPath !== canonicalScreenshotPath ||
    !pathStaysInside(screenshotEvidenceRoot, absoluteScreenshotPath) ||
    !absoluteScreenshotPath.endsWith('.png')
  ) {
    throw new Error(
      `${generatedCheck} screenshot path must be beneath this run's evidence/screenshots directory`,
    );
  }
  if (existsSync(absoluteScreenshotPath) || plannedScreenshotTargets.has(absoluteScreenshotPath)) {
    throw new Error(`${generatedCheck} screenshot path must be new and unique within this run`);
  }
  plannedScreenshotTargets.add(absoluteScreenshotPath);
  approvedScreenshotPathProperties.add(pathProperty);
  validatedScreenshotPaths.set(member, screenshotPath);
  return screenshotPath;
}

function validateGotoCall(member, generatedCheck) {
  if (
    !ts.isPropertyAccessExpression(member) ||
    member.questionDotToken ||
    !ts.isIdentifier(member.expression) ||
    member.expression.text !== 'page' ||
    !ts.isCallExpression(member.parent) ||
    member.parent.expression !== member ||
    member.parent.arguments.length < 1 ||
    member.parent.arguments.length > 2
  ) {
    throw new Error(`${generatedCheck} goto must be a direct page.goto(...) call`);
  }
  const navigationTarget = staticStringValue(member.parent.arguments[0]);
  if (navigationTarget === undefined) {
    throw new Error(`${generatedCheck} goto requires a static URL`);
  }
  if (/^(?:about|data|file):/i.test(navigationTarget.trim())) {
    throw new Error(`${generatedCheck} goto must target the planned HTTP(S) origin`);
  }
  return navigationTarget;
}

function directGotoMemberFromStatement(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return undefined;
  }
  const expression = statement.expression.expression;
  if (
    !ts.isCallExpression(expression) ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    !ts.isIdentifier(expression.expression.expression) ||
    expression.expression.expression.text !== 'page' ||
    expression.expression.name.text !== 'goto'
  ) {
    return undefined;
  }
  return expression.expression;
}

function directScreenshotMemberFromStatement(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return undefined;
  }
  const expression = statement.expression.expression;
  if (
    !ts.isCallExpression(expression) ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== 'screenshot'
  ) {
    return undefined;
  }
  return expression.expression;
}

function validateBindingName(bindingName, generatedCheck) {
  if (ts.isIdentifier(bindingName)) {
    if (bindingName.text.startsWith('_')) {
      throw new Error(`${generatedCheck} must not bind private runtime member ${bindingName.text}`);
    }
    if (
      (bindingName.text === 'page' && !approvedPageFixtureBindings.has(bindingName)) ||
      bindingName.text === 'test' ||
      bindingName.text === 'expect' ||
      FORBIDDEN_IDENTIFIERS.has(bindingName.text) ||
      FORBIDDEN_PROPERTIES.has(bindingName.text)
    ) {
      throw new Error(`${generatedCheck} must not bind runtime capability ${bindingName.text}`);
    }
    return;
  }
  for (const element of bindingName.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }
    if (element.dotDotDotToken) {
      throw new Error(`${generatedCheck} must not use rest destructuring`);
    }
    const name = declaredPropertyName(element.propertyName);
    if (name === '<computed>') {
      throw new Error(`${generatedCheck} must not use computed destructuring properties`);
    }
    if (name?.startsWith('_')) {
      throw new Error(`${generatedCheck} must not bind private runtime member ${name}`);
    }
    if (name && FORBIDDEN_PROPERTIES.has(name)) {
      throw new Error(`${generatedCheck} uses forbidden binding property ${name}`);
    }
    validateBindingName(element.name, generatedCheck);
  }
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

function isStaticAssertionOperand(node) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return false;
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isRegularExpressionLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    return isStaticAssertionOperand(expression.operand);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.every(isStaticAssertionOperand);
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) && isStaticAssertionOperand(property.initializer),
    );
  }
  return false;
}

function staticNumberValue(node) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return undefined;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (
    ts.isPrefixUnaryExpression(expression) &&
    [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken].includes(expression.operator) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    const value = Number(expression.operand.text);
    return expression.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  return undefined;
}

function isNonemptyStaticString(node) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return false;
  }
  const value = staticStringValue(expression);
  return value !== undefined && value.length > 0;
}

function isMeaningfulStaticExpectation(node, { allowEmptyString = true } = {}) {
  const expression = unwrapExpression(node);
  if (!expression || ts.isRegularExpressionLiteral(expression)) {
    return false;
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return allowEmptyString || expression.text.length > 0;
  }
  if (
    ts.isNumericLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    return staticNumberValue(expression) !== undefined;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return (
      expression.elements.length > 0 &&
      expression.elements.every((element) => isMeaningfulStaticExpectation(element))
    );
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return (
      expression.properties.length > 0 &&
      expression.properties.every(
        (property) =>
          ts.isPropertyAssignment(property) && isMeaningfulStaticExpectation(property.initializer),
      )
    );
  }
  return false;
}

function isStaticOptionsObject(node) {
  const expression = unwrapExpression(node);
  return Boolean(
    expression && ts.isObjectLiteralExpression(expression) && isStaticAssertionOperand(expression),
  );
}

function optionalStaticOptions(arguments_, expectedArgumentCount) {
  return (
    arguments_.length >= expectedArgumentCount &&
    arguments_.length <= expectedArgumentCount + 1 &&
    (arguments_.length === expectedArgumentCount ||
      isStaticOptionsObject(arguments_[expectedArgumentCount]))
  );
}

const LOCATOR_STATE_ASSERTION_MATCHERS = new Set([
  'toBeAttached',
  'toBeChecked',
  'toBeDisabled',
  'toBeEditable',
  'toBeEmpty',
  'toBeEnabled',
  'toBeFocused',
  'toBeHidden',
  'toBeInViewport',
  'toBeVisible',
]);
const LOCATOR_CONTAINMENT_ASSERTION_MATCHERS = new Set(['toContainClass', 'toContainText']);
const LOCATOR_SINGLE_EXPECTED_ASSERTION_MATCHERS = new Set([
  'toHaveAccessibleDescription',
  'toHaveAccessibleErrorMessage',
  'toHaveAccessibleName',
  'toHaveClass',
  'toHaveId',
  'toHaveRole',
  'toHaveText',
  'toHaveValue',
  'toHaveValues',
]);
const LOCATOR_NAMED_EXPECTED_ASSERTION_MATCHERS = new Set([
  'toHaveAttribute',
  'toHaveCSS',
  'toHaveJSProperty',
]);
const OBSERVED_EQUALITY_ASSERTION_MATCHERS = new Set([
  'toBe',
  'toContainEqual',
  'toEqual',
  'toStrictEqual',
]);

function isSpecificObservedEqualityExpectation(node) {
  const expression = unwrapExpression(node);
  return Boolean(
    expression &&
    expression.kind !== ts.SyntaxKind.NullKeyword &&
    !(
      (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) &&
      expression.text.length === 0
    ) &&
    isMeaningfulStaticExpectation(expression),
  );
}

function matcherArgumentsAreMeaningful(kind, matcher, arguments_) {
  if (kind === 'page') {
    return (
      PAGE_ASSERTION_MATCHERS.has(matcher) &&
      optionalStaticOptions(arguments_, 1) &&
      isNonemptyStaticString(arguments_[0])
    );
  }
  if (kind === 'locator') {
    if (LOCATOR_STATE_ASSERTION_MATCHERS.has(matcher)) {
      return optionalStaticOptions(arguments_, 0);
    }
    if (matcher === 'toHaveCount') {
      const count = staticNumberValue(arguments_[0]);
      return optionalStaticOptions(arguments_, 1) && Number.isSafeInteger(count) && count >= 0;
    }
    if (LOCATOR_CONTAINMENT_ASSERTION_MATCHERS.has(matcher)) {
      return (
        optionalStaticOptions(arguments_, 1) &&
        isMeaningfulStaticExpectation(arguments_[0], { allowEmptyString: false })
      );
    }
    if (LOCATOR_SINGLE_EXPECTED_ASSERTION_MATCHERS.has(matcher)) {
      const expected = unwrapExpression(arguments_[0]);
      return (
        optionalStaticOptions(arguments_, 1) &&
        isMeaningfulStaticExpectation(arguments_[0]) &&
        Boolean(expected) &&
        (!ts.isArrayLiteralExpression(expected) || expected.elements.length > 0)
      );
    }
    if (LOCATOR_NAMED_EXPECTED_ASSERTION_MATCHERS.has(matcher)) {
      return (
        optionalStaticOptions(arguments_, 2) &&
        isNonemptyStaticString(arguments_[0]) &&
        isMeaningfulStaticExpectation(arguments_[1])
      );
    }
    return false;
  }
  if (kind !== 'observed') {
    return false;
  }
  if (OBSERVED_EQUALITY_ASSERTION_MATCHERS.has(matcher)) {
    return arguments_.length === 1 && isSpecificObservedEqualityExpectation(arguments_[0]);
  }
  if (matcher === 'toContain') {
    return (
      arguments_.length === 1 &&
      isMeaningfulStaticExpectation(arguments_[0], { allowEmptyString: false })
    );
  }
  if (matcher === 'toHaveLength') {
    const length = staticNumberValue(arguments_[0]);
    return arguments_.length === 1 && Number.isSafeInteger(length) && length >= 0;
  }
  if (matcher === 'toHaveProperty') {
    return (
      arguments_.length === 2 &&
      isNonemptyStaticString(arguments_[0]) &&
      isMeaningfulStaticExpectation(arguments_[1])
    );
  }
  if (matcher === 'toMatchObject') {
    const expected = unwrapExpression(arguments_[0]);
    return (
      arguments_.length === 1 &&
      ts.isObjectLiteralExpression(expected) &&
      expected.properties.length > 0 &&
      isMeaningfulStaticExpectation(expected)
    );
  }
  return false;
}

function recordConstInitializers(statement, initializers) {
  if (!ts.isVariableStatement(statement)) {
    return;
  }
  const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) {
      continue;
    }
    initializers.delete(declaration.name.text);
    if (isConst && declaration.initializer) {
      initializers.set(declaration.name.text, declaration.initializer);
    }
  }
}

function observationOriginMethod(node, initializers, visited = new Set()) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return undefined;
  }
  if (ts.isAwaitExpression(expression)) {
    return observationOriginMethod(expression.expression, initializers, visited);
  }
  if (ts.isIdentifier(expression)) {
    if (visited.has(expression.text)) {
      return undefined;
    }
    const initializer = initializers.get(expression.text);
    if (!initializer) {
      return undefined;
    }
    visited.add(expression.text);
    return observationOriginMethod(initializer, initializers, visited);
  }
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
    const method = expression.expression.name.text;
    if (PAGE_OBSERVATION_METHODS.has(method)) {
      return method;
    }
    return observationOriginMethod(expression.expression.expression, initializers, visited);
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return observationOriginMethod(expression.expression, initializers, visited);
  }
  return undefined;
}

function staticBooleanValue(node) {
  const expression = unwrapExpression(node);
  if (expression?.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression?.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return undefined;
}

function observedAssertionIsAbsenceOnly(subject, matcher, arguments_, initializers) {
  const originMethod = observationOriginMethod(subject, initializers);
  if (matcher === 'toHaveLength' && staticNumberValue(arguments_[0]) === 0) {
    return true;
  }
  if (!OBSERVED_EQUALITY_ASSERTION_MATCHERS.has(matcher)) {
    return false;
  }
  if (originMethod === 'count' && staticNumberValue(arguments_[0]) === 0) {
    return true;
  }
  const expectedBoolean = staticBooleanValue(arguments_[0]);
  return (
    (originMethod === 'isHidden' && expectedBoolean === true) ||
    (originMethod === 'isVisible' && expectedBoolean === false)
  );
}

function directAssertionQualifiesAsPositive(
  subjectKind,
  subject,
  matcher,
  arguments_,
  initializers,
) {
  if (subjectKind === 'page') {
    return matcher !== 'toHaveURL';
  }
  if (subjectKind === 'locator') {
    return (
      matcher !== 'toBeHidden' &&
      !(matcher === 'toHaveCount' && staticNumberValue(arguments_[0]) === 0)
    );
  }
  return !observedAssertionIsAbsenceOnly(subject, matcher, arguments_, initializers);
}

function pollReturnedExpression(callback, outerInitializers) {
  if (!ts.isArrowFunction(callback)) {
    return {};
  }
  const initializers = new Map(outerInitializers);
  if (!ts.isBlock(callback.body)) {
    return { expression: callback.body, initializers };
  }
  for (const statement of callback.body.statements) {
    if (ts.isReturnStatement(statement)) {
      return { expression: statement.expression, initializers };
    }
    recordConstInitializers(statement, initializers);
  }
  return { initializers };
}

function pageValueKind(node, bindings) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return undefined;
  }
  if (ts.isAwaitExpression(expression)) {
    return pageValueKind(expression.expression, bindings);
  }
  if (ts.isIdentifier(expression)) {
    if (expression.text === 'page') {
      return 'page';
    }
    return bindings.get(expression.text);
  }
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
    const receiverKind = pageValueKind(expression.expression.expression, bindings);
    const method = expression.expression.name.text;
    if ((receiverKind === 'page' || receiverKind === 'locator') && LOCATOR_METHODS.has(method)) {
      return 'locator';
    }
    if (
      (receiverKind === 'page' || receiverKind === 'locator') &&
      PAGE_OBSERVATION_METHODS.has(method)
    ) {
      return 'observed';
    }
    if (
      receiverKind === 'observed' &&
      ['toLowerCase', 'toUpperCase', 'trim'].includes(method) &&
      expression.arguments.length === 0
    ) {
      return 'observed';
    }
    if (
      receiverKind === 'observed' &&
      ['endsWith', 'includes', 'startsWith'].includes(method) &&
      expression.arguments.length === 1 &&
      isNonemptyStaticString(expression.arguments[0])
    ) {
      return 'observed';
    }
    return undefined;
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === 'length' &&
    pageValueKind(expression.expression, bindings) === 'observed'
  ) {
    return 'observed';
  }
  return undefined;
}

function approvePageValueExpression(node, bindings) {
  const expression = unwrapExpression(node);
  if (!expression) {
    return false;
  }
  if (ts.isAwaitExpression(expression)) {
    return approvePageValueExpression(expression.expression, bindings);
  }
  if (ts.isIdentifier(expression)) {
    return (
      expression.text === 'page' ||
      bindings.get(expression.text) === 'locator' ||
      bindings.get(expression.text) === 'observed'
    );
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === 'length' &&
    pageValueKind(expression.expression, bindings) === 'observed'
  ) {
    return approvePageValueExpression(expression.expression, bindings);
  }
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) {
    return false;
  }
  const receiver = expression.expression.expression;
  const receiverKind = pageValueKind(receiver, bindings);
  const method = expression.expression.name.text;
  const isApprovedMethod =
    ((receiverKind === 'page' || receiverKind === 'locator') &&
      (LOCATOR_METHODS.has(method) || PAGE_OBSERVATION_METHODS.has(method))) ||
    (receiverKind === 'observed' &&
      ['toLowerCase', 'toUpperCase', 'trim'].includes(method) &&
      expression.arguments.length === 0) ||
    (receiverKind === 'observed' &&
      ['endsWith', 'includes', 'startsWith'].includes(method) &&
      expression.arguments.length === 1 &&
      isNonemptyStaticString(expression.arguments[0]));
  if (
    !isApprovedMethod ||
    !expression.arguments.every(isStaticAssertionOperand) ||
    !approvePageValueExpression(receiver, bindings)
  ) {
    return false;
  }
  approvedRuntimeCalls.add(expression);
  return true;
}

function approvePollCallback(callback, outerBindings) {
  if (!pollCallbackReturnsPageObservation(callback, outerBindings)) {
    return false;
  }
  const bindings = new Map(outerBindings);
  if (!ts.isBlock(callback.body)) {
    return approvePageValueExpression(callback.body, bindings);
  }
  for (const statement of callback.body.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          !declaration.initializer ||
          !approvePageValueExpression(declaration.initializer, bindings)
        ) {
          return false;
        }
      }
      recordPageDerivedConst(statement, bindings);
      continue;
    }
    if (
      !ts.isReturnStatement(statement) ||
      !statement.expression ||
      !approvePageValueExpression(statement.expression, bindings)
    ) {
      return false;
    }
  }
  return true;
}

function approveDirectAction(statement, bindings) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return false;
  }
  const call = unwrapExpression(statement.expression.expression);
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) {
    return false;
  }
  const receiver = call.expression.expression;
  const receiverKind = pageValueKind(receiver, bindings);
  const method = call.expression.name.text;
  const methodIsAllowed =
    (receiverKind === 'locator' && LOCATOR_ACTION_METHODS.has(method)) ||
    (receiverKind === 'page' && PAGE_ACTION_METHODS.has(method));
  if (
    !methodIsAllowed ||
    !call.arguments.every(isStaticAssertionOperand) ||
    !approvePageValueExpression(receiver, bindings)
  ) {
    return false;
  }
  approvedRuntimeCalls.add(call);
  return true;
}

function recordPageDerivedConst(statement, bindings) {
  if (
    ts.isExpressionStatement(statement) &&
    ts.isBinaryExpression(statement.expression) &&
    statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(statement.expression.left)
  ) {
    bindings.delete(statement.expression.left.text);
    return;
  }
  if (!ts.isVariableStatement(statement)) {
    return;
  }
  const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) {
      continue;
    }
    bindings.delete(declaration.name.text);
    if (!isConst || !declaration.initializer) {
      continue;
    }
    const initializer = unwrapExpression(declaration.initializer);
    if (ts.isIdentifier(initializer)) {
      const aliasedKind = bindings.get(initializer.text);
      if (aliasedKind === 'locator' || aliasedKind === 'observed') {
        bindings.set(declaration.name.text, aliasedKind);
      }
      continue;
    }
    const kind = pageValueKind(initializer, bindings);
    if (kind === 'locator' || kind === 'observed') {
      bindings.set(declaration.name.text, kind);
    }
  }
}

function statementMutatesObservedValue(statement, bindings) {
  let mutationFound = false;
  const inspect = (node) => {
    if (mutationFound) {
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      OBSERVED_MUTATING_METHODS.has(node.expression.name.text)
    ) {
      const receiverKind = pageValueKind(node.expression.expression, bindings);
      if (node.expression.name.text !== 'fill' || receiverKind !== 'locator') {
        mutationFound = true;
        return;
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(statement);
  return mutationFound;
}

function pollCallbackReturnsPageObservation(callback, outerBindings) {
  if (!ts.isArrowFunction(callback) || callback.parameters.length !== 0) {
    return false;
  }
  const bindings = new Map(outerBindings);
  if (!ts.isBlock(callback.body)) {
    return pageValueKind(callback.body, bindings) === 'observed';
  }
  for (const [index, statement] of callback.body.statements.entries()) {
    recordPageDerivedConst(statement, bindings);
    if (ts.isReturnStatement(statement)) {
      return (
        index === callback.body.statements.length - 1 &&
        Boolean(statement.expression) &&
        pageValueKind(statement.expression, bindings) === 'observed'
      );
    } else if (!ts.isVariableStatement(statement)) {
      return false;
    }
  }
  return false;
}

function expectInvocationFromAwaitedStatement(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return undefined;
  }
  const matcherCall = unwrapExpression(statement.expression.expression);
  if (!matcherCall || !ts.isCallExpression(matcherCall)) {
    return undefined;
  }
  const matcherMember = matcherCall.expression;
  if (
    !ts.isPropertyAccessExpression(matcherMember) ||
    matcherMember.questionDotToken ||
    ![
      ...PAGE_ASSERTION_MATCHERS,
      ...LOCATOR_ASSERTION_MATCHERS,
      ...OBSERVED_ASSERTION_MATCHERS,
    ].includes(matcherMember.name.text)
  ) {
    return undefined;
  }
  const receiver = unwrapExpression(matcherMember.expression);
  if (
    receiver &&
    ts.isPropertyAccessExpression(receiver) &&
    !receiver.questionDotToken &&
    receiver.name.text === 'not'
  ) {
    return undefined;
  }
  if (!receiver || !ts.isCallExpression(receiver)) {
    return undefined;
  }
  if (ts.isIdentifier(receiver.expression) && receiver.expression.text === 'expect') {
    return {
      kind: 'expect',
      invocation: receiver,
      matcher: matcherMember.name.text,
      matcherInvocation: matcherCall,
    };
  }
  if (
    ts.isPropertyAccessExpression(receiver.expression) &&
    !receiver.expression.questionDotToken &&
    ts.isIdentifier(receiver.expression.expression) &&
    receiver.expression.expression.text === 'expect' &&
    receiver.expression.name.text === 'poll'
  ) {
    return {
      kind: 'poll',
      invocation: receiver,
      matcher: matcherMember.name.text,
      matcherInvocation: matcherCall,
    };
  }
  return undefined;
}

function callbackHasPageAssertion(callback) {
  const bindings = new Map();
  const initializers = new Map();
  let hasPageAssertion = false;
  for (const statement of callback.body.statements) {
    if (!ts.isExpressionStatement(statement) && !ts.isVariableStatement(statement)) {
      return false;
    }
    if (statementMutatesObservedValue(statement, bindings)) {
      return false;
    }
    const expectInvocation = expectInvocationFromAwaitedStatement(statement);
    if (expectInvocation?.kind === 'expect') {
      const subject = expectInvocation.invocation.arguments[0];
      const subjectKind = pageValueKind(subject, bindings);
      const customMessage = expectInvocation.invocation.arguments[1];
      if (
        expectInvocation.invocation.arguments.length >= 1 &&
        expectInvocation.invocation.arguments.length <= 2 &&
        (!customMessage || staticStringValue(customMessage) !== undefined) &&
        ((subjectKind === 'page' && PAGE_ASSERTION_MATCHERS.has(expectInvocation.matcher)) ||
          (subjectKind === 'locator' && LOCATOR_ASSERTION_MATCHERS.has(expectInvocation.matcher)) ||
          (subjectKind === 'observed' &&
            OBSERVED_ASSERTION_MATCHERS.has(expectInvocation.matcher))) &&
        matcherArgumentsAreMeaningful(
          subjectKind,
          expectInvocation.matcher,
          expectInvocation.matcherInvocation.arguments,
        )
      ) {
        if (!approvePageValueExpression(subject, bindings)) {
          return false;
        }
        approvedRuntimeCalls.add(expectInvocation.invocation);
        approvedRuntimeCalls.add(expectInvocation.matcherInvocation);
        if (
          directAssertionQualifiesAsPositive(
            subjectKind,
            subject,
            expectInvocation.matcher,
            expectInvocation.matcherInvocation.arguments,
            initializers,
          )
        ) {
          hasPageAssertion = true;
        }
        continue;
      }
    }
    if (expectInvocation?.kind === 'poll') {
      const pollCallback = expectInvocation.invocation.arguments[0];
      const pollOptions = expectInvocation.invocation.arguments[1];
      if (
        expectInvocation.invocation.arguments.length >= 1 &&
        expectInvocation.invocation.arguments.length <= 2 &&
        OBSERVED_ASSERTION_MATCHERS.has(expectInvocation.matcher) &&
        (!pollOptions || isStaticAssertionOperand(pollOptions)) &&
        pollCallbackReturnsPageObservation(pollCallback, bindings) &&
        matcherArgumentsAreMeaningful(
          'observed',
          expectInvocation.matcher,
          expectInvocation.matcherInvocation.arguments,
        )
      ) {
        if (!approvePollCallback(pollCallback, bindings)) {
          return false;
        }
        approvedRuntimeCalls.add(expectInvocation.invocation);
        approvedRuntimeCalls.add(expectInvocation.matcherInvocation);
        const returned = pollReturnedExpression(pollCallback, initializers);
        if (
          !observedAssertionIsAbsenceOnly(
            returned.expression,
            expectInvocation.matcher,
            expectInvocation.matcherInvocation.arguments,
            returned.initializers,
          )
        ) {
          hasPageAssertion = true;
        }
        continue;
      }
    }
    const directGotoMember = directGotoMemberFromStatement(statement);
    if (directGotoMember) {
      approvedRuntimeCalls.add(directGotoMember.parent);
      continue;
    }
    const directScreenshotMember = directScreenshotMemberFromStatement(statement);
    if (directScreenshotMember) {
      approvedRuntimeCalls.add(directScreenshotMember.parent);
      continue;
    }
    if (approveDirectAction(statement, bindings)) {
      continue;
    }
    if (ts.isExpressionStatement(statement)) {
      return false;
    }
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (
      !isConst ||
      statement.declarationList.declarations.length === 0 ||
      statement.declarationList.declarations.some(
        (declaration) =>
          !ts.isIdentifier(declaration.name) ||
          !declaration.initializer ||
          !approvePageValueExpression(declaration.initializer, bindings),
      )
    ) {
      return false;
    }
    recordPageDerivedConst(statement, bindings);
    recordConstInitializers(statement, initializers);
  }
  return hasPageAssertion;
}

function validateGeneratedCheck(generatedCheck) {
  const source = readBoundedRegularFileSync(
    generatedCheck,
    lstatSync(generatedCheck),
    generatedCheck,
  ).toString('utf8');
  const sourceFile = ts.createSourceFile(
    generatedCheck,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = sourceFile.parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    const detail = diagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
      .join('; ');
    throw new Error(`${generatedCheck} is not valid TypeScript: ${detail}`);
  }

  const expectedFixtureSpecifier = canonicalFixtureSpecifier(generatedCheck);
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  if (imports.length !== 1) {
    throw new Error(`${generatedCheck} must have exactly one static import`);
  }
  const fixtureImport = imports[0];
  if (
    !fixtureImport ||
    !ts.isStringLiteral(fixtureImport.moduleSpecifier) ||
    fixtureImport.moduleSpecifier.text !== expectedFixtureSpecifier
  ) {
    throw new Error(
      `${generatedCheck} must import the canonical fixture from ${expectedFixtureSpecifier}`,
    );
  }
  const namedBindings = fixtureImport.importClause?.namedBindings;
  if (
    fixtureImport.importClause?.isTypeOnly ||
    fixtureImport.importClause?.name ||
    !namedBindings ||
    !ts.isNamedImports(namedBindings)
  ) {
    throw new Error(`${generatedCheck} must use a named value import for expect and test`);
  }
  const importedNames = namedBindings.elements.map((element) => ({
    imported: element.propertyName?.text ?? element.name.text,
    local: element.name.text,
    typeOnly: element.isTypeOnly,
  }));
  if (
    importedNames.length !== 2 ||
    importedNames.some(({ imported, local, typeOnly }) => imported !== local || typeOnly) ||
    importedNames
      .map(({ imported }) => imported)
      .sort()
      .join(',') !== 'expect,test'
  ) {
    throw new Error(
      `${generatedCheck} must import exactly { expect, test } without aliases from the canonical fixture`,
    );
  }

  const topLevelTestCalls = new Set();
  for (const statement of sourceFile.statements) {
    if (statement === fixtureImport) {
      continue;
    }
    const expression = ts.isExpressionStatement(statement) ? statement.expression : undefined;
    if (
      !expression ||
      !ts.isCallExpression(expression) ||
      !ts.isIdentifier(expression.expression) ||
      expression.expression.text !== 'test'
    ) {
      throw new Error(
        `${generatedCheck} top-level statements may contain only the canonical import and direct test(...) declarations`,
      );
    }
    topLevelTestCalls.add(expression);
  }

  let directTestCalls = 0;
  const isFixtureImportIdentifier = (node) => {
    return ts.isImportSpecifier(node.parent) && namedBindings.elements.includes(node.parent);
  };
  const isAllowedTestIdentifier = (node) => {
    return (
      isFixtureImportIdentifier(node) ||
      (ts.isCallExpression(node.parent) &&
        node.parent.expression === node &&
        topLevelTestCalls.has(node.parent))
    );
  };
  const isAllowedExpectIdentifier = (node) => {
    if (isFixtureImportIdentifier(node)) {
      return true;
    }
    if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
      return true;
    }
    if (
      ts.isPropertyAccessExpression(node.parent) &&
      node.parent.expression === node &&
      node.parent.name.text === 'poll' &&
      ts.isCallExpression(node.parent.parent) &&
      node.parent.parent.expression === node.parent
    ) {
      return true;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node !== fixtureImport) {
      throw new Error(`${generatedCheck} must not import helper or unrestricted modules`);
    }
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      throw new Error(`${generatedCheck} must not export or re-export runtime modules`);
    }
    if (ts.isThrowStatement(node) || ts.isDebuggerStatement(node) || ts.isNewExpression(node)) {
      throw new Error(
        `${generatedCheck} must not throw, debug, or construct arbitrary runtime values`,
      );
    }
    if (ts.isSpreadAssignment(node) || ts.isSpreadElement(node)) {
      throw new Error(`${generatedCheck} must not use runtime rest or spread values`);
    }
    if (
      (ts.isBinaryExpression(node) && ts.isAssignmentExpression(node)) ||
      ts.isPostfixUnaryExpression(node) ||
      (ts.isPrefixUnaryExpression(node) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) ||
      ts.isDeleteExpression(node)
    ) {
      throw new Error(
        `${generatedCheck} must not use assignment, update, or delete expressions on guarded runtime values`,
      );
    }
    if (ts.isImportEqualsDeclaration(node) || node.kind === ts.SyntaxKind.ImportKeyword) {
      throw new Error(`${generatedCheck} must not use dynamic or import-equals loading`);
    }
    if (ts.isMetaProperty(node)) {
      throw new Error(`${generatedCheck} must not use import.meta or other runtime module access`);
    }
    if (ts.isBindingElement(node)) {
      if (node.dotDotDotToken) {
        throw new Error(`${generatedCheck} must not use rest destructuring`);
      }
      const name = declaredPropertyName(node.propertyName);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not use computed destructuring properties`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not bind private runtime member ${name}`);
      }
      if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} uses forbidden binding property ${name}`);
      }
      validateBindingName(node.name, generatedCheck);
    }
    if (ts.isParameter(node) && node.dotDotDotToken) {
      throw new Error(`${generatedCheck} must not use rest parameters`);
    }
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      validateBindingName(node.name, generatedCheck);
    }
    if (
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      const name = declaredPropertyName(node.name);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not declare computed runtime properties`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not declare private runtime property ${name}`);
      }
      if (name === 'path') {
        if (!ts.isPropertyAssignment(node) || !approvedScreenshotPathProperties.has(node)) {
          throw new Error(`${generatedCheck} path is allowed only in direct screenshot options`);
        }
      } else if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} declares forbidden runtime property ${name}`);
      }
    }
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      throw new Error(`${generatedCheck} uses forbidden runtime identifier ${node.text}`);
    }
    if (ts.isIdentifier(node) && node.text === 'test' && !isAllowedTestIdentifier(node)) {
      throw new Error(`${generatedCheck} may use test only as a direct test(...) callee`);
    }
    if (ts.isIdentifier(node) && node.text === 'expect' && !isAllowedExpectIdentifier(node)) {
      throw new Error(`${generatedCheck} may use expect only as expect(...) or expect.poll(...)`);
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const name = propertyName(node);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not use computed property access`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not access private runtime member ${name}`);
      }
      if (name === 'screenshot') {
        validateScreenshotCall(node, generatedCheck);
        if (!approvedDirectScreenshotMembers.has(node)) {
          throw new Error(
            `${generatedCheck} screenshot is allowed only as a direct awaited test statement`,
          );
        }
      }
      if (name === 'goto') {
        validateGotoCall(node, generatedCheck);
        if (!approvedDirectGotoMembers.has(node)) {
          throw new Error(
            `${generatedCheck} goto is allowed only as the first direct statement in a test callback`,
          );
        }
      }
      if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} uses forbidden runtime property ${name}`);
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'test') {
        if (!topLevelTestCalls.has(node)) {
          throw new Error(
            `${generatedCheck} must use direct top-level test(...) declarations only`,
          );
        }
        approvedRuntimeCalls.add(node);
        directTestCalls += 1;
        const testTitle = staticStringValue(node.arguments[0]);
        const callback = node.arguments[1];
        if (
          node.arguments.length !== 2 ||
          testTitle === undefined ||
          !callback ||
          !ts.isArrowFunction(callback) ||
          !callback.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)
        ) {
          throw new Error(
            `${generatedCheck} test calls require exactly a static title and an inline async arrow callback`,
          );
        }
        const fixtures = callback.parameters[0]?.name;
        if (!fixtures || !ts.isObjectBindingPattern(fixtures)) {
          throw new Error(
            `${generatedCheck} test callbacks must destructure only the page fixture`,
          );
        }
        const fixtureNames = fixtures.elements.map((element) => {
          if (element.dotDotDotToken || element.propertyName || !ts.isIdentifier(element.name)) {
            return '<unsupported>';
          }
          return element.name.text;
        });
        if (
          callback.parameters.length !== 1 ||
          fixtureNames.length !== 1 ||
          fixtureNames[0] !== 'page'
        ) {
          throw new Error(`${generatedCheck} test callbacks may request only the page fixture`);
        }
        approvedPageFixtureBindings.add(fixtures.elements[0].name);
        if (!ts.isBlock(callback.body)) {
          throw new Error(
            `${generatedCheck} each test callback must start with a direct static page.goto(...)`,
          );
        }
        if (!callbackHasPageAssertion(callback)) {
          throw new Error(
            `${generatedCheck} each test callback must use only safe linear page/locator operations and execute a reachable awaited direct assertion with a non-tautological static expectation derived from page state`,
          );
        }
        const directGotoMember = directGotoMemberFromStatement(callback.body.statements[0]);
        if (!directGotoMember) {
          throw new Error(
            `${generatedCheck} each test callback must start with a direct static page.goto(...)`,
          );
        }
        const navigationTarget = validateGotoCall(directGotoMember, generatedCheck);
        approvedDirectGotoMembers.add(directGotoMember);
        const screenshotPaths = [];
        for (const statement of callback.body.statements) {
          const directScreenshotMember = directScreenshotMemberFromStatement(statement);
          if (directScreenshotMember) {
            approvedDirectScreenshotMembers.add(directScreenshotMember);
            screenshotPaths.push(validateScreenshotCall(directScreenshotMember, generatedCheck));
          }
        }
        plannedNavigationTargets.push({
          generatedCheck,
          navigationTarget,
          screenshotPaths,
          testTitle,
        });
      } else if (
        (ts.isPropertyAccessExpression(node.expression) ||
          ts.isElementAccessExpression(node.expression)) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'test'
      ) {
        throw new Error(`${generatedCheck} must use direct test(...) declarations only`);
      }
      if (!approvedRuntimeCalls.has(node)) {
        throw new Error(
          `${generatedCheck} may call only approved page/locator actions, observations, assertions, navigation, and focused screenshots`,
        );
      }
    }
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      FORBIDDEN_IDENTIFIERS.has(node.expression.text)
    ) {
      throw new Error(`${generatedCheck} must not execute ${node.expression.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (directTestCalls === 0) {
    throw new Error(`${generatedCheck} must declare at least one direct test(...)`);
  }
}

function generatedSourceFingerprint(generatedChecks) {
  const fingerprint = createHash('sha256');
  for (const generatedCheck of [...generatedChecks].sort((left, right) => {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  })) {
    fingerprint.update(relative(generatedDir, generatedCheck).split(sep).join('/'));
    fingerprint.update('\0');
    const generatedCheckStat = lstatSync(generatedCheck);
    streamRegularFileSync(generatedCheck, generatedCheckStat, generatedCheck, (chunk) =>
      fingerprint.update(chunk),
    );
    fingerprint.update('\0');
  }
  return `sha256:${fingerprint.digest('hex')}`;
}

function revisionsEqual(left, right) {
  return (
    left?.baseSha === right?.baseSha &&
    left?.headSha === right?.headSha &&
    left?.worktreeFingerprint === right?.worktreeFingerprint
  );
}

function runtimesEqual(left, right) {
  return (
    left?.baseUrl === right?.baseUrl &&
    left?.useAuthState === right?.useAuthState &&
    left?.appEnvironment === right?.appEnvironment &&
    left?.databaseConnection === right?.databaseConnection &&
    left?.databaseIdentifierHash === right?.databaseIdentifierHash &&
    left?.dependenciesFingerprint === right?.dependenciesFingerprint &&
    left?.browser === right?.browser &&
    left?.locale === right?.locale &&
    left?.timezone === right?.timezone &&
    left?.authStateHash === right?.authStateHash
  );
}

for (const generatedCheck of generatedChecks) {
  try {
    validateGeneratedCheck(generatedCheck);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const planPath = resolve(realRunDir, 'plan.json');
if (
  !existsSync(planPath) ||
  lstatSync(planPath).isSymbolicLink() ||
  !lstatSync(planPath).isFile() ||
  lstatSync(planPath).nlink !== 1 ||
  realpathSync(planPath) !== planPath
) {
  console.error('BROWSER_CHECK_RUN_DIR/plan.json must be a real, single-link regular file');
  process.exit(2);
}
let planSource;
try {
  planSource = readBoundedRegularFileSync(
    planPath,
    lstatSync(planPath),
    'BROWSER_CHECK_RUN_DIR/plan.json',
  ).toString('utf8');
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
let plan;
try {
  plan = JSON.parse(planSource);
} catch {
  console.error('BROWSER_CHECK_RUN_DIR/plan.json must contain valid JSON');
  process.exit(2);
}
const baseRef = plan?.change?.baseRef;
const planRevision = plan?.revision;
const planEnvironment = plan?.environment;
if (
  plan?.schemaVersion !== '1.0' ||
  typeof baseRef !== 'string' ||
  !SAFE_GIT_REF_PATTERN.test(baseRef) ||
  baseRef.includes('..') ||
  baseRef.includes('//') ||
  baseRef.includes('@{') ||
  !planRevision ||
  !SHA_PATTERN.test(planRevision.baseSha ?? '') ||
  !SHA_PATTERN.test(planRevision.headSha ?? '') ||
  !FINGERPRINT_PATTERN.test(planRevision.worktreeFingerprint ?? '')
) {
  console.error('plan.json must use schemaVersion 1.0 with a safe baseRef and Git revision');
  process.exit(2);
}
const appEnvironment = planEnvironment?.appEnvironment;
if (
  appEnvironment !== 'testing' ||
  planEnvironment?.browser !== 'chromium' ||
  planEnvironment?.locale !== 'ja-JP' ||
  planEnvironment?.timezone !== 'Asia/Tokyo'
) {
  console.error(
    'plan.environment must use appEnvironment=testing, browser=chromium, locale=ja-JP, and timezone=Asia/Tokyo',
  );
  process.exit(2);
}

let plannedBaseUrl;
let runtimeBaseUrl;
let runtimeBaseUrlInput;
let runtimeIsDocker;
let useAuthState;
let databaseBinding;
let trustedRevision;
let trustedDependenciesFingerprint;
try {
  plannedBaseUrl = canonicalBaseUrl(plan?.environment?.baseUrl, 'plan.environment.baseUrl');
  runtimeBaseUrlInput = process.env.PLAYWRIGHT_BASE_URL;
  runtimeBaseUrl = canonicalBaseUrl(runtimeBaseUrlInput, 'PLAYWRIGHT_BASE_URL');
  if (plannedBaseUrl !== runtimeBaseUrl) {
    throw new Error('PLAYWRIGHT_BASE_URL must match plan.environment.baseUrl');
  }
  const plannedIsDocker = dockerRuntimeFromRawBaseUrl(
    plan.environment.baseUrl,
    'plan.environment.baseUrl',
  );
  runtimeIsDocker = dockerRuntimeFromRawBaseUrl(runtimeBaseUrlInput, 'PLAYWRIGHT_BASE_URL');
  if (plannedIsDocker !== runtimeIsDocker) {
    throw new Error('PLAYWRIGHT_BASE_URL must use the same host runtime as the plan');
  }
  const plannedUseAuthState = plan?.environment?.useAuthState ?? false;
  if (typeof plannedUseAuthState !== 'boolean') {
    throw new Error('plan.environment.useAuthState must be boolean when provided');
  }
  const authStatePreference = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() ?? 'false';
  if (!['true', 'false'].includes(authStatePreference)) {
    throw new Error('BROWSER_CHECK_USE_AUTH_STATE must be true or false when provided');
  }
  useAuthState = authStatePreference === 'true';
  if (plannedUseAuthState || useAuthState) {
    throw new Error(
      'reusable auth state is unsupported; authenticate explicitly inside each temporary check',
    );
  }
  databaseBinding = databaseRuntimeBinding(runtimeIsDocker, workspaceRelativeRunDir);
  trustedRevision = trustedRevisionFromEnvironment(runtimeIsDocker);
  trustedDependenciesFingerprint = trustedDependenciesFingerprintFromEnvironment(runtimeIsDocker);
} catch (error) {
  console.error(`The browser-check runtime does not match its plan: ${error.message}`);
  process.exit(2);
}
if (!runtimeIsDocker) {
  const trustedHostPreference = process.env.BROWSER_CHECK_TRUSTED_HOST_SMOKE;
  const isCiSmoke =
    trustedHostPreference === 'true' && plan?.change?.source === 'continuous-integration';
  if (!isCiSmoke) {
    console.error(
      'host mode is limited to the trusted CI infrastructure smoke; use the dedicated Docker runtime for change verification',
    );
    process.exit(2);
  }
}

const plannedOrigin = new URL(plannedBaseUrl).origin;
const plannedTemporaryCheckList = Array.isArray(plan?.checks)
  ? plan.checks.filter((check) => check?.driver === 'playwright-temporary')
  : [];
const plannedTemporaryChecks = new Map(
  plannedTemporaryCheckList
    .filter((check) => typeof check?.id === 'string')
    .map((check) => [check.id, check]),
);
if (plannedTemporaryChecks.size !== plannedTemporaryCheckList.length) {
  console.error('plan.checks must contain unique IDs for every playwright-temporary check');
  process.exit(2);
}
const generatedCheckCounts = new Map(
  [...plannedTemporaryChecks.keys()].map((checkId) => [checkId, 0]),
);
for (const {
  generatedCheck,
  navigationTarget,
  screenshotPaths,
  testTitle,
} of plannedNavigationTargets) {
  const mentionedCheckIds = new Set(
    testTitle.match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? [],
  );
  if (mentionedCheckIds.size !== 1) {
    console.error(
      `${generatedCheck} test title must contain exactly one bounded planned playwright-temporary check ID`,
    );
    process.exit(2);
  }
  const [checkId] = mentionedCheckIds;
  const plannedCheck = plannedTemporaryChecks.get(checkId);
  if (!plannedCheck) {
    console.error(
      `${generatedCheck} test title references unplanned playwright-temporary check ${checkId}`,
    );
    process.exit(2);
  }
  for (const screenshotPath of screenshotPaths) {
    const screenshotCheckIds = screenshotPath.match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? [];
    if (screenshotCheckIds.length !== 1 || screenshotCheckIds[0] !== checkId) {
      console.error(
        `${generatedCheck} screenshot path must contain exactly the owning check ID ${checkId} as a bounded token`,
      );
      process.exit(2);
    }
  }
  let resolvedNavigation;
  let resolvedPlannedTarget;
  const plannedTarget = plannedCheck?.target?.url;
  if (typeof plannedTarget !== 'string' || plannedTarget.trim() === '') {
    console.error(`${generatedCheck} planned check ${checkId} requires a nonempty target.url`);
    process.exit(2);
  }
  try {
    resolvedNavigation = new URL(navigationTarget, plannedBaseUrl);
    resolvedPlannedTarget = new URL(plannedTarget, plannedBaseUrl);
  } catch {
    console.error(`${generatedCheck} and its planned check require valid target URLs`);
    process.exit(2);
  }
  if (
    !['http:', 'https:'].includes(resolvedNavigation.protocol) ||
    resolvedNavigation.origin !== plannedOrigin ||
    !['http:', 'https:'].includes(resolvedPlannedTarget.protocol) ||
    resolvedPlannedTarget.origin !== plannedOrigin
  ) {
    console.error(`${generatedCheck} goto must target the planned HTTP(S) origin`);
    process.exit(2);
  }
  if (resolvedNavigation.href !== resolvedPlannedTarget.href) {
    console.error(`${generatedCheck} goto must exactly match ${checkId} target.url`);
    process.exit(2);
  }
  generatedCheckCounts.set(checkId, (generatedCheckCounts.get(checkId) ?? 0) + 1);
}
for (const [checkId, count] of generatedCheckCounts) {
  if (count !== 1) {
    console.error(
      `plan check ${checkId} must have exactly one generated test with a bound page.goto`,
    );
    process.exit(2);
  }
}

let playwrightBudget;
try {
  playwrightBudget = playwrightExecutionBudget(plannedTemporaryChecks.size, runtimeIsDocker);
} catch (error) {
  console.error(`The browser-check execution budget is invalid: ${error.message}`);
  process.exit(2);
}

const authStatePath = resolve(realRunDir, 'auth/user.json');
let authStateHash;
if (useAuthState) {
  const authStateStat = existsSync(authStatePath) ? lstatSync(authStatePath) : undefined;
  if (
    !authStateStat ||
    authStateStat.isSymbolicLink() ||
    !authStateStat.isFile() ||
    authStateStat.nlink !== 1 ||
    realpathSync(authStatePath) !== authStatePath
  ) {
    console.error(
      'BROWSER_CHECK_USE_AUTH_STATE=true requires an immutable auth/user.json in this run',
    );
    process.exit(2);
  }
  authStateHash = hashRegularFileSync(
    authStatePath,
    authStateStat,
    'BROWSER_CHECK_RUN_DIR/auth/user.json',
  ).sha256;
}

const runtime = {
  baseUrl: runtimeBaseUrl,
  useAuthState,
  appEnvironment: 'testing',
  ...databaseBinding,
  ...(trustedDependenciesFingerprint
    ? { dependenciesFingerprint: trustedDependenciesFingerprint }
    : {}),
  browser: 'chromium',
  locale: 'ja-JP',
  timezone: 'Asia/Tokyo',
  ...(authStateHash ? { authStateHash } : {}),
};

let preflightRevision;
try {
  preflightRevision = trustedRevision ?? revisionSnapshot(baseRef, workspaceRoot);
} catch (error) {
  console.error(`The browser-check Git revision could not be resolved: ${error.message}`);
  process.exit(2);
}
if (!revisionsEqual(planRevision, preflightRevision)) {
  console.error('plan.json revision is stale; create a new run for the current Git worktree');
  process.exit(2);
}

const claimToken = randomUUID();
const claimTokenHash = createHash('sha256').update(claimToken).digest('hex');
const planHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
const generatedSourceHash = generatedSourceFingerprint(generatedChecks);
let frontendAssetsHash;
const assetWorkspaceInput = process.env.BROWSER_CHECK_ASSET_WORKSPACE?.trim();
const expectedRunLocalAssetWorkspace = `${workspaceRelativeRunDir}/runtime/assets`;
if (assetWorkspaceInput && assetWorkspaceInput !== expectedRunLocalAssetWorkspace) {
  console.error(
    `BROWSER_CHECK_ASSET_WORKSPACE must equal the run-owned ${expectedRunLocalAssetWorkspace}`,
  );
  process.exit(2);
}
const assetWorkspaceRoot = assetWorkspaceInput
  ? resolve(workspaceRoot, expectedRunLocalAssetWorkspace)
  : workspaceRoot;
try {
  frontendAssetsHash = frontendAssetsFingerprint(
    assetWorkspaceRoot,
    planRevision,
    undefined,
    trustedDependenciesFingerprint,
  );
} catch (error) {
  console.error(`The browser-check frontend assets are invalid: ${error.message}`);
  process.exit(2);
}
const claimRecord = {
  schemaVersion: '1.0',
  tokenHash: claimTokenHash,
  runDir: realRunDir,
  planHash,
  generatedSourceHash,
  frontendAssetsHash,
  planRevision,
  preflightRevision,
  runtime,
  claimedAt: new Date().toISOString(),
};
const claimSource = `${JSON.stringify(claimRecord, null, 2)}\n`;
let claimFileDescriptor;
try {
  claimFileDescriptor = openSync(claimPath, 'wx', 0o600);
  writeFileSync(claimFileDescriptor, claimSource, 'utf8');
  fsyncSync(claimFileDescriptor);
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('BROWSER_CHECK_RUN_DIR was already claimed; create a new run');
  } else {
    console.error(`BROWSER_CHECK_RUN_DIR could not be claimed atomically: ${error.message}`);
  }
  process.exit(2);
} finally {
  if (claimFileDescriptor !== undefined) {
    closeSync(claimFileDescriptor);
  }
}

function replaceClaimAtomically(completedClaim) {
  const temporaryClaimPath = resolve(realRunDir, `.browser-check-run.${randomUUID()}.tmp`);
  let temporaryClaimDescriptor;
  try {
    temporaryClaimDescriptor = openSync(temporaryClaimPath, 'wx', 0o600);
    writeFileSync(temporaryClaimDescriptor, `${JSON.stringify(completedClaim, null, 2)}\n`, 'utf8');
    fsyncSync(temporaryClaimDescriptor);
    closeSync(temporaryClaimDescriptor);
    temporaryClaimDescriptor = undefined;
    renameSync(temporaryClaimPath, claimPath);
  } finally {
    if (temporaryClaimDescriptor !== undefined) {
      closeSync(temporaryClaimDescriptor);
    }
    if (existsSync(temporaryClaimPath)) {
      unlinkSync(temporaryClaimPath);
    }
  }
}

function createJsonAtomically(targetPath, value) {
  const source = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(source) > MAX_STRUCTURED_FILE_BYTES) {
    throw new Error(
      `${relative(realRunDir, targetPath)} exceeds the ${MAX_STRUCTURED_FILE_BYTES}-byte structural file limit`,
    );
  }
  const temporaryPath = resolve(realRunDir, `.browser-check-output.${randomUUID()}.tmp`);
  let temporaryDescriptor;
  try {
    temporaryDescriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(temporaryDescriptor, source, 'utf8');
    fsyncSync(temporaryDescriptor);
    closeSync(temporaryDescriptor);
    temporaryDescriptor = undefined;
    linkSync(temporaryPath, targetPath);
    unlinkSync(temporaryPath);
    return source;
  } finally {
    if (temporaryDescriptor !== undefined) {
      closeSync(temporaryDescriptor);
    }
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

const affectedCheckIds = [...plannedTemporaryChecks.keys()].sort((left, right) => {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
});

function removeUntrustedPlaywrightReport() {
  if (!existsSync(playwrightResultsPath)) {
    return;
  }
  const reportStat = lstatSync(playwrightResultsPath);
  if (reportStat.isDirectory()) {
    renameSync(
      playwrightResultsPath,
      resolve(realRunDir, `.browser-check-invalid-playwright-results.${randomUUID()}`),
    );
    return;
  }
  unlinkSync(playwrightResultsPath);
}

function stopWithExecutionError(classification, message) {
  const executionError = {
    schemaVersion: '1.0',
    phase: 'pre-report',
    scope: 'global',
    affectedCheckIds,
    classification,
    message,
    occurredAt: new Date().toISOString(),
  };
  try {
    removeUntrustedPlaywrightReport();
    createJsonAtomically(executionErrorPath, executionError);
  } catch (error) {
    console.error(`The browser-check execution error could not be recorded: ${error.message}`);
  }
  console.error(message);
  process.exit(1);
}

function rootErrorCheckIds(error, tokens = new Set()) {
  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    throw new Error('root errors must be objects');
  }
  if (typeof error.message !== 'string' || error.message.trim() === '') {
    throw new Error('root errors require a nonempty message');
  }
  for (const key of ['message', 'stack', 'value', 'snippet']) {
    const value = error[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      throw new Error(`root error ${key} must be a string`);
    }
    for (const checkId of value.match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? []) {
      tokens.add(checkId);
    }
  }
  if (error.cause !== undefined) {
    rootErrorCheckIds(error.cause, tokens);
  }
  return tokens;
}

function validatePlaywrightReportFile(reportPath) {
  if (!existsSync(reportPath)) {
    return 'playwright-results.json was not created';
  }
  const reportStat = lstatSync(reportPath);
  if (
    reportStat.isSymbolicLink() ||
    !reportStat.isFile() ||
    reportStat.nlink !== 1 ||
    realpathSync(reportPath) !== reportPath
  ) {
    return 'playwright-results.json must be a real, single-link regular file';
  }
  let report;
  try {
    const reportSource = readBoundedRegularFileSync(
      reportPath,
      reportStat,
      'playwright-results.json',
    ).toString('utf8');
    report = JSON.parse(reportSource);
  } catch (error) {
    if (error.message.includes('structural file limit')) {
      return error.message;
    }
    return 'playwright-results.json does not contain valid JSON';
  }
  if (
    !report ||
    typeof report !== 'object' ||
    Array.isArray(report) ||
    !Array.isArray(report.suites) ||
    !Array.isArray(report.errors) ||
    !report.stats ||
    typeof report.stats !== 'object' ||
    Array.isArray(report.stats)
  ) {
    return 'playwright-results.json does not have the Playwright JSON report shape';
  }
  for (const [index, rootError] of report.errors.entries()) {
    let mentionedCheckIds;
    try {
      mentionedCheckIds = rootErrorCheckIds(rootError);
    } catch (error) {
      return `playwright-results.json root error ${index} is malformed: ${error.message}`;
    }
    if (mentionedCheckIds.size !== 1 || !plannedTemporaryChecks.has([...mentionedCheckIds][0])) {
      return `playwright-results.json root error ${index} cannot be attributed to exactly one planned check`;
    }
  }
  return undefined;
}

function collectExecutionArtifactFile(filePath, files, collisionKeys) {
  const fileStat = lstatSync(filePath);
  if (fileStat.isSymbolicLink()) {
    throw new Error(`execution artifacts must not be symlinks: ${filePath}`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`execution artifact entries must be regular files: ${filePath}`);
  }
  if (fileStat.nlink !== 1 || realpathSync(filePath) !== filePath) {
    throw new Error(
      `execution artifacts must not have hard-link or redirected aliases: ${filePath}`,
    );
  }
  const relativePath = relative(realRunDir, filePath).split(sep).join('/');
  if (!pathStaysInside(realRunDir, filePath) || relativePath.normalize('NFC') !== relativePath) {
    throw new Error(`execution artifact path is not canonical: ${filePath}`);
  }
  const collisionKey = relativePath.toLowerCase();
  if (collisionKeys.has(collisionKey)) {
    throw new Error(`execution artifact paths are duplicated or collide: ${relativePath}`);
  }
  collisionKeys.add(collisionKey);
  const hashedFile = hashRegularFileSync(filePath, fileStat, `execution artifact ${relativePath}`);
  if (hasZipSignature(hashedFile.prefix)) {
    throw new Error(
      `raw ZIP archives are forbidden even under renamed extensions: ${relativePath}`,
    );
  }
  files.push({
    path: relativePath,
    size: hashedFile.size,
    sha256: hashedFile.sha256,
  });
}

function collectExecutionArtifactDirectory(directoryPath, files, collisionKeys) {
  const directoryStat = lstatSync(directoryPath);
  if (directoryStat.isSymbolicLink()) {
    throw new Error(`execution artifact directories must not be symlinks: ${directoryPath}`);
  }
  if (!directoryStat.isDirectory()) {
    throw new Error(`execution artifact roots must be directories: ${directoryPath}`);
  }
  for (const entry of readdirSync(directoryPath).sort()) {
    const entryPath = resolve(directoryPath, entry);
    const entryStat = lstatSync(entryPath);
    if (entryStat.isSymbolicLink()) {
      throw new Error(`execution artifacts must not be symlinks: ${entryPath}`);
    }
    if (entryStat.isDirectory()) {
      collectExecutionArtifactDirectory(entryPath, files, collisionKeys);
    } else if (entryStat.isFile()) {
      collectExecutionArtifactFile(entryPath, files, collisionKeys);
    } else {
      throw new Error(`execution artifact entries must be regular files: ${entryPath}`);
    }
  }
}

function assertNoRawTraceArchives(directoryPath) {
  const directoryStat = lstatSync(directoryPath);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error(`execution artifact roots must be real directories: ${directoryPath}`);
  }
  for (const entry of readdirSync(directoryPath)) {
    const entryPath = resolve(directoryPath, entry);
    const entryStat = lstatSync(entryPath);
    if (entryStat.isSymbolicLink()) {
      throw new Error(`execution artifacts must not be symlinks: ${entryPath}`);
    }
    if (entryStat.isDirectory()) {
      assertNoRawTraceArchives(entryPath);
    } else if (entryStat.isFile()) {
      const archiveByName = entry.toLowerCase().endsWith('.zip');
      const archiveBySignature = hasZipSignature(
        readRegularFilePrefixSync(entryPath, entryStat, `execution artifact ${entryPath}`),
      );
      if (archiveByName || archiveBySignature) {
        throw new Error(
          `raw ZIP archives are forbidden because trace archives can retain unredacted secrets: ${entryPath}`,
        );
      }
    }
  }
}

function createExecutionArtifactManifest() {
  const files = [];
  const collisionKeys = new Set();
  const rawTraceDirectory = resolve(realRunDir, 'traces');
  if (existsSync(rawTraceDirectory)) {
    const rawTraceStat = lstatSync(rawTraceDirectory);
    if (
      rawTraceStat.isSymbolicLink() ||
      !rawTraceStat.isDirectory() ||
      readdirSync(rawTraceDirectory).length > 0
    ) {
      throw new Error(
        'raw traces/ output is forbidden because trace archives can contain unredacted secrets',
      );
    }
  }
  collectExecutionArtifactFile(playwrightResultsPath, files, collisionKeys);
  for (const directory of [
    'artifacts',
    'playwright-report',
    'evidence/console',
    'evidence/network',
    'evidence/screenshots',
    'videos',
  ]) {
    const directoryPath = resolve(realRunDir, directory);
    if (existsSync(directoryPath)) {
      assertNoRawTraceArchives(directoryPath);
      collectExecutionArtifactDirectory(directoryPath, files, collisionKeys);
    }
  }
  files.sort((left, right) => {
    if (left.path === right.path) {
      return 0;
    }
    return left.path < right.path ? -1 : 1;
  });
  createJsonAtomically(artifactManifestPath, {
    schemaVersion: '1.0',
    files,
  });
  return hashRegularFileSync(
    artifactManifestPath,
    lstatSync(artifactManifestPath),
    '.browser-check-artifacts.json',
  ).sha256;
}

const playwrightCli = resolve(workspaceRoot, 'node_modules/@playwright/test/cli.js');
if (!existsSync(playwrightCli)) {
  stopWithExecutionError('environment-defect', 'The repository Playwright CLI is not installed');
}

function processTreeExists(childProcess, useProcessGroup) {
  if (!Number.isSafeInteger(childProcess.pid) || childProcess.pid <= 0) {
    return false;
  }
  try {
    process.kill(useProcessGroup ? -childProcess.pid : childProcess.pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

function signalProcessTree(childProcess, useProcessGroup, signal) {
  if (!Number.isSafeInteger(childProcess.pid) || childProcess.pid <= 0) {
    return undefined;
  }
  try {
    if (useProcessGroup) {
      process.kill(-childProcess.pid, signal);
    } else {
      childProcess.kill(signal);
    }
    return undefined;
  } catch (error) {
    return error.code === 'ESRCH' ? undefined : error;
  }
}

function runPlaywright(playwrightExecutable, arguments_, options) {
  const useProcessGroup = process.platform !== 'win32';
  const childProcess = spawn(process.execPath, [playwrightExecutable, ...arguments_], {
    cwd: workspaceRoot,
    detached: useProcessGroup,
    env: options.env,
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  return new Promise((resolveExecution) => {
    let childError;
    let childSignal = null;
    let childStatus = null;
    let terminationError;
    let timedOut = false;
    let settled = false;
    let timeoutHandle;
    let terminationHandle;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(terminationHandle);
      resolveExecution({
        error: childError,
        signal: childSignal,
        status: childStatus,
        terminationError,
        timedOut,
      });
    };

    childProcess.once('error', (error) => {
      childError = error;
      if (!timedOut) {
        finish();
      }
    });
    childProcess.once('exit', (code, signal) => {
      childStatus = code;
      childSignal = signal;
      if (!timedOut || !processTreeExists(childProcess, useProcessGroup)) {
        finish();
      }
    });

    timeoutHandle = setTimeout(() => {
      timedOut = true;
      terminationError = signalProcessTree(childProcess, useProcessGroup, 'SIGTERM');
      terminationHandle = setTimeout(() => {
        if (processTreeExists(childProcess, useProcessGroup)) {
          const killError = signalProcessTree(childProcess, useProcessGroup, 'SIGKILL');
          terminationError ??= killError;
        }
        finish();
      }, options.terminationGraceMs);
    }, options.timeoutMs);
  });
}

function playwrightChildEnvironment() {
  const environment = {};
  for (const name of [
    'CI',
    'ComSpec',
    'DISPLAY',
    'FORCE_COLOR',
    'BROWSER_CHECK_ASSET_WORKSPACE',
    'BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT',
    'BROWSER_CHECK_TRUSTED_BASE_SHA',
    'BROWSER_CHECK_TRUSTED_HEAD_SHA',
    'BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT',
    'GIT_OPTIONAL_LOCKS',
    'HOME',
    'LANG',
    'LC_ALL',
    'NO_COLOR',
    'PATH',
    'PATHEXT',
    'PLAYWRIGHT_BROWSERS_PATH',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'TZ',
    'WAYLAND_DISPLAY',
    'WINDIR',
    'XAUTHORITY',
  ]) {
    if (process.env[name] !== undefined) {
      environment[name] = process.env[name];
    }
  }
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.BROWSER_CHECK_CONTRACT_TEST_TIMEOUT === 'true' &&
    process.env.BROWSER_CHECK_FAKE_CLI_MODE !== undefined
  ) {
    environment.NODE_ENV = 'test';
    environment.BROWSER_CHECK_FAKE_CLI_MODE = process.env.BROWSER_CHECK_FAKE_CLI_MODE;
  }
  return environment;
}

const execution = await runPlaywright(
  playwrightCli,
  ['test', '--config=playwright.browser-check.config.ts', ...passthroughArguments],
  {
    env: {
      ...playwrightChildEnvironment(),
      BROWSER_CHECK_RUN_DIR: realRunDir,
      BROWSER_CHECK_RUN_TOKEN: claimToken,
      BROWSER_CHECK_USE_AUTH_STATE: String(useAuthState),
      BROWSER_CHECK_DATABASE_CONNECTION: databaseBinding.databaseConnection,
      BROWSER_CHECK_DATABASE_IDENTIFIER: process.env.BROWSER_CHECK_DATABASE_IDENTIFIER,
      PLAYWRIGHT_BASE_URL: runtimeBaseUrlInput,
    },
    timeoutMs: playwrightBudget.timeoutMs,
    terminationGraceMs: playwrightBudget.terminationGraceMs,
  },
);

if (execution.timedOut) {
  const terminationDetail = execution.terminationError
    ? `; process-group cleanup reported ${execution.terminationError.message}`
    : '';
  stopWithExecutionError(
    'check-script-defect',
    `Playwright exceeded the derived ${playwrightBudget.timeoutMs} ms execution timeout; ` +
      `the wrapper sent SIGTERM, allowed ${playwrightBudget.terminationGraceMs} ms for cleanup, ` +
      `and enforced a SIGKILL fallback${terminationDetail}`,
  );
}
if (execution.error) {
  stopWithExecutionError(
    'environment-defect',
    `Playwright could not start: ${execution.error.message}`,
  );
}
if (execution.signal) {
  stopWithExecutionError('environment-defect', `Playwright ended from signal ${execution.signal}`);
}
const playwrightExitCode = execution.status ?? 1;
if (!Number.isInteger(playwrightExitCode) || playwrightExitCode < 0) {
  stopWithExecutionError('environment-defect', 'Playwright did not provide a valid exit code');
}
const playwrightReportError = validatePlaywrightReportFile(playwrightResultsPath);
if (playwrightReportError) {
  stopWithExecutionError(
    playwrightExitCode === 0 ? 'check-script-defect' : 'environment-defect',
    `Playwright exited with code ${playwrightExitCode}, but ${playwrightReportError}`,
  );
}
try {
  const currentClaimStat = existsSync(claimPath) ? lstatSync(claimPath) : undefined;
  const currentClaimSource = currentClaimStat
    ? readBoundedRegularFileSync(claimPath, currentClaimStat, '.browser-check-run.json').toString(
        'utf8',
      )
    : undefined;
  if (
    !currentClaimStat ||
    currentClaimStat.isSymbolicLink() ||
    !currentClaimStat.isFile() ||
    currentClaimStat.nlink !== 1 ||
    realpathSync(claimPath) !== claimPath ||
    currentClaimSource !== claimSource
  ) {
    throw new Error('the preflight claim changed during browser execution');
  }
  const postflightDependenciesFingerprint =
    trustedDependenciesFingerprintFromEnvironment(runtimeIsDocker);
  const postflightFrontendAssetsHash = frontendAssetsFingerprint(
    assetWorkspaceRoot,
    planRevision,
    undefined,
    postflightDependenciesFingerprint,
  );
  if (postflightFrontendAssetsHash !== frontendAssetsHash) {
    throw new Error('the built frontend asset tree changed during browser execution');
  }
  const executionArtifactManifestHash = createExecutionArtifactManifest();
  const postflightPlanSource = readBoundedRegularFileSync(
    planPath,
    lstatSync(planPath),
    'BROWSER_CHECK_RUN_DIR/plan.json',
  ).toString('utf8');
  const postflightPlanHash = `sha256:${createHash('sha256')
    .update(postflightPlanSource)
    .digest('hex')}`;
  const postflightGeneratedSourceHash = generatedSourceFingerprint(
    collectGeneratedChecks(generatedDir),
  );
  const postflightRuntimeBaseUrlInput = process.env.PLAYWRIGHT_BASE_URL;
  const postflightRuntimeBaseUrl = canonicalBaseUrl(
    postflightRuntimeBaseUrlInput,
    'PLAYWRIGHT_BASE_URL',
  );
  const postflightIsDocker = dockerRuntimeFromRawBaseUrl(
    postflightRuntimeBaseUrlInput,
    'PLAYWRIGHT_BASE_URL',
  );
  const postflightRevision =
    trustedRevisionFromEnvironment(postflightIsDocker) ?? revisionSnapshot(baseRef, workspaceRoot);
  const postflightAuthStatePreference = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() ?? 'false';
  const postflightUseAuthState = postflightAuthStatePreference === 'true';
  const postflightDatabaseBinding = databaseRuntimeBinding(
    postflightIsDocker,
    workspaceRelativeRunDir,
  );
  let postflightAuthStateHash;
  if (postflightUseAuthState) {
    const postflightAuthStateStat = existsSync(authStatePath)
      ? lstatSync(authStatePath)
      : undefined;
    if (
      !postflightAuthStateStat ||
      postflightAuthStateStat.isSymbolicLink() ||
      !postflightAuthStateStat.isFile() ||
      postflightAuthStateStat.nlink !== 1 ||
      realpathSync(authStatePath) !== authStatePath
    ) {
      throw new Error('the stored authentication file is missing or redirected');
    }
    postflightAuthStateHash = hashRegularFileSync(
      authStatePath,
      postflightAuthStateStat,
      'BROWSER_CHECK_RUN_DIR/auth/user.json',
    ).sha256;
  }
  const postflightRuntime = {
    baseUrl: postflightRuntimeBaseUrl,
    useAuthState: postflightUseAuthState,
    appEnvironment: 'testing',
    ...postflightDatabaseBinding,
    ...(postflightDependenciesFingerprint
      ? { dependenciesFingerprint: postflightDependenciesFingerprint }
      : {}),
    browser: 'chromium',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    ...(postflightAuthStateHash ? { authStateHash: postflightAuthStateHash } : {}),
  };
  if (
    !['true', 'false'].includes(postflightAuthStatePreference) ||
    postflightIsDocker !== runtimeIsDocker ||
    postflightPlanHash !== planHash ||
    postflightGeneratedSourceHash !== generatedSourceHash ||
    !revisionsEqual(postflightRevision, planRevision) ||
    !runtimesEqual(postflightRuntime, runtime)
  ) {
    throw new Error('the plan, generated source, runtime, or Git revision changed');
  }
  replaceClaimAtomically({
    ...claimRecord,
    postflight: {
      completedAt: new Date().toISOString(),
      planHash: postflightPlanHash,
      generatedSourceHash: postflightGeneratedSourceHash,
      frontendAssetsHash: postflightFrontendAssetsHash,
      revision: postflightRevision,
      runtime: postflightRuntime,
      executionArtifactManifestHash,
      playwrightExitCode,
    },
  });
} catch (error) {
  console.error(
    `The browser-check postflight could not be completed; this run is not valid evidence: ${error.message}`,
  );
  process.exit(1);
}
process.exit(playwrightExitCode);
