#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const RESPONSIBILITIES = new Set(['unit', 'feature', 'component', 'browser']);
const LIFECYCLES = new Set(['regression', 'change-only', 'exploratory', 'human-only']);
const EVALUATION_MODES = new Set(['objective', 'observation', 'not-required']);
const DRIVERS = new Set([
  'existing-test',
  'agent-browser',
  'playwright-temporary',
  'human',
  'not-required',
]);
const STATUSES = new Set(['pass', 'fail', 'blocked', 'not_run', 'observation', 'not_required']);
const PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3']);
const ISSUE_CLASSIFICATIONS = new Set([
  'product-defect',
  'test-data-defect',
  'check-script-defect',
  'environment-defect',
  'specification-gap',
  'observation',
]);
const SUMMARY_KEYS = {
  pass: 'pass',
  fail: 'fail',
  blocked: 'blocked',
  not_run: 'notRun',
  observation: 'observation',
  not_required: 'notRequired',
};
const PLAYWRIGHT_OUTCOMES = new Set(['expected', 'unexpected', 'flaky', 'skipped']);
const PLAYWRIGHT_RESULT_STATUSES = new Set([
  'passed',
  'failed',
  'timedOut',
  'skipped',
  'interrupted',
]);
const PLAYWRIGHT_EXPECTED_STATUSES = PLAYWRIGHT_RESULT_STATUSES;
const CHECK_ID_PATTERN_SOURCE =
  '(?<![A-Za-z0-9-])BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{3}(?![A-Za-z0-9-])';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;

function calendarComponentsAreValid(year, month, day, hour, minute, second, millisecond = 0) {
  const candidate = new Date(0);
  candidate.setUTCFullYear(year, month - 1, day);
  candidate.setUTCHours(hour, minute, second, millisecond);

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day &&
    candidate.getUTCHours() === hour &&
    candidate.getUTCMinutes() === minute &&
    candidate.getUTCSeconds() === second &&
    candidate.getUTCMilliseconds() === millisecond
  );
}

function parseJstTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?\+09:00$/.exec(
    value,
  );
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second, millisecond = '000'] = match;
  const components = [year, month, day, hour, minute, second, millisecond].map(Number);
  if (!calendarComponentsAreValid(...components)) {
    return undefined;
  }

  return Date.parse(value);
}

function runIdIsValid(value) {
  if (!/^\d{14}$/.test(value)) {
    return false;
  }

  return calendarComponentsAreValid(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)),
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)),
    Number(value.slice(10, 12)),
    Number(value.slice(12, 14)),
  );
}

function canonicalBrowserBaseUrl(value, path, requireLocalHost = false) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    addError(path, 'must be a valid absolute URL');
    return '';
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    addError(path, 'must use http or https');
    return '';
  }
  if (parsedUrl.username || parsedUrl.password) {
    addError(path, 'must not contain credentials');
  }
  if (parsedUrl.search || parsedUrl.hash) {
    addError(path, 'must not contain a query string or fragment');
  }

  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx']);
  if (requireLocalHost && !allowedHosts.has(parsedUrl.hostname)) {
    addError(path, 'must target localhost, a loopback address, or Docker nginx');
  }
  if (parsedUrl.hostname === 'nginx') {
    parsedUrl.hostname = 'localhost';
  }

  return parsedUrl.toString();
}

const runDirArgument = process.argv[2]?.trim();
if (!runDirArgument) {
  console.error(
    'Usage: node validate-change-verification.mjs <test-results/change-verification/{change-id}/{run-id}>',
  );
  process.exit(2);
}

const changeVerificationRoot = resolve(process.cwd(), 'test-results/change-verification');
const runDir = resolve(process.cwd(), runDirArgument);
const errors = [];

function pathStaysInside(parentPath, candidatePath, allowParent = false) {
  const relativePath = relative(parentPath, candidatePath);

  return (
    (allowParent || relativePath !== '') &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

const runDirRelativePath = relative(changeVerificationRoot, runDir);
const runDirSegments = runDirRelativePath.split(sep);
if (
  !pathStaysInside(changeVerificationRoot, runDir) ||
  runDirSegments.length !== 2 ||
  runDirSegments.some((segment) => segment === '')
) {
  errors.push(
    'run directory: must be exactly test-results/change-verification/{change-id}/{run-id}',
  );
}

let realRunDir = runDir;
try {
  const [realWorkspaceRoot, realRoot, resolvedRealRunDir] = await Promise.all([
    realpath(process.cwd()),
    realpath(changeVerificationRoot),
    realpath(runDir),
  ]);
  realRunDir = resolvedRealRunDir;
  if (realRoot !== resolve(realWorkspaceRoot, 'test-results/change-verification')) {
    errors.push('run directory: test-results/change-verification must not be a symlink');
  }
  if (!pathStaysInside(realRoot, resolvedRealRunDir)) {
    errors.push('run directory: resolves outside test-results/change-verification');
  } else if (relative(realRoot, resolvedRealRunDir) !== runDirRelativePath) {
    errors.push('run directory: change or run path must not contain symlink indirection');
  }
} catch (error) {
  errors.push(`run directory: cannot resolve real path: ${error.message}`);
}

function addError(path, message) {
  errors.push(`${path}: ${message}`);
}

function checkIdTokens(value) {
  return new Set(String(value).match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? []);
}

function playwrightErrorCheckIdTokens(error, path) {
  const tokens = new Set();
  for (const key of ['message', 'stack', 'value', 'snippet']) {
    const value = error[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      addError(`${path}.${key}`, 'must be a string when provided');
      continue;
    }
    for (const checkId of checkIdTokens(value)) {
      tokens.add(checkId);
    }
  }
  if (error.cause !== undefined) {
    const cause = requireRecord(error.cause, `${path}.cause`);
    for (const checkId of playwrightErrorCheckIdTokens(cause, `${path}.cause`)) {
      tokens.add(checkId);
    }
  }

  return tokens;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value, path) {
  if (!isRecord(value)) {
    addError(path, 'must be an object');
    return {};
  }

  return value;
}

function requireString(record, key, path) {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    addError(`${path}.${key}`, 'must be a non-empty string');
    return '';
  }

  return value;
}

function requireStringArray(value, path) {
  if (!Array.isArray(value)) {
    addError(path, 'must be an array');
    return [];
  }

  const strings = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      addError(`${path}[${index}]`, 'must be a non-empty string');
      return;
    }
    strings.push(item);
  });

  return strings;
}

function requireEnum(value, allowed, path) {
  if (typeof value !== 'string' || !allowed.has(value)) {
    addError(path, `must be one of: ${[...allowed].join(', ')}`);
    return '';
  }

  return value;
}

async function readRunFile(filename) {
  const path = resolve(runDir, filename);

  try {
    const pathStat = await lstat(path);
    if (pathStat.isSymbolicLink() || !pathStat.isFile()) {
      addError(filename, 'must be a regular file, not a symlink');
      return '';
    }
    const realFilePath = await realpath(path);
    if (!pathStaysInside(realRunDir, realFilePath)) {
      addError(filename, 'resolves outside the run directory');
      return '';
    }

    return await readFile(realFilePath, 'utf8');
  } catch (error) {
    addError(filename, `cannot be read: ${error.message}`);
    return '';
  }
}

async function readJson(filename) {
  const source = await readRunFile(filename);

  try {
    return JSON.parse(source);
  } catch (error) {
    addError(filename, `is not valid JSON: ${error.message}`);
    return {};
  }
}

async function runFileExists(filename) {
  try {
    await lstat(resolve(runDir, filename));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    addError(filename, `cannot be inspected: ${error.message}`);
    return false;
  }
}

function revisionsEqual(left, right) {
  return (
    left.baseSha === right.baseSha &&
    left.headSha === right.headSha &&
    left.worktreeFingerprint === right.worktreeFingerprint
  );
}

function requireClaimRevision(value, path) {
  const revision = requireRecord(value, path);
  const baseSha = requireString(revision, 'baseSha', path);
  const headSha = requireString(revision, 'headSha', path);
  const worktreeFingerprint = requireString(revision, 'worktreeFingerprint', path);

  if (baseSha && !SHA_PATTERN.test(baseSha)) {
    addError(`${path}.baseSha`, 'must be a lowercase 40-character Git SHA');
  }
  if (headSha && !SHA_PATTERN.test(headSha)) {
    addError(`${path}.headSha`, 'must be a lowercase 40-character Git SHA');
  }
  if (worktreeFingerprint && !FINGERPRINT_PATTERN.test(worktreeFingerprint)) {
    addError(
      `${path}.worktreeFingerprint`,
      'must use sha256 followed by a lowercase 64-character digest',
    );
  }

  return { baseSha, headSha, worktreeFingerprint };
}

function canonicalIsoTimestamp(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    addError(path, 'must be a non-empty ISO-8601 UTC timestamp');
    return undefined;
  }

  const parsed = Date.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    addError(path, 'must be a canonical ISO-8601 UTC timestamp');
    return undefined;
  }

  return parsed;
}

function claimRunDirMatches(value, changeId, runId) {
  if (typeof value !== 'string' || value.trim() === '') {
    addError('.browser-check-run.json.runDir', 'must be a non-empty absolute path');
    return;
  }
  if (!value.startsWith('/') || value.includes('\\')) {
    addError('.browser-check-run.json.runDir', 'must be an absolute POSIX path');
    return;
  }

  const segments = value.slice(1).split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    addError('.browser-check-run.json.runDir', 'must be a normalized absolute path');
    return;
  }

  const expectedSuffix = ['test-results', 'change-verification', changeId, runId];
  const actualSuffix = segments.slice(-expectedSuffix.length);
  if (
    actualSuffix.length !== expectedSuffix.length ||
    actualSuffix.some((segment, index) => segment !== expectedSuffix[index])
  ) {
    addError(
      '.browser-check-run.json.runDir',
      `must end with test-results/change-verification/${changeId}/${runId}`,
    );
  }
}

async function generatedSourceFingerprint() {
  const generatedDir = resolve(runDir, 'generated');
  const generatedChecks = [];

  try {
    const [generatedStat, realGeneratedDir] = await Promise.all([
      lstat(generatedDir),
      realpath(generatedDir),
    ]);
    if (generatedStat.isSymbolicLink() || !generatedStat.isDirectory()) {
      addError(
        '.browser-check-run.json.generatedSourceHash',
        'generated/ must be a real directory, not a symlink',
      );
      return '';
    }
    if (!pathStaysInside(realRunDir, realGeneratedDir)) {
      addError(
        '.browser-check-run.json.generatedSourceHash',
        'generated/ must stay inside the run directory',
      );
      return '';
    }
  } catch (error) {
    addError(
      '.browser-check-run.json.generatedSourceHash',
      `cannot inspect generated/: ${error.message}`,
    );
    return '';
  }

  async function collectGeneratedChecks(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      addError(
        '.browser-check-run.json.generatedSourceHash',
        `cannot read generated/: ${error.message}`,
      );
      return;
    }

    for (const entry of entries) {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        let realDirectory;
        try {
          realDirectory = await realpath(entryPath);
        } catch (error) {
          addError(
            '.browser-check-run.json.generatedSourceHash',
            `cannot resolve generated directory ${relative(generatedDir, entryPath)}: ${error.message}`,
          );
          continue;
        }
        if (!pathStaysInside(realRunDir, realDirectory)) {
          addError(
            '.browser-check-run.json.generatedSourceHash',
            'generated directories must stay inside the run directory',
          );
          continue;
        }
        await collectGeneratedChecks(entryPath);
      } else if (!entry.isFile() || !entry.name.endsWith('.check.spec.ts')) {
        addError(
          '.browser-check-run.json.generatedSourceHash',
          `generated may contain only regular *.check.spec.ts files: ${relative(generatedDir, entryPath)}`,
        );
      } else {
        generatedChecks.push(entryPath);
      }
    }
  }

  await collectGeneratedChecks(generatedDir);
  if (generatedChecks.length === 0) {
    addError(
      '.browser-check-run.json.generatedSourceHash',
      'generated/ must contain at least one *.check.spec.ts file',
    );
    return '';
  }

  const fingerprint = createHash('sha256');
  const sortedChecks = generatedChecks.sort((left, right) => {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  });
  for (const generatedCheck of sortedChecks) {
    let source;
    try {
      const realGeneratedCheck = await realpath(generatedCheck);
      if (!pathStaysInside(realRunDir, realGeneratedCheck)) {
        addError(
          '.browser-check-run.json.generatedSourceHash',
          'generated source must stay inside the run directory',
        );
        continue;
      }
      source = await readFile(realGeneratedCheck);
    } catch (error) {
      addError(
        '.browser-check-run.json.generatedSourceHash',
        `cannot read generated source ${relative(generatedDir, generatedCheck)}: ${error.message}`,
      );
      continue;
    }
    fingerprint.update(relative(generatedDir, generatedCheck).split(sep).join('/'));
    fingerprint.update('\0');
    fingerprint.update(source);
    fingerprint.update('\0');
  }

  return `sha256:${fingerprint.digest('hex')}`;
}

function validateBrowserRuntime(
  value,
  path,
  canonicalPlanBaseUrl,
  plannedUseAuthState,
  planEnvironmentValues,
) {
  const runtime = requireRecord(value, path);
  const expectedKeys = new Set([
    'baseUrl',
    'browser',
    'locale',
    'timezone',
    'useAuthState',
    ...(plannedUseAuthState ? ['authStateHash'] : []),
  ]);
  for (const key of Object.keys(runtime)) {
    if (!expectedKeys.has(key)) {
      addError(`${path}.${key}`, 'is not an allowed runtime binding');
    }
  }
  const runtimeBaseUrl =
    typeof runtime.baseUrl === 'string' && runtime.baseUrl.trim() !== ''
      ? canonicalBrowserBaseUrl(runtime.baseUrl, `${path}.baseUrl`, true)
      : '';
  if (!runtimeBaseUrl) {
    if (typeof runtime.baseUrl !== 'string' || runtime.baseUrl.trim() === '') {
      addError(`${path}.baseUrl`, 'must be a non-empty string');
    }
  } else {
    if (runtime.baseUrl !== runtimeBaseUrl) {
      addError(`${path}.baseUrl`, 'must already be in canonical URL form');
    }
    if (canonicalPlanBaseUrl && runtimeBaseUrl !== canonicalPlanBaseUrl) {
      addError(`${path}.baseUrl`, 'must match plan.environment.baseUrl');
    }
  }

  let useAuthState;
  if (typeof runtime.useAuthState !== 'boolean') {
    addError(`${path}.useAuthState`, 'must be a boolean');
  } else {
    useAuthState = runtime.useAuthState;
    if (useAuthState !== plannedUseAuthState) {
      addError(`${path}.useAuthState`, 'must match plan.environment.useAuthState');
    }
  }

  const fixedRuntimeValues = {};
  for (const key of ['browser', 'locale', 'timezone']) {
    const runtimeValue = requireString(runtime, key, path);
    fixedRuntimeValues[key] = runtimeValue;
    if (runtimeValue && runtimeValue !== planEnvironmentValues[key]) {
      addError(`${path}.${key}`, `must match plan.environment.${key}`);
    }
  }

  let authStateHash;
  if (plannedUseAuthState) {
    authStateHash = requireString(runtime, 'authStateHash', path);
    if (authStateHash && !FINGERPRINT_PATTERN.test(authStateHash)) {
      addError(`${path}.authStateHash`, 'must be a lowercase sha256 fingerprint');
    }
  } else if (runtime.authStateHash !== undefined) {
    addError(`${path}.authStateHash`, 'must be omitted when useAuthState is false');
  }

  return {
    baseUrl: runtimeBaseUrl,
    useAuthState,
    ...fixedRuntimeValues,
    authStateHash,
  };
}

async function validateBrowserClaim({
  changeId,
  runId,
  planSource,
  planRevision,
  currentRevision,
  canonicalPlanBaseUrl,
  plannedUseAuthState,
  planEnvironmentValues,
  requiresPostflight,
  temporaryResultRecords,
  hasPlaywrightReport,
}) {
  try {
    const claimStat = await lstat(resolve(runDir, '.browser-check-run.json'));
    if (claimStat.isSymbolicLink() || !claimStat.isFile()) {
      addError('.browser-check-run.json', 'must be a regular file, not a symlink');
      return;
    }
  } catch (error) {
    addError('.browser-check-run.json', `cannot be inspected: ${error.message}`);
    return;
  }

  const claim = requireRecord(await readJson('.browser-check-run.json'), '.browser-check-run.json');
  if (claim.schemaVersion !== '1.0') {
    addError('.browser-check-run.json.schemaVersion', 'must equal "1.0"');
  }

  const tokenHash = requireString(claim, 'tokenHash', '.browser-check-run.json');
  if (tokenHash && !/^[0-9a-f]{64}$/.test(tokenHash)) {
    addError(
      '.browser-check-run.json.tokenHash',
      'must be a lowercase 64-character SHA-256 digest',
    );
  }

  claimRunDirMatches(claim.runDir, changeId, runId);

  const expectedPlanHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
  const claimPlanHash = requireString(claim, 'planHash', '.browser-check-run.json');
  if (claimPlanHash && !FINGERPRINT_PATTERN.test(claimPlanHash)) {
    addError('.browser-check-run.json.planHash', 'must be a lowercase sha256 fingerprint');
  }
  if (claimPlanHash && claimPlanHash !== expectedPlanHash) {
    addError('.browser-check-run.json.planHash', 'must match the current raw plan.json bytes');
  }

  const expectedGeneratedSourceHash = await generatedSourceFingerprint();
  const claimGeneratedSourceHash = requireString(
    claim,
    'generatedSourceHash',
    '.browser-check-run.json',
  );
  if (claimGeneratedSourceHash && !FINGERPRINT_PATTERN.test(claimGeneratedSourceHash)) {
    addError(
      '.browser-check-run.json.generatedSourceHash',
      'must be a lowercase sha256 fingerprint',
    );
  }
  if (
    claimGeneratedSourceHash &&
    expectedGeneratedSourceHash &&
    claimGeneratedSourceHash !== expectedGeneratedSourceHash
  ) {
    addError(
      '.browser-check-run.json.generatedSourceHash',
      'must match the current generated temporary check sources',
    );
  }

  const claimPlanRevision = requireClaimRevision(
    claim.planRevision,
    '.browser-check-run.json.planRevision',
  );
  const claimPreflightRevision = requireClaimRevision(
    claim.preflightRevision,
    '.browser-check-run.json.preflightRevision',
  );
  for (const { label, revision } of [
    { label: 'planRevision', revision: claimPlanRevision },
    { label: 'preflightRevision', revision: claimPreflightRevision },
  ]) {
    if (!revisionsEqual(revision, planRevision)) {
      addError(`.browser-check-run.json.${label}`, 'must equal plan.json.revision');
    }
    if (currentRevision && !revisionsEqual(revision, currentRevision)) {
      addError(`.browser-check-run.json.${label}`, 'must equal the current Git revision');
    }
  }

  const claimRuntime = validateBrowserRuntime(
    claim.runtime,
    '.browser-check-run.json.runtime',
    canonicalPlanBaseUrl,
    plannedUseAuthState,
    planEnvironmentValues,
  );

  const claimedAt = canonicalIsoTimestamp(claim.claimedAt, '.browser-check-run.json.claimedAt');
  if (requiresPostflight && !isRecord(claim.postflight)) {
    addError(
      '.browser-check-run.json.postflight',
      'is required when Playwright report or evidence exists',
    );
    return;
  }
  if (claim.postflight === undefined) {
    return;
  }
  if (!isRecord(claim.postflight)) {
    addError('.browser-check-run.json.postflight', 'must be an object when provided');
    return;
  }

  const postflight = claim.postflight;
  const completedAt = canonicalIsoTimestamp(
    postflight.completedAt,
    '.browser-check-run.json.postflight.completedAt',
  );
  if (claimedAt !== undefined && completedAt !== undefined && completedAt < claimedAt) {
    addError(
      '.browser-check-run.json.postflight.completedAt',
      'must not be earlier than claimedAt',
    );
  }

  const postflightPlanHash = requireString(
    postflight,
    'planHash',
    '.browser-check-run.json.postflight',
  );
  if (postflightPlanHash && postflightPlanHash !== expectedPlanHash) {
    addError(
      '.browser-check-run.json.postflight.planHash',
      'must match the current raw plan.json bytes',
    );
  }
  if (postflightPlanHash && claimPlanHash && postflightPlanHash !== claimPlanHash) {
    addError('.browser-check-run.json.postflight.planHash', 'must equal the preflight planHash');
  }

  const postflightGeneratedSourceHash = requireString(
    postflight,
    'generatedSourceHash',
    '.browser-check-run.json.postflight',
  );
  if (
    postflightGeneratedSourceHash &&
    expectedGeneratedSourceHash &&
    postflightGeneratedSourceHash !== expectedGeneratedSourceHash
  ) {
    addError(
      '.browser-check-run.json.postflight.generatedSourceHash',
      'must match the current generated temporary check sources',
    );
  }
  if (
    postflightGeneratedSourceHash &&
    claimGeneratedSourceHash &&
    postflightGeneratedSourceHash !== claimGeneratedSourceHash
  ) {
    addError(
      '.browser-check-run.json.postflight.generatedSourceHash',
      'must equal the preflight generatedSourceHash',
    );
  }

  const postflightRevision = requireClaimRevision(
    postflight.revision,
    '.browser-check-run.json.postflight.revision',
  );
  if (!revisionsEqual(postflightRevision, planRevision)) {
    addError('.browser-check-run.json.postflight.revision', 'must equal plan.json.revision');
  }
  if (currentRevision && !revisionsEqual(postflightRevision, currentRevision)) {
    addError('.browser-check-run.json.postflight.revision', 'must equal the current Git revision');
  }

  const postflightRuntime = validateBrowserRuntime(
    postflight.runtime,
    '.browser-check-run.json.postflight.runtime',
    canonicalPlanBaseUrl,
    plannedUseAuthState,
    planEnvironmentValues,
  );
  if (
    postflightRuntime.baseUrl &&
    claimRuntime.baseUrl &&
    postflightRuntime.baseUrl !== claimRuntime.baseUrl
  ) {
    addError(
      '.browser-check-run.json.postflight.runtime.baseUrl',
      'must equal the preflight runtime baseUrl',
    );
  }
  for (const key of ['browser', 'locale', 'timezone', 'authStateHash']) {
    if (postflightRuntime[key] !== claimRuntime[key]) {
      addError(
        `.browser-check-run.json.postflight.runtime.${key}`,
        `must equal the preflight runtime ${key}`,
      );
    }
  }
  if (
    postflightRuntime.useAuthState !== undefined &&
    claimRuntime.useAuthState !== undefined &&
    postflightRuntime.useAuthState !== claimRuntime.useAuthState
  ) {
    addError(
      '.browser-check-run.json.postflight.runtime.useAuthState',
      'must equal the preflight runtime useAuthState',
    );
  }

  const playwrightExitCode = postflight.playwrightExitCode;
  if (!Number.isInteger(playwrightExitCode) || playwrightExitCode < 0) {
    addError(
      '.browser-check-run.json.postflight.playwrightExitCode',
      'must be a non-negative integer',
    );
    return;
  }

  const executedStatuses = temporaryResultRecords
    .map(([, resultRecord]) => resultRecord.status)
    .filter((status) => ['pass', 'fail', 'blocked'].includes(status));
  if (executedStatuses.length > 0 && executedStatuses.every((status) => status === 'pass')) {
    if (playwrightExitCode !== 0) {
      addError(
        '.browser-check-run.json.postflight.playwrightExitCode',
        'must equal 0 when every executed temporary check passed',
      );
    }
  } else if (executedStatuses.includes('fail') && playwrightExitCode === 0) {
    addError(
      '.browser-check-run.json.postflight.playwrightExitCode',
      'must be nonzero when a temporary check failed',
    );
  }

  if (hasPlaywrightReport) {
    playwrightResultsPromise ??= readJson('playwright-results.json');
    const playwrightResults = await playwrightResultsPromise;
    const reportHasFailure =
      (Array.isArray(playwrightResults.errors) && playwrightResults.errors.length > 0) ||
      (Number.isInteger(playwrightResults.stats?.unexpected) &&
        playwrightResults.stats.unexpected > 0);
    if (reportHasFailure && playwrightExitCode === 0) {
      addError(
        '.browser-check-run.json.postflight.playwrightExitCode',
        'must be nonzero when the Playwright report contains a root error or unexpected outcome',
      );
    }
  }
}

async function validateEvidenceFiles(evidencePaths, resultPath) {
  for (const [index, evidencePath] of evidencePaths.entries()) {
    const path = `${resultPath}.evidence[${index}]`;
    if (
      isAbsolute(evidencePath) ||
      evidencePath.includes('\\') ||
      !pathStaysInside(runDir, resolve(runDir, evidencePath))
    ) {
      addError(path, 'must be a run-relative path that stays inside the run directory');
      continue;
    }

    try {
      const realEvidencePath = await realpath(resolve(runDir, evidencePath));
      if (!pathStaysInside(realRunDir, realEvidencePath)) {
        addError(path, 'resolves outside the run directory');
        continue;
      }

      const evidenceStat = await stat(realEvidencePath);
      if (!evidenceStat.isFile()) {
        addError(path, 'must refer to a file');
      }
    } catch {
      addError(path, `referenced file does not exist: ${evidencePath}`);
    }
  }
}

let playwrightResultsPromise;
function collectPlaywrightSpecs(suites, suitesPath, specs = []) {
  if (!Array.isArray(suites)) {
    addError(suitesPath, 'must be an array');
    return specs;
  }

  suites.forEach((rawSuite, suiteIndex) => {
    const suitePath = `${suitesPath}[${suiteIndex}]`;
    const suite = requireRecord(rawSuite, suitePath);
    if (suite.specs !== undefined) {
      if (!Array.isArray(suite.specs)) {
        addError(`${suitePath}.specs`, 'must be an array');
      } else {
        suite.specs.forEach((rawSpec, specIndex) => {
          const specPath = `${suitePath}.specs[${specIndex}]`;
          specs.push({ spec: requireRecord(rawSpec, specPath), specPath });
        });
      }
    }
    if (suite.suites !== undefined) {
      collectPlaywrightSpecs(suite.suites, `${suitePath}.suites`, specs);
    }
  });

  return specs;
}

function computePlaywrightOutcome(expectedStatus, attemptStatuses) {
  let expected = 0;
  let unexpected = 0;
  let expectedSkipped = 0;

  for (const resultStatus of attemptStatuses) {
    if (resultStatus === 'interrupted') {
      continue;
    }
    if (resultStatus === 'skipped' && expectedStatus === 'skipped') {
      expectedSkipped += 1;
      continue;
    }
    if (resultStatus === 'skipped') {
      continue;
    }
    if (resultStatus === expectedStatus) {
      expected += 1;
    } else {
      unexpected += 1;
    }
  }

  if (expected === 0 && unexpected === 0) {
    return 'skipped';
  }
  if (unexpected === 0) {
    return 'expected';
  }
  if (expected === 0 && expectedSkipped === 0) {
    return 'unexpected';
  }

  return 'flaky';
}

function validatePlaywrightSpec(spec, specPath, outcomeCounts) {
  if (typeof spec.ok !== 'boolean') {
    addError(`${specPath}.ok`, 'must be a boolean');
  }
  if (!Array.isArray(spec.tests) || spec.tests.length === 0) {
    addError(`${specPath}.tests`, 'must be a non-empty array');
    return { fullyPassing: false, hasUnexpectedOutcome: false };
  }

  let fullyPassing = spec.ok === true;
  let hasUnexpectedOutcome = false;
  let derivedSpecOk = true;

  spec.tests.forEach((rawTest, testIndex) => {
    const testPath = `${specPath}.tests[${testIndex}]`;
    const playwrightTest = requireRecord(rawTest, testPath);
    const expectedStatus = requireEnum(
      playwrightTest.expectedStatus,
      PLAYWRIGHT_EXPECTED_STATUSES,
      `${testPath}.expectedStatus`,
    );
    const outcome = requireEnum(playwrightTest.status, PLAYWRIGHT_OUTCOMES, `${testPath}.status`);
    if (outcome) {
      outcomeCounts[outcome] += 1;
      if (outcome === 'unexpected') {
        hasUnexpectedOutcome = true;
        derivedSpecOk = false;
      }
    } else {
      derivedSpecOk = false;
    }

    if (!Array.isArray(playwrightTest.results)) {
      addError(`${testPath}.results`, 'must be an array');
      fullyPassing = false;
      return;
    }

    const attemptStatuses = [];
    playwrightTest.results.forEach((rawTestResult, resultIndex) => {
      const resultPath = `${testPath}.results[${resultIndex}]`;
      const testResult = requireRecord(rawTestResult, resultPath);
      const resultStatus = requireEnum(
        testResult.status,
        PLAYWRIGHT_RESULT_STATUSES,
        `${resultPath}.status`,
      );
      if (resultStatus) {
        attemptStatuses.push(resultStatus);
      }

      let errorCount = 0;
      if (!Array.isArray(testResult.errors)) {
        addError(`${resultPath}.errors`, 'must be an array');
      } else {
        errorCount = testResult.errors.length;
        testResult.errors.forEach((rawError, errorIndex) => {
          const errorPath = `${resultPath}.errors[${errorIndex}]`;
          const reportedError = requireRecord(rawError, errorPath);
          requireString(reportedError, 'message', errorPath);
        });
      }

      let hasPrimaryError = false;
      if (testResult.error !== undefined) {
        const primaryError = requireRecord(testResult.error, `${resultPath}.error`);
        hasPrimaryError = requireString(primaryError, 'message', `${resultPath}.error`) !== '';
      }
      const hasReportedError = hasPrimaryError || errorCount > 0;
      if (['passed', 'skipped'].includes(resultStatus) && hasReportedError) {
        addError(`${resultPath}`, `${resultStatus} attempts must not report errors`);
      }
      if (['failed', 'timedOut'].includes(resultStatus) && !hasReportedError) {
        addError(`${resultPath}`, `${resultStatus} attempts must report an error`);
      }
    });

    const computedOutcome = computePlaywrightOutcome(expectedStatus, attemptStatuses);
    if (outcome && expectedStatus && outcome !== computedOutcome) {
      addError(
        `${testPath}.status`,
        `${outcome} outcome contradicts the recorded attempts; Playwright derives ${computedOutcome}`,
      );
    }

    const testIsFullyPassing =
      expectedStatus === 'passed' &&
      outcome === 'expected' &&
      attemptStatuses.length > 0 &&
      attemptStatuses.every((status) => status === 'passed') &&
      playwrightTest.results.every(
        (testResult) =>
          isRecord(testResult) &&
          testResult.error === undefined &&
          Array.isArray(testResult.errors) &&
          testResult.errors.length === 0,
      );
    fullyPassing &&= testIsFullyPassing;
  });

  if (typeof spec.ok === 'boolean' && spec.ok !== derivedSpecOk) {
    addError(`${specPath}.ok`, `must equal ${derivedSpecOk}, as derived from test outcomes`);
  }

  return { fullyPassing, hasUnexpectedOutcome };
}

async function validatePlaywrightReport(plannedChecks, resultRecords) {
  playwrightResultsPromise ??= readJson('playwright-results.json');
  const playwrightResults = await playwrightResultsPromise;
  const temporaryCheckIds = new Set(
    [...plannedChecks]
      .filter(([, check]) => check.driver === 'playwright-temporary')
      .map(([checkId]) => checkId),
  );
  if (temporaryCheckIds.size === 0) {
    addError(
      'playwright-results.json',
      'must not exist without a planned playwright-temporary check',
    );
  }
  const specs = collectPlaywrightSpecs(playwrightResults.suites, 'playwright-results.json.suites');
  const specCounts = new Map([...temporaryCheckIds].map((checkId) => [checkId, 0]));
  const outcomeCounts = Object.fromEntries([...PLAYWRIGHT_OUTCOMES].map((outcome) => [outcome, 0]));

  for (const { spec, specPath } of specs) {
    const { fullyPassing, hasUnexpectedOutcome } = validatePlaywrightSpec(
      spec,
      specPath,
      outcomeCounts,
    );
    const title = typeof spec.title === 'string' ? spec.title : '';
    const mentionedCheckIds = [...checkIdTokens(title)];
    if (mentionedCheckIds.length !== 1 || !temporaryCheckIds.has(mentionedCheckIds[0])) {
      addError(
        specPath,
        'must contain exactly one bounded planned playwright-temporary check ID token',
      );
      continue;
    }

    const checkId = mentionedCheckIds[0];
    specCounts.set(checkId, (specCounts.get(checkId) ?? 0) + 1);
    const resultRecord = resultRecords.get(checkId);
    if (!resultRecord) {
      addError(specPath, `has no result.json record for ${checkId}`);
      continue;
    }

    if (resultRecord.status === 'pass' && !fullyPassing) {
      addError(specPath, `must be fully passed for result ${checkId}`);
    } else if (resultRecord.status === 'fail' && !hasUnexpectedOutcome) {
      addError(specPath, `must contain an unexpected outcome for failed result ${checkId}`);
    } else if (resultRecord.status === 'blocked' && fullyPassing) {
      addError(specPath, `must not be fully passed for blocked result ${checkId}`);
    } else if (resultRecord.status === 'not_run') {
      addError(specPath, `must not exist for not-run result ${checkId}`);
    }
  }

  const rootErrors = playwrightResults.errors;
  const rootErrorCounts = new Map([...temporaryCheckIds].map((checkId) => [checkId, 0]));
  if (!Array.isArray(rootErrors)) {
    addError('playwright-results.json.errors', 'must be an array');
  } else {
    rootErrors.forEach((rawRootError, errorIndex) => {
      const errorPath = `playwright-results.json.errors[${errorIndex}]`;
      const rootError = requireRecord(rawRootError, errorPath);
      requireString(rootError, 'message', errorPath);
      const mentionedCheckIds = [...playwrightErrorCheckIdTokens(rootError, errorPath)];
      if (mentionedCheckIds.length !== 1 || !temporaryCheckIds.has(mentionedCheckIds[0])) {
        addError(
          errorPath,
          'must contain exactly one bounded planned playwright-temporary check ID token',
        );
        return;
      }

      const checkId = mentionedCheckIds[0];
      if (resultRecords.get(checkId)?.status !== 'blocked') {
        addError(errorPath, `must map to a blocked result for ${checkId}`);
        return;
      }
      rootErrorCounts.set(checkId, (rootErrorCounts.get(checkId) ?? 0) + 1);
    });
  }

  for (const checkId of temporaryCheckIds) {
    const resultRecord = resultRecords.get(checkId);
    const specCount = specCounts.get(checkId) ?? 0;
    const rootErrorCount = rootErrorCounts.get(checkId) ?? 0;
    const citesReport =
      Array.isArray(resultRecord?.evidence) &&
      resultRecord.evidence.includes('playwright-results.json');
    if (specCount > 1) {
      addError('playwright-results.json', `must contain at most one leaf spec for ${checkId}`);
    }
    if (resultRecord && ['pass', 'fail'].includes(resultRecord.status) && specCount !== 1) {
      addError(
        'playwright-results.json',
        `must contain exactly one leaf spec for executed result ${checkId}`,
      );
    }
    if (resultRecord?.status === 'not_run' && specCount !== 0) {
      addError('playwright-results.json', `must not contain a leaf spec for ${checkId}`);
    }
    if (resultRecord?.status === 'blocked' && specCount === 0 && rootErrorCount === 0) {
      addError(
        'playwright-results.json',
        `must contain a leaf spec or attributed root error for blocked result ${checkId}`,
      );
    }
    if (!citesReport && (specCount > 0 || rootErrorCount > 0)) {
      addError(
        `result.json.results.${checkId}.evidence`,
        'must cite playwright-results.json when the report contains evidence for this check',
      );
    }
  }

  const stats = requireRecord(playwrightResults.stats, 'playwright-results.json.stats');
  for (const outcome of PLAYWRIGHT_OUTCOMES) {
    if (!Number.isInteger(stats[outcome]) || stats[outcome] < 0) {
      addError(`playwright-results.json.stats.${outcome}`, 'must be a non-negative integer');
    } else if (stats[outcome] !== outcomeCounts[outcome]) {
      addError(
        `playwright-results.json.stats.${outcome}`,
        `must equal ${outcomeCounts[outcome]}, the ${outcome} test count derived from leaf specs`,
      );
    }
  }
}

const [
  rawPlan,
  rawResult,
  issuesMarkdown,
  planSource,
  playwrightResultsExists,
  browserClaimExists,
] = await Promise.all([
  readJson('plan.json'),
  readJson('result.json'),
  readRunFile('issues.md'),
  readRunFile('plan.json'),
  runFileExists('playwright-results.json'),
  runFileExists('.browser-check-run.json'),
]);
const projectionFiles = ['plan.md', 'result.md', 'review.md', 'promotion.md'];
const projectionSources = await Promise.all(
  projectionFiles.map((filename) => readRunFile(filename)),
);
const projections = Object.fromEntries([
  ...projectionFiles.map((filename, index) => [filename, projectionSources[index]]),
  ['issues.md', issuesMarkdown],
]);
function indentationColumns(value) {
  let columns = 0;
  for (const character of value) {
    columns = character === '\t' ? columns + (4 - (columns % 4)) : columns + 1;
  }
  return columns;
}

function parseFenceOpening(value) {
  const match = /^([ \t]*)(`{3,}|~{3,})(.*)$/.exec(value);
  if (!match || indentationColumns(match[1]) > 3) {
    return undefined;
  }

  return { token: match[2], info: match[3] };
}

function isFenceClosing(value, fenceCharacter, fenceLength) {
  const match = /^([ \t]*)(`+|~+)[ \t]*\r?$/.exec(value);

  return (
    match !== null &&
    indentationColumns(match[1]) <= 3 &&
    match[2][0] === fenceCharacter &&
    match[2].length >= fenceLength
  );
}

function stripFencedCodeBlocks(source) {
  const visibleLines = [];
  let fenceCharacter = '';
  let fenceLength = 0;

  for (const line of source.split('\n')) {
    if (fenceCharacter) {
      if (isFenceClosing(line, fenceCharacter, fenceLength)) {
        fenceCharacter = '';
        fenceLength = 0;
      }
      visibleLines.push('');
      continue;
    }

    const fenceMatch = parseFenceOpening(line);
    if (fenceMatch) {
      if (fenceMatch.token[0] === '`' && fenceMatch.info.includes('`')) {
        visibleLines.push('');
        continue;
      }
      fenceCharacter = fenceMatch.token[0];
      fenceLength = fenceMatch.token.length;
      visibleLines.push('');
      continue;
    }

    const indentation = /^([ \t]+)/.exec(line);
    const isIndented = indentation && indentationColumns(indentation[1]) > 0;
    const isBlockQuote = /^[ \t]{0,3}>/.test(line);
    const isFenceLike = /`{3,}|~{3,}/.test(line);
    if (isIndented || isBlockQuote || isFenceLike) {
      visibleLines.push('');
      continue;
    }

    visibleLines.push(line);
  }

  return visibleLines.join('\n');
}
const structuralProjections = Object.fromEntries(
  Object.entries(projections).map(([filename, source]) => [
    filename,
    stripFencedCodeBlocks(source),
  ]),
);
projectionFiles.forEach((filename) => {
  if (structuralProjections[filename].trim() === '') {
    addError(filename, 'must contain content outside fenced code blocks');
  }
});
if (structuralProjections['issues.md'].trim() === '') {
  addError('issues.md', 'must contain content outside fenced code blocks');
}
const plan = requireRecord(rawPlan, 'plan.json');
const result = requireRecord(rawResult, 'result.json');

if (plan.schemaVersion !== '1.0') {
  addError('plan.json.schemaVersion', 'must equal "1.0"');
}

const change = requireRecord(plan.change, 'plan.json.change');
const changeId = requireString(change, 'id', 'plan.json.change');
const baseRef = requireString(change, 'baseRef', 'plan.json.change');
for (const key of ['title', 'source', 'headRef', 'summary']) {
  requireString(change, key, 'plan.json.change');
}
if (changeId && !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(changeId)) {
  addError('plan.json.change.id', 'must contain only ASCII letters, digits, and single hyphens');
}
if (changeId && basename(dirname(runDir)) !== changeId) {
  addError(
    'plan.json.change.id',
    `must equal run directory change ID ${basename(dirname(runDir))}`,
  );
}

const planRevision = requireRecord(plan.revision, 'plan.json.revision');
const baseSha = requireString(planRevision, 'baseSha', 'plan.json.revision');
const headSha = requireString(planRevision, 'headSha', 'plan.json.revision');
const worktreeFingerprint = requireString(
  planRevision,
  'worktreeFingerprint',
  'plan.json.revision',
);
for (const [key, value] of [
  ['baseSha', baseSha],
  ['headSha', headSha],
]) {
  if (value && !/^[0-9a-f]{40}$/.test(value)) {
    addError(`plan.json.revision.${key}`, 'must be a lowercase 40-character Git SHA');
  }
}
if (worktreeFingerprint && !/^sha256:[0-9a-f]{64}$/.test(worktreeFingerprint)) {
  addError(
    'plan.json.revision.worktreeFingerprint',
    'must use sha256 followed by a lowercase 64-character digest',
  );
}

let currentRevision;
try {
  currentRevision = revisionSnapshot(baseRef);
  if (baseSha && baseSha !== currentRevision.baseSha) {
    addError(
      'plan.json.revision.baseSha',
      `base ref ${baseRef} resolves to ${currentRevision.baseSha}`,
    );
  }
  if (headSha && headSha !== currentRevision.headSha) {
    addError('plan.json.revision.headSha', `current HEAD is ${currentRevision.headSha}`);
  }
  if (worktreeFingerprint && worktreeFingerprint !== currentRevision.worktreeFingerprint) {
    addError(
      'plan.json.revision.worktreeFingerprint',
      `current worktree fingerprint is ${currentRevision.worktreeFingerprint}`,
    );
  }
} catch (error) {
  addError(
    'plan.json.revision',
    `cannot resolve the base ref or fingerprint the current Git worktree: ${error.message}`,
  );
}

const planEnvironment = requireRecord(plan.environment, 'plan.json.environment');
const planEnvironmentValues = {};
for (const key of ['baseUrl', 'appEnvironment', 'browser', 'locale', 'timezone']) {
  planEnvironmentValues[key] = requireString(planEnvironment, key, 'plan.json.environment');
}
let plannedUseAuthState = false;
if (planEnvironment.useAuthState !== undefined) {
  if (typeof planEnvironment.useAuthState !== 'boolean') {
    addError('plan.json.environment.useAuthState', 'must be a boolean when provided');
  } else {
    plannedUseAuthState = planEnvironment.useAuthState;
  }
}
if (planEnvironment.timezone !== 'Asia/Tokyo') {
  addError('plan.json.environment.timezone', 'must equal Asia/Tokyo');
}

const scope = requireRecord(plan.scope, 'plan.json.scope');
const scopeAffectedFiles = requireStringArray(scope.affectedFiles, 'plan.json.scope.affectedFiles');
const scopeRoutes = requireStringArray(scope.routes, 'plan.json.scope.routes');
const existingTestCommands = requireStringArray(
  plan.existingTestCommands,
  'plan.json.existingTestCommands',
);
const planningContext = {};
for (const key of ['delegatedWork', 'unnecessaryChecks', 'assumptions', 'specificationGaps']) {
  planningContext[key] = requireStringArray(plan[key], `plan.json.${key}`);
}

const rawChecks = Array.isArray(plan.checks) ? plan.checks : [];
if (!Array.isArray(plan.checks)) {
  addError('plan.json.checks', 'must be an array');
} else if (plan.checks.length === 0) {
  addError(
    'plan.json.checks',
    'must contain at least one check; use a not-required row when analysis selects no execution',
  );
}

const plannedChecks = new Map();
const plannedExistingTestCommands = [];
rawChecks.forEach((rawCheck, index) => {
  const path = `plan.json.checks[${index}]`;
  const check = requireRecord(rawCheck, path);
  const id = requireString(check, 'id', path);

  if (id && !/^BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{3}$/.test(id)) {
    addError(`${path}.id`, 'must match BC-{normalized-change-id}-{three-digit-sequence}');
  }
  if (id && changeId) {
    const checkChangeId = id.slice(3, -4);
    const compactChangeId = changeId.replaceAll('-', '');
    if (checkChangeId !== changeId && checkChangeId !== compactChangeId) {
      addError(`${path}.id`, `must identify plan change ${changeId}`);
    }
  }
  if (plannedChecks.has(id)) {
    addError(`${path}.id`, `duplicates planned check ID ${id}`);
  } else if (id) {
    plannedChecks.set(id, check);
  }

  for (const key of ['title', 'risk']) {
    requireString(check, key, path);
  }
  requireEnum(check.priority, PRIORITIES, `${path}.priority`);
  const responsibility = requireEnum(
    check.responsibility,
    RESPONSIBILITIES,
    `${path}.responsibility`,
  );
  const lifecycle = requireEnum(check.lifecycle, LIFECYCLES, `${path}.lifecycle`);
  const driver = requireEnum(check.driver, DRIVERS, `${path}.driver`);
  const evaluationMode = requireEnum(
    check.evaluationMode,
    EVALUATION_MODES,
    `${path}.evaluationMode`,
  );
  if (check.evidenceWaiverReason !== undefined) {
    requireString(check, 'evidenceWaiverReason', path);
    if (driver !== 'human') {
      addError(`${path}.evidenceWaiverReason`, 'is allowed only for human checks');
    }
  }
  if (
    driver &&
    ['agent-browser', 'playwright-temporary', 'human'].includes(driver) &&
    responsibility !== 'browser'
  ) {
    addError(`${path}.responsibility`, `${driver} requires browser responsibility`);
  }
  if (driver === 'existing-test' && lifecycle !== 'regression') {
    addError(`${path}.lifecycle`, 'existing-test requires regression lifecycle');
  }
  if (driver === 'agent-browser' && lifecycle !== 'change-only' && lifecycle !== 'exploratory') {
    addError(`${path}.lifecycle`, 'agent-browser requires change-only or exploratory lifecycle');
  }
  if (driver === 'playwright-temporary' && lifecycle !== 'change-only') {
    addError(`${path}.lifecycle`, 'playwright-temporary requires change-only lifecycle');
  }
  if (driver === 'playwright-temporary' && evaluationMode !== 'objective') {
    addError(`${path}.evaluationMode`, 'playwright-temporary requires objective evaluation');
  }
  if (driver === 'human' && lifecycle !== 'human-only') {
    addError(`${path}.lifecycle`, 'human driver requires human-only lifecycle');
  }
  if ((driver === 'not-required') !== (evaluationMode === 'not-required')) {
    addError(
      `${path}.evaluationMode`,
      'not-required driver and not-required evaluation mode must be used together',
    );
  }
  if (
    evaluationMode === 'observation' &&
    lifecycle !== 'exploratory' &&
    lifecycle !== 'human-only'
  ) {
    addError(
      `${path}.lifecycle`,
      'observation evaluation mode requires exploratory or human-only lifecycle',
    );
  }

  if (check.status !== 'planned') {
    addError(`${path}.status`, 'must equal "planned"');
  }
  if (typeof check.promotionCandidate !== 'boolean') {
    addError(`${path}.promotionCandidate`, 'must be a boolean');
  }

  const target = requireRecord(check.target, `${path}.target`);
  if (responsibility === 'browser' && evaluationMode !== 'not-required') {
    requireString(target, 'url', `${path}.target`);
  } else if (target.url !== undefined) {
    requireString(target, 'url', `${path}.target`);
  }
  requireStringArray(target.files, `${path}.target.files`);
  if (driver === 'existing-test') {
    const command = requireString(target, 'command', `${path}.target`);
    if (command) {
      plannedExistingTestCommands.push(command);
    }
  } else if (target.command !== undefined) {
    addError(`${path}.target.command`, 'is allowed only for existing-test checks');
  }
  requireStringArray(check.preconditions, `${path}.preconditions`);
  requireStringArray(check.steps, `${path}.steps`);
  const expectedResults = requireStringArray(check.expectedResults, `${path}.expectedResults`);
  const requiredEvidence = requireStringArray(check.evidence, `${path}.evidence`);

  if (evaluationMode === 'objective' && expectedResults.length === 0) {
    addError(`${path}.expectedResults`, 'must contain an objective expectation');
  }
  if (evaluationMode !== 'not-required' && requiredEvidence.length === 0) {
    addError(`${path}.evidence`, 'must declare required evidence');
  }
});

const hasTemporaryPlaywrightCheck = [...plannedChecks.values()].some(
  (check) => check.driver === 'playwright-temporary',
);
const hasAutomatedBrowserCheck = [...plannedChecks.values()].some(
  (check) =>
    check.responsibility === 'browser' && !['human', 'not-required'].includes(check.driver),
);
if (hasTemporaryPlaywrightCheck) {
  if (planEnvironmentValues.browser !== 'chromium') {
    addError(
      'plan.json.environment.browser',
      'playwright-temporary checks require the chromium browser',
    );
  }
  if (planEnvironmentValues.locale !== 'ja-JP') {
    addError(
      'plan.json.environment.locale',
      'playwright-temporary checks require the ja-JP locale',
    );
  }
}
if (
  hasAutomatedBrowserCheck &&
  ['prod', 'production', 'live'].includes(planEnvironmentValues.appEnvironment.trim().toLowerCase())
) {
  addError(
    'plan.json.environment.appEnvironment',
    'automated browser checks must not target a production environment',
  );
}
const canonicalPlanBaseUrl = planEnvironmentValues.baseUrl
  ? canonicalBrowserBaseUrl(
      planEnvironmentValues.baseUrl,
      'plan.json.environment.baseUrl',
      hasTemporaryPlaywrightCheck,
    )
  : '';
if (canonicalPlanBaseUrl) {
  const plannedOrigin = new URL(canonicalPlanBaseUrl).origin;
  for (const [checkId, check] of plannedChecks) {
    if (check.responsibility !== 'browser' || check.evaluationMode === 'not-required') {
      continue;
    }
    const targetUrl = check.target?.url;
    if (typeof targetUrl !== 'string' || targetUrl.trim() === '') {
      continue;
    }
    try {
      const resolvedTargetUrl = new URL(targetUrl, canonicalPlanBaseUrl);
      if (resolvedTargetUrl.username || resolvedTargetUrl.password) {
        addError(`plan.json.checks.${checkId}.target.url`, 'must not contain credentials');
      }
      if (resolvedTargetUrl.origin !== plannedOrigin) {
        addError(
          `plan.json.checks.${checkId}.target.url`,
          `must stay on the planned origin ${plannedOrigin}`,
        );
      }
    } catch {
      addError(`plan.json.checks.${checkId}.target.url`, 'must be a valid URL or relative path');
    }
  }
}

const existingCommandSet = new Set(existingTestCommands);
if (existingCommandSet.size !== existingTestCommands.length) {
  addError('plan.json.existingTestCommands', 'must not contain duplicate commands');
}
const plannedExistingCommandSet = new Set(plannedExistingTestCommands);
if (plannedExistingCommandSet.size !== plannedExistingTestCommands.length) {
  addError('plan.json.checks', 'existing-test target commands must be unique');
}
for (const command of existingCommandSet) {
  if (!plannedExistingCommandSet.has(command)) {
    addError('plan.json.existingTestCommands', `has no matching existing-test check: ${command}`);
  }
}
for (const command of plannedExistingCommandSet) {
  if (!existingCommandSet.has(command)) {
    addError('plan.json.checks', `existing-test command is missing from plan context: ${command}`);
  }
}

if (result.schemaVersion !== '1.0') {
  addError('result.json.schemaVersion', 'must equal "1.0"');
}

const resultRevision = requireRecord(result.revision, 'result.json.revision');
for (const key of ['baseSha', 'headSha', 'worktreeFingerprint']) {
  const value = requireString(resultRevision, key, 'result.json.revision');
  if (value && planRevision[key] && value !== planRevision[key]) {
    addError(`result.json.revision.${key}`, `must equal plan revision ${planRevision[key]}`);
  }
}

const resultChangeId = requireString(result, 'changeId', 'result.json');
const runId = requireString(result, 'runId', 'result.json');
if (changeId && resultChangeId && resultChangeId !== changeId) {
  addError('result.json.changeId', `must equal plan change ID ${changeId}`);
}
if (runId && !runIdIsValid(runId)) {
  addError('result.json.runId', 'must be a valid Asia/Tokyo calendar time in yyyyMMddHHmmss');
}
if (runId && runId !== basename(runDir)) {
  addError('result.json.runId', `must equal run directory name ${basename(runDir)}`);
}

const timestamps = {};
for (const key of ['startedAt', 'completedAt']) {
  const value = requireString(result, key, 'result.json');
  const parsedTimestamp = value ? parseJstTimestamp(value) : undefined;
  if (value && parsedTimestamp === undefined) {
    addError(
      `result.json.${key}`,
      'must be a valid ISO-8601 timestamp with the Asia/Tokyo +09:00 offset',
    );
  } else if (parsedTimestamp !== undefined) {
    timestamps[key] = parsedTimestamp;
  }
}
if (
  timestamps.startedAt !== undefined &&
  timestamps.completedAt !== undefined &&
  timestamps.completedAt < timestamps.startedAt
) {
  addError('result.json.completedAt', 'must not be earlier than startedAt');
}

const summary = requireRecord(result.summary, 'result.json.summary');
for (const summaryKey of Object.values(SUMMARY_KEYS)) {
  const value = summary[summaryKey];
  if (!Number.isInteger(value) || value < 0) {
    addError(`result.json.summary.${summaryKey}`, 'must be a non-negative integer');
  }
}

const evidenceValidationTasks = [];
const rawIssueRecords = Array.isArray(result.issueRecords) ? result.issueRecords : [];
if (!Array.isArray(result.issueRecords)) {
  addError('result.json.issueRecords', 'must be an array');
}

const issueRecords = new Map();
rawIssueRecords.forEach((rawIssueRecord, index) => {
  const path = `result.json.issueRecords[${index}]`;
  const issueRecord = requireRecord(rawIssueRecord, path);
  const id = requireString(issueRecord, 'id', path);
  const checkId = requireString(issueRecord, 'checkId', path);
  const classification = requireEnum(
    issueRecord.classification,
    ISSUE_CLASSIFICATIONS,
    `${path}.classification`,
  );
  const priority = requireEnum(issueRecord.priority, PRIORITIES, `${path}.priority`);

  if (id && runId && !new RegExp(`^CVI-${runId}-\\d{3}$`).test(id)) {
    addError(`${path}.id`, `must match CVI-${runId}-{three-digit-sequence}`);
  }
  if (issueRecords.has(id)) {
    addError(`${path}.id`, `duplicates issue record ID ${id}`);
  } else if (id) {
    issueRecords.set(id, issueRecord);
  }
  if (checkId && !plannedChecks.has(checkId)) {
    addError(`${path}.checkId`, `does not exist in plan.json: ${checkId}`);
  }

  for (const key of ['expected', 'actual', 'disposition']) {
    requireString(issueRecord, key, path);
  }
  const reproduction = requireStringArray(issueRecord.reproduction, `${path}.reproduction`);
  if (reproduction.length === 0) {
    addError(`${path}.reproduction`, 'must contain at least one reproduction step');
  }
  const issueEvidence = requireStringArray(issueRecord.evidence, `${path}.evidence`);
  if (issueEvidence.length === 0) {
    addError(`${path}.evidence`, 'must contain at least one evidence file');
  } else {
    evidenceValidationTasks.push(validateEvidenceFiles(issueEvidence, path));
  }

  for (const [label, value] of [
    ['ID', id],
    ['check ID', checkId],
    ['classification', classification],
    ['priority', priority],
  ]) {
    if (value && !structuralProjections['issues.md'].includes(value)) {
      addError('issues.md', `must project issue ${label} ${value}`);
    }
  }
});

const rawResults = Array.isArray(result.results) ? result.results : [];
if (!Array.isArray(result.results)) {
  addError('result.json.results', 'must be an array');
}

const actualCounts = Object.fromEntries(Object.values(SUMMARY_KEYS).map((key) => [key, 0]));
const seenResultIds = new Set();
const resultRecords = new Map();
const referencedIssueCounts = new Map();

function evidenceHasExtension(evidencePaths, extensions) {
  return evidencePaths.some((evidencePath) => extensions.has(extname(evidencePath).toLowerCase()));
}

rawResults.forEach((rawCheckResult, index) => {
  const path = `result.json.results[${index}]`;
  const checkResult = requireRecord(rawCheckResult, path);
  const checkId = requireString(checkResult, 'checkId', path);

  if (seenResultIds.has(checkId)) {
    addError(`${path}.checkId`, `duplicates result check ID ${checkId}`);
  } else if (checkId) {
    seenResultIds.add(checkId);
    resultRecords.set(checkId, checkResult);
  }
  if (checkId && !plannedChecks.has(checkId)) {
    addError(`${path}.checkId`, `does not exist in plan.json: ${checkId}`);
  }

  const driver = requireEnum(checkResult.driver, DRIVERS, `${path}.driver`);
  const status = requireEnum(checkResult.status, STATUSES, `${path}.status`);
  requireString(checkResult, 'actualResult', path);

  const plannedDriver = plannedChecks.get(checkId)?.driver;
  const plannedEvaluationMode = plannedChecks.get(checkId)?.evaluationMode;
  if (driver && plannedDriver && driver !== plannedDriver) {
    addError(`${path}.driver`, `must equal planned driver ${plannedDriver}`);
  }
  if (driver === 'not-required' && status !== 'not_required') {
    addError(`${path}.status`, 'not-required driver requires not_required status');
  }
  if (status === 'not_required' && driver !== 'not-required') {
    addError(`${path}.driver`, 'not_required status requires not-required driver');
  }
  if (
    plannedEvaluationMode === 'objective' &&
    status &&
    !['pass', 'fail', 'blocked', 'not_run'].includes(status)
  ) {
    addError(`${path}.status`, 'objective evaluation requires pass, fail, blocked, or not_run');
  }
  if (
    plannedEvaluationMode === 'observation' &&
    status &&
    !['observation', 'blocked', 'not_run'].includes(status)
  ) {
    addError(`${path}.status`, 'observation evaluation requires observation, blocked, or not_run');
  }
  if (plannedEvaluationMode === 'not-required' && status !== 'not_required') {
    addError(`${path}.status`, 'not-required evaluation requires not_required status');
  }

  if (status) {
    actualCounts[SUMMARY_KEYS[status]] += 1;
  }

  const plannedResponsibility = plannedChecks.get(checkId)?.responsibility;
  if (
    plannedResponsibility === 'browser' &&
    plannedEvaluationMode !== 'not-required' &&
    ['pass', 'fail', 'observation'].includes(status)
  ) {
    const environment = requireRecord(checkResult.environment, `${path}.environment`);
    const resultBrowser = requireString(environment, 'browser', `${path}.environment`);
    requireString(environment, 'viewport', `${path}.environment`);
    const resultBaseUrl = requireString(environment, 'baseUrl', `${path}.environment`);
    if (
      resultBrowser &&
      planEnvironmentValues.browser &&
      resultBrowser !== planEnvironmentValues.browser
    ) {
      addError(
        `${path}.environment.browser`,
        `must equal planned browser ${planEnvironmentValues.browser}`,
      );
    }
    const canonicalResultBaseUrl = resultBaseUrl
      ? canonicalBrowserBaseUrl(
          resultBaseUrl,
          `${path}.environment.baseUrl`,
          driver === 'playwright-temporary',
        )
      : '';
    if (
      canonicalResultBaseUrl &&
      canonicalPlanBaseUrl &&
      canonicalResultBaseUrl !== canonicalPlanBaseUrl
    ) {
      addError(
        `${path}.environment.baseUrl`,
        `must equal planned base URL ${planEnvironmentValues.baseUrl}`,
      );
    }
  } else if (
    checkResult.environment !== undefined &&
    plannedResponsibility === 'browser' &&
    plannedEvaluationMode !== 'not-required'
  ) {
    requireRecord(checkResult.environment, `${path}.environment`);
  } else if (checkResult.environment !== undefined) {
    addError(`${path}.environment`, 'must be omitted for lower-level and not-required results');
  }

  const evidence = requireStringArray(checkResult.evidence, `${path}.evidence`);
  const issues = requireStringArray(checkResult.issues, `${path}.issues`);
  if (checkResult.executionNotes !== undefined) {
    requireStringArray(checkResult.executionNotes, `${path}.executionNotes`);
  }
  if (status === 'blocked' || status === 'not_run') {
    const blocker = requireRecord(checkResult.blocker, `${path}.blocker`);
    requireString(blocker, 'reason', `${path}.blocker`);
    requireString(blocker, 'nextAction', `${path}.blocker`);
  }

  let humanEvidenceWaiverReason = '';
  if (
    driver === 'existing-test' &&
    status === 'not_run' &&
    checkResult.testExecution !== undefined
  ) {
    addError(`${path}.testExecution`, 'must be omitted when the existing test was not run');
  }
  if (
    driver === 'existing-test' &&
    (status === 'pass' || status === 'fail' || checkResult.testExecution !== undefined)
  ) {
    const execution = requireRecord(checkResult.testExecution, `${path}.testExecution`);
    const command = requireString(execution, 'command', `${path}.testExecution`);
    requireString(execution, 'workingDirectory', `${path}.testExecution`);
    const selectedTests = requireStringArray(
      execution.selectedTests,
      `${path}.testExecution.selectedTests`,
    );
    requireString(execution, 'summary', `${path}.testExecution`);
    const plannedCommand = plannedChecks.get(checkId)?.target?.command;
    if (command && plannedCommand && command !== plannedCommand) {
      addError(`${path}.testExecution.command`, `must equal planned command ${plannedCommand}`);
    }
    if (selectedTests.length === 0) {
      addError(`${path}.testExecution.selectedTests`, 'must identify a file or filter');
    }
    if (!Number.isInteger(execution.exitCode)) {
      addError(`${path}.testExecution.exitCode`, 'must be an integer');
    }
    if (status === 'pass' && execution.exitCode !== 0) {
      addError(`${path}.testExecution.exitCode`, 'must equal 0 for pass');
    }
    if (status === 'fail' && execution.exitCode === 0) {
      addError(`${path}.testExecution.exitCode`, 'must be nonzero for fail');
    }
  }
  if (driver === 'human' && status === 'not_run' && checkResult.humanExecution !== undefined) {
    addError(`${path}.humanExecution`, 'must be omitted when human execution did not occur');
  }
  if (driver === 'human' && status !== 'not_run') {
    const humanExecution = requireRecord(checkResult.humanExecution, `${path}.humanExecution`);
    requireString(humanExecution, 'executor', `${path}.humanExecution`);
    const executedAt = requireString(humanExecution, 'executedAt', `${path}.humanExecution`);
    requireString(humanExecution, 'device', `${path}.humanExecution`);
    if (executedAt && parseJstTimestamp(executedAt) === undefined) {
      addError(
        `${path}.humanExecution.executedAt`,
        'must be a valid Asia/Tokyo ISO-8601 timestamp',
      );
    }
    if (humanExecution.evidenceWaiverReason !== undefined) {
      humanEvidenceWaiverReason = requireString(
        humanExecution,
        'evidenceWaiverReason',
        `${path}.humanExecution`,
      );
      if (!plannedChecks.get(checkId)?.evidenceWaiverReason) {
        addError(
          `${path}.humanExecution.evidenceWaiverReason`,
          'requires an explicit evidenceWaiverReason in the planned human check',
        );
      }
    }
  }

  if (
    status === 'pass' &&
    evidence.length === 0 &&
    driver !== 'existing-test' &&
    !humanEvidenceWaiverReason
  ) {
    addError(`${path}.evidence`, 'pass requires evidence or an allowed human evidence waiver');
  }
  if (
    driver === 'human' &&
    status !== 'not_run' &&
    evidence.length === 0 &&
    !humanEvidenceWaiverReason
  ) {
    addError(
      `${path}.evidence`,
      'a supplied human result requires evidence or an allowed evidence waiver',
    );
  }
  if (
    driver === 'playwright-temporary' &&
    ['pass', 'fail'].includes(status) &&
    !evidence.includes('playwright-results.json')
  ) {
    addError(
      `${path}.evidence`,
      'executed playwright-temporary results require playwright-results.json',
    );
  }
  if (status === 'pass' && driver === 'playwright-temporary') {
    if (!evidence.includes('playwright-results.json')) {
      addError(`${path}.evidence`, 'playwright-temporary pass requires playwright-results.json');
    }
    if (!evidence.some((evidencePath) => /(?:^|\/)trace\.zip$/.test(evidencePath))) {
      addError(`${path}.evidence`, 'playwright-temporary pass requires a trace.zip file');
    }
    const hasScreenshot = evidenceHasExtension(
      evidence,
      new Set(['.png', '.jpg', '.jpeg', '.webp']),
    );
    const hasAssertionRecord = evidence.some(
      (evidencePath) =>
        /(?:assertion|dom)/i.test(evidencePath) &&
        new Set(['.json', '.md', '.txt', '.html']).has(extname(evidencePath).toLowerCase()),
    );
    if (!hasScreenshot && !hasAssertionRecord) {
      addError(
        `${path}.evidence`,
        'playwright-temporary pass requires a screenshot or explicit assertion/DOM record',
      );
    }
  }
  if (status === 'pass' && driver === 'agent-browser') {
    const hasScreenshot = evidenceHasExtension(
      evidence,
      new Set(['.png', '.jpg', '.jpeg', '.webp']),
    );
    const hasDomRecord = evidence.some(
      (evidencePath) =>
        /dom/i.test(evidencePath) &&
        new Set(['.json', '.md', '.txt', '.html']).has(extname(evidencePath).toLowerCase()),
    );
    if (!hasScreenshot && !hasDomRecord) {
      addError(`${path}.evidence`, 'agent-browser pass requires a screenshot or DOM record');
    }
  }
  if (status === 'fail' && evidence.length === 0 && driver !== 'existing-test') {
    addError(`${path}.evidence`, 'fail requires at least one evidence file');
  }
  if (status === 'fail' && issues.length === 0) {
    addError(`${path}.issues`, 'fail requires at least one classified issue reference');
  }
  issues.forEach((issueId, issueIndex) => {
    const referenceCount = (referencedIssueCounts.get(issueId) ?? 0) + 1;
    referencedIssueCounts.set(issueId, referenceCount);
    if (referenceCount > 1) {
      addError(`${path}.issues[${issueIndex}]`, `duplicates issue reference ${issueId}`);
    }
    const issueRecord = issueRecords.get(issueId);
    if (!issueRecord) {
      addError(
        `${path}.issues[${issueIndex}]`,
        `does not exist in result.json.issueRecords: ${issueId}`,
      );
    } else if (issueRecord.checkId !== checkId) {
      addError(`${path}.issues[${issueIndex}]`, `belongs to check ${issueRecord.checkId}`);
    } else if (issueRecord.classification === 'product-defect' && status !== 'fail') {
      addError(
        `${path}.issues[${issueIndex}]`,
        'a product-defect issue requires the owning objective check to have fail status',
      );
    }
  });
  if (evidence.length > 0) {
    evidenceValidationTasks.push(validateEvidenceFiles(evidence, path));
  }
});

for (const issueId of issueRecords.keys()) {
  if (referencedIssueCounts.get(issueId) !== 1) {
    addError(
      'result.json.issueRecords',
      `issue record must be referenced exactly once: ${issueId}`,
    );
  }
}

const reportCitedByResult = rawResults.some(
  (checkResult) =>
    isRecord(checkResult) &&
    Array.isArray(checkResult.evidence) &&
    checkResult.evidence.includes('playwright-results.json'),
);
const temporaryResultRecords = [...resultRecords.entries()].filter(
  ([checkId]) => plannedChecks.get(checkId)?.driver === 'playwright-temporary',
);
const executedTemporaryResultRecords = temporaryResultRecords.filter(([, checkResult]) =>
  ['pass', 'fail', 'blocked'].includes(checkResult.status),
);
const temporaryEvidenceExists = temporaryResultRecords.some(
  ([, checkResult]) => Array.isArray(checkResult.evidence) && checkResult.evidence.length > 0,
);
const shouldValidatePlaywrightReport =
  playwrightResultsExists ||
  browserClaimExists ||
  reportCitedByResult ||
  executedTemporaryResultRecords.length > 0;
const requiresBrowserPostflight =
  playwrightResultsExists || reportCitedByResult || temporaryEvidenceExists;
const requiresBrowserClaim = shouldValidatePlaywrightReport || temporaryEvidenceExists;

if (shouldValidatePlaywrightReport) {
  evidenceValidationTasks.push(validatePlaywrightReport(plannedChecks, resultRecords));
}
if (playwrightResultsExists && !reportCitedByResult) {
  addError(
    'playwright-results.json',
    'must be cited by the corresponding playwright-temporary result evidence',
  );
}
if (requiresBrowserClaim && !browserClaimExists) {
  addError(
    '.browser-check-run.json',
    'is required for playwright-temporary execution artifacts and executed results',
  );
}
if (browserClaimExists) {
  evidenceValidationTasks.push(
    validateBrowserClaim({
      changeId,
      runId,
      planSource,
      planRevision,
      currentRevision,
      canonicalPlanBaseUrl,
      plannedUseAuthState,
      planEnvironmentValues,
      requiresPostflight: requiresBrowserPostflight,
      temporaryResultRecords,
      hasPlaywrightReport: playwrightResultsExists,
    }),
  );
}
if ((playwrightResultsExists || browserClaimExists) && temporaryResultRecords.length === 0) {
  addError(
    'result.json.results',
    'Playwright execution artifacts require a playwright-temporary result',
  );
}
for (const [checkId, checkResult] of temporaryResultRecords) {
  if (checkResult.status === 'not_run' && (playwrightResultsExists || browserClaimExists)) {
    addError(
      `result.json.results.${checkId}.status`,
      'not_run must not coexist with a Playwright report or execution claim',
    );
  }
}

for (const checkId of plannedChecks.keys()) {
  if (!seenResultIds.has(checkId)) {
    addError('result.json.results', `missing result for planned check ${checkId}`);
  }
}

for (const [summaryKey, actualCount] of Object.entries(actualCounts)) {
  if (summary[summaryKey] !== actualCount) {
    addError(
      `result.json.summary.${summaryKey}`,
      `must equal ${actualCount}, the count derived from results`,
    );
  }
}

function requireProjectionValue(filename, value, label) {
  if (
    value &&
    !structuralProjections[filename].includes(value) &&
    !structuralProjections[filename].includes(String(value).replaceAll('|', '\\|'))
  ) {
    addError(filename, `must project ${label}: ${value}`);
  }
}

function rejectUnknownIds(filename, pattern, allowedIds, label) {
  const projectedIds = new Set(structuralProjections[filename].match(pattern) ?? []);
  for (const projectedId of projectedIds) {
    if (!allowedIds.has(projectedId)) {
      addError(filename, `contains unknown ${label}: ${projectedId}`);
    }
  }
}

function markdownTableRows(filename) {
  return structuralProjections[filename]
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => {
      const cells = [];
      const source = line.trim();
      let cell = '';

      for (let index = 1; index < source.length; index += 1) {
        const character = source[index];
        if (character === '\\' && source[index + 1] === '|') {
          cell += '|';
          index += 1;
        } else if (character === '|') {
          const trimmedCell = cell.trim();
          cells.push(
            trimmedCell.startsWith('`') && trimmedCell.endsWith('`')
              ? trimmedCell.slice(1, -1)
              : trimmedCell,
          );
          cell = '';
        } else {
          cell += character;
        }
      }

      if (!source.endsWith('|')) {
        cells.push(cell.trim());
      }
      return cells;
    });
}

function markdownSection(filename, heading, followingHeadingPattern) {
  const source = structuralProjections[filename];
  const starts = source
    .split('\n')
    .map((line, index) => (line.trim() === heading ? index : -1))
    .filter((index) => index >= 0);
  if (starts.length !== 1) {
    addError(filename, `must contain exactly one ${heading} section`);
    return '';
  }

  const lines = source.split('\n');
  const nextHeading = lines.findIndex(
    (line, index) => index > starts[0] && followingHeadingPattern.test(line.trim()),
  );
  return lines.slice(starts[0], nextHeading === -1 ? lines.length : nextHeading).join('\n');
}

function checkSection(filename, checkId) {
  return markdownSection(filename, `### \`${checkId}\``, /^#{1,3}\s/);
}

for (const [key, value] of Object.entries(change)) {
  requireProjectionValue('plan.md', value, `change.${key}`);
}
for (const [key, value] of Object.entries(planRevision)) {
  requireProjectionValue('plan.md', value, `revision.${key}`);
}
for (const [key, value] of Object.entries(planEnvironment)) {
  requireProjectionValue('plan.md', value, `environment.${key}`);
}
for (const value of [...scopeAffectedFiles, ...scopeRoutes]) {
  requireProjectionValue('plan.md', value, 'scope value');
}
for (const command of existingTestCommands) {
  requireProjectionValue('plan.md', command, 'existing-test command');
}
for (const [key, heading] of [
  ['delegatedWork', '## Delegated Work'],
  ['unnecessaryChecks', '## Unnecessary Checks'],
  ['assumptions', '## Assumptions'],
  ['specificationGaps', '## Specification Gaps'],
]) {
  const contextSection = markdownSection('plan.md', heading, /^#{1,2}\s/);
  for (const value of planningContext[key]) {
    if (!contextSection.includes(value) && !contextSection.includes(value.replaceAll('|', '\\|'))) {
      addError('plan.md', `must project ${key} under ${heading}: ${value}`);
    }
  }
}
requireProjectionValue('result.md', resultChangeId, 'change ID');
requireProjectionValue('result.md', runId, 'run ID');
for (const [key, value] of Object.entries(resultRevision)) {
  requireProjectionValue('result.md', value, `revision.${key}`);
}
const eligiblePromotionCheckIds = new Set(
  [...plannedChecks]
    .filter(([, check]) => check.responsibility === 'browser' && check.lifecycle !== 'regression')
    .map(([checkId]) => checkId),
);
for (const cells of markdownTableRows('promotion.md')) {
  const projectedCheckId = cells[0];
  if (plannedChecks.has(projectedCheckId) && !eligiblePromotionCheckIds.has(projectedCheckId)) {
    addError(
      'promotion.md',
      `must not contain a recommendation row for ineligible check ${projectedCheckId}`,
    );
  }
}
for (const [checkId, check] of plannedChecks) {
  const expectedPlanRow = [
    checkId,
    check.title,
    check.priority,
    check.responsibility,
    check.lifecycle,
    check.driver,
    check.evaluationMode,
    check.risk,
    String(check.promotionCandidate),
    check.status,
  ];
  const matchingPlanRows = markdownTableRows('plan.md').filter((cells) => cells[0] === checkId);
  if (
    matchingPlanRows.length !== 1 ||
    expectedPlanRow.some((value, index) => matchingPlanRows[0]?.[index] !== value)
  ) {
    addError('plan.md', `must contain one exact classification row for ${checkId}`);
  }
  const planCheckSection = checkSection('plan.md', checkId);
  for (const value of [
    ...Object.values(check.target ?? {}),
    ...(Array.isArray(check.preconditions) ? check.preconditions : []),
    ...(Array.isArray(check.steps) ? check.steps : []),
    ...(Array.isArray(check.expectedResults) ? check.expectedResults : []),
    ...(Array.isArray(check.evidence) ? check.evidence : []),
  ]
    .flat()
    .filter((item) => typeof item === 'string')) {
    if (
      !planCheckSection.includes(value) &&
      !planCheckSection.includes(value.replaceAll('|', '\\|'))
    ) {
      addError('plan.md', `must project planned detail under ${checkId}: ${value}`);
    }
  }
  if (check.evidenceWaiverReason) {
    if (!planCheckSection.includes(check.evidenceWaiverReason)) {
      addError('plan.md', `must project waiver under ${checkId}`);
    }
  }
  requireProjectionValue('review.md', checkId, 'reviewed check ID');

  if (eligiblePromotionCheckIds.has(checkId)) {
    requireProjectionValue('promotion.md', checkId, 'promotion check ID');
    const recommendationValues = [
      'promote-now',
      'promote-if-repeated',
      'keep-change-only',
      'delegate-lower-level',
      'do-not-automate',
      'needs-specification',
    ];
    const matchingRows = markdownTableRows('promotion.md').filter((cells) => cells[0] === checkId);
    const hasExactPromotionShape =
      matchingRows.length === 1 &&
      matchingRows[0].length === 8 &&
      recommendationValues.includes(matchingRows[0][1]) &&
      matchingRows[0].every((cell) => cell !== '');
    if (!hasExactPromotionShape) {
      addError(
        'promotion.md',
        `must contain one complete eight-column recommendation row for browser check ${checkId}`,
      );
    }
  }
}
rawResults.forEach((checkResult) => {
  if (isRecord(checkResult)) {
    const expectedResultRow = [
      checkResult.checkId,
      checkResult.driver,
      checkResult.status,
      checkResult.actualResult,
    ];
    const matchingResultRows = markdownTableRows('result.md').filter(
      (cells) => cells[0] === checkResult.checkId,
    );
    if (
      matchingResultRows.length !== 1 ||
      expectedResultRow.some((value, index) => matchingResultRows[0]?.[index] !== value)
    ) {
      addError('result.md', `must contain one exact result row for ${checkResult.checkId}`);
    }
    const resultCheckSection = checkSection('result.md', checkResult.checkId);
    for (const value of [
      ...Object.values(checkResult.environment ?? {}),
      ...(Array.isArray(checkResult.evidence) ? checkResult.evidence : []),
      ...(Array.isArray(checkResult.issues) ? checkResult.issues : []),
      ...(Array.isArray(checkResult.executionNotes) ? checkResult.executionNotes : []),
      ...Object.values(checkResult.testExecution ?? {}).flat(),
      ...Object.values(checkResult.humanExecution ?? {}),
      ...Object.values(checkResult.blocker ?? {}),
    ]
      .filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
      .map(String)) {
      if (
        !resultCheckSection.includes(value) &&
        !resultCheckSection.includes(value.replaceAll('|', '\\|'))
      ) {
        addError('result.md', `must project result detail under ${checkResult.checkId}: ${value}`);
      }
    }
  }
});

const summaryProjection = `pass=${summary.pass}; fail=${summary.fail}; blocked=${summary.blocked}; notRun=${summary.notRun}; observation=${summary.observation}; notRequired=${summary.notRequired}`;
requireProjectionValue('result.md', `Summary counts: ${summaryProjection}`, 'summary counts');
requireProjectionValue(
  'review.md',
  `Corrected summary counts: ${summaryProjection}`,
  'corrected summary counts',
);

const allowedCheckIds = new Set(plannedChecks.keys());
for (const filename of projectionFiles) {
  rejectUnknownIds(
    filename,
    /(?<![A-Za-z0-9-])BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{3}(?![A-Za-z0-9-])/g,
    allowedCheckIds,
    'check ID',
  );
  rejectUnknownIds(
    filename,
    /(?<![A-Za-z0-9-])CVI-\d{14}-\d{3}(?![A-Za-z0-9-])/g,
    new Set(issueRecords.keys()),
    'issue ID',
  );
}
rejectUnknownIds(
  'issues.md',
  /(?<![A-Za-z0-9-])BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{3}(?![A-Za-z0-9-])/g,
  allowedCheckIds,
  'check ID',
);
rejectUnknownIds(
  'issues.md',
  /(?<![A-Za-z0-9-])CVI-\d{14}-\d{3}(?![A-Za-z0-9-])/g,
  new Set(issueRecords.keys()),
  'issue ID',
);

for (const issueRecord of issueRecords.values()) {
  for (const [key, value] of Object.entries(issueRecord)) {
    for (const projectedValue of Array.isArray(value) ? value : [value]) {
      requireProjectionValue('issues.md', projectedValue, `issue ${issueRecord.id} ${key}`);
    }
  }
}

const verdictMatches = [
  ...structuralProjections['review.md'].matchAll(
    /^## Verdict[ \t]*\r?\n(?:[ \t]*\r?\n)*`(pass|conditional-pass|fail|incomplete)`[ \t]*$/gm,
  ),
];
const verdictHeadingCount = (
  structuralProjections['review.md'].match(/^## Verdict(?:[ \t]|$)/gm) ?? []
).length;
if (verdictHeadingCount !== 1 || verdictMatches.length !== 1) {
  addError(
    'review.md',
    'must contain exactly one ## Verdict section followed by one backticked allowed verdict',
  );
} else {
  const verdict = verdictMatches[0][1];
  const unresolvedResults = rawResults.filter(
    (checkResult) => isRecord(checkResult) && ['blocked', 'not_run'].includes(checkResult.status),
  );
  const conditionalPassIsSupported = unresolvedResults.every((checkResult) => {
    const plannedCheck = plannedChecks.get(checkResult.checkId);
    return plannedCheck?.driver === 'human' || plannedCheck?.priority === 'P3';
  });
  if (summary.fail > 0 && verdict !== 'fail') {
    addError('review.md', 'verdict must be fail when one or more checks failed');
  } else if (
    summary.fail === 0 &&
    (summary.blocked > 0 || summary.notRun > 0) &&
    !['conditional-pass', 'incomplete'].includes(verdict)
  ) {
    addError(
      'review.md',
      'verdict must be conditional-pass or incomplete while blocked or not-run checks remain',
    );
  } else if (verdict === 'conditional-pass' && !conditionalPassIsSupported) {
    addError(
      'review.md',
      'conditional-pass permits only human or P3 blocked/not-run checks; use incomplete otherwise',
    );
  } else if (
    summary.fail === 0 &&
    summary.blocked === 0 &&
    summary.notRun === 0 &&
    verdict !== 'pass'
  ) {
    addError('review.md', 'verdict must be pass when no failed, blocked, or not-run checks remain');
  }
}

await Promise.all(evidenceValidationTasks);

if (errors.length > 0) {
  console.error(`Change-verification artifacts are invalid (${errors.length} error(s)):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Change-verification artifacts are valid: ${plannedChecks.size} check(s), run ${runId}.`,
);
