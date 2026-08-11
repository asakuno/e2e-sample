#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { frontendAssetsFingerprint } from './browser-check-assets.mjs';
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
const DELEGATED_WORK_TYPES = new Set([
  'unit-test',
  'feature-test',
  'component-test',
  'permanent-e2e',
  'other',
]);
const DELEGATED_WORK_STATUSES = new Set(['completed', 'blocked', 'not_run', 'not_required']);
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
const DELEGATED_WORK_ID_PATTERN_SOURCE =
  '(?<![A-Za-z0-9-])DW-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{3}(?![A-Za-z0-9-])';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;
const EXECUTION_ARTIFACT_ROOT_FILE = 'playwright-results.json';
const EXECUTION_ARTIFACT_ROOT_DIRECTORIES = [
  'artifacts',
  'playwright-report',
  'evidence/console',
  'evidence/network',
  'evidence/screenshots',
  'videos',
];
const ZIP_SIGNATURES = new Set(['504b0304', '504b0506', '504b0708']);
const FILE_READ_CHUNK_BYTES = 64 * 1024;
const MAX_STRUCTURED_FILE_BYTES = 16 * 1024 * 1024;
const workspaceRoot = await realpath(process.cwd());

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

async function streamRegularFile(
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
  let fileHandle;
  let descriptorAfterStat;
  let totalBytes = 0;
  try {
    fileHandle = await open(filePath, 'r');
    const descriptorBeforeStat = await fileHandle.stat();
    if (!regularFileStatsMatch(beforeStat, descriptorBeforeStat)) {
      throw new Error(`${label} changed before it could be read`);
    }
    const chunk = Buffer.allocUnsafe(FILE_READ_CHUNK_BYTES);
    while (true) {
      const { bytesRead } = await fileHandle.read(chunk, 0, chunk.byteLength, null);
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
    descriptorAfterStat = await fileHandle.stat();
  } finally {
    await fileHandle?.close();
  }

  const pathAfterStat = await lstat(filePath);
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

async function hashRegularFile(filePath, beforeStat, label) {
  const hash = createHash('sha256');
  const { prefix, size } = await streamRegularFile(
    filePath,
    beforeStat,
    label,
    (chunk) => hash.update(chunk),
    { capturePrefixBytes: 4 },
  );
  return { prefix, sha256: `sha256:${hash.digest('hex')}`, size };
}

async function readBoundedRegularFile(filePath, beforeStat, label, includeHash = false) {
  const chunks = [];
  const hash = includeHash ? createHash('sha256') : undefined;
  const { prefix, size } = await streamRegularFile(
    filePath,
    beforeStat,
    label,
    (chunk) => {
      chunks.push(Buffer.from(chunk));
      hash?.update(chunk);
    },
    { capturePrefixBytes: 4, maxBytes: MAX_STRUCTURED_FILE_BYTES },
  );
  return {
    contents: Buffer.concat(chunks, size),
    prefix,
    ...(hash ? { sha256: `sha256:${hash.digest('hex')}` } : {}),
  };
}

async function readRegularFilePrefix(filePath, beforeStat, label, byteCount = 4) {
  if (beforeStat.isSymbolicLink() || !beforeStat.isFile() || beforeStat.nlink !== 1) {
    throw new Error(`${label} must be a real, single-link regular file`);
  }
  const prefix = Buffer.alloc(Math.min(byteCount, beforeStat.size));
  let fileHandle;
  let descriptorAfterStat;
  let bytesRead = 0;
  try {
    fileHandle = await open(filePath, 'r');
    const descriptorBeforeStat = await fileHandle.stat();
    if (!regularFileStatsMatch(beforeStat, descriptorBeforeStat)) {
      throw new Error(`${label} changed before it could be inspected`);
    }
    if (prefix.byteLength > 0) {
      ({ bytesRead } = await fileHandle.read(prefix, 0, prefix.byteLength, 0));
    }
    descriptorAfterStat = await fileHandle.stat();
  } finally {
    await fileHandle?.close();
  }
  const pathAfterStat = await lstat(filePath);
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

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isStructurallyValidPng(contents) {
  if (
    contents.byteLength < 45 ||
    !contents.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  ) {
    return false;
  }
  let offset = 8;
  let chunkIndex = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  while (offset + 12 <= contents.byteLength) {
    const dataLength = contents.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + dataLength;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    if (nextOffset > contents.byteLength) {
      return false;
    }
    const type = contents.subarray(typeOffset, dataOffset).toString('ascii');
    if (!/^[A-Za-z]{4}$/.test(type)) {
      return false;
    }
    const expectedCrc = contents.readUInt32BE(crcOffset);
    if (crc32(contents.subarray(typeOffset, dataEnd)) !== expectedCrc) {
      return false;
    }
    if (type === 'IHDR') {
      if (chunkIndex !== 0 || sawHeader || dataLength !== 13) {
        return false;
      }
      sawHeader =
        contents.readUInt32BE(dataOffset) > 0 && contents.readUInt32BE(dataOffset + 4) > 0;
      if (!sawHeader) {
        return false;
      }
    } else if (type === 'IDAT') {
      if (!sawHeader || sawEnd || dataLength === 0) {
        return false;
      }
      sawImageData = true;
    } else if (type === 'IEND') {
      if (!sawHeader || !sawImageData || sawEnd || dataLength !== 0) {
        return false;
      }
      sawEnd = true;
      return nextOffset === contents.byteLength;
    }
    offset = nextOffset;
    chunkIndex += 1;
  }
  return false;
}

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
  if (requireLocalHost && parsedUrl.protocol !== 'http:') {
    addError(path, 'temporary browser execution must use http');
  }
  if (parsedUrl.username || parsedUrl.password) {
    addError(path, 'must not contain credentials');
  }
  if (parsedUrl.search || parsedUrl.hash) {
    addError(path, 'must not contain a query string or fragment');
  }

  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx-browser-check']);
  if (requireLocalHost && !allowedHosts.has(parsedUrl.hostname)) {
    addError(path, 'must target localhost, a loopback address, or Docker nginx-browser-check');
  }
  if (parsedUrl.hostname === 'nginx-browser-check') {
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

function requireExactKeys(record, allowedKeys, path) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      addError(`${path}.${key}`, 'is not an allowed key');
    }
  }
}

async function readRunFileData(filename, includeHash = false) {
  const path = resolve(runDir, filename);

  try {
    const pathStat = await lstat(path);
    if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
      addError(filename, 'must be a regular file with no symlink or hard-link aliases');
      return undefined;
    }
    const realFilePath = await realpath(path);
    if (!pathStaysInside(realRunDir, realFilePath)) {
      addError(filename, 'resolves outside the run directory');
      return undefined;
    }

    return await readBoundedRegularFile(realFilePath, pathStat, filename, includeHash);
  } catch (error) {
    addError(filename, `cannot be read: ${error.message}`);
    return undefined;
  }
}

async function readRunFileBytes(filename) {
  return (await readRunFileData(filename))?.contents;
}

async function readRunFile(filename) {
  return (await readRunFileBytes(filename))?.toString('utf8') ?? '';
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
    try {
      const realGeneratedCheck = await realpath(generatedCheck);
      if (!pathStaysInside(realRunDir, realGeneratedCheck)) {
        addError(
          '.browser-check-run.json.generatedSourceHash',
          'generated source must stay inside the run directory',
        );
        continue;
      }
      const generatedCheckStat = await lstat(realGeneratedCheck);
      if (
        generatedCheckStat.isSymbolicLink() ||
        !generatedCheckStat.isFile() ||
        generatedCheckStat.nlink !== 1
      ) {
        addError(
          '.browser-check-run.json.generatedSourceHash',
          `generated source must be a real, single-link regular file: ${relative(generatedDir, generatedCheck)}`,
        );
        continue;
      }
      fingerprint.update(relative(generatedDir, generatedCheck).split(sep).join('/'));
      fingerprint.update('\0');
      await streamRegularFile(
        realGeneratedCheck,
        generatedCheckStat,
        `generated source ${relative(generatedDir, generatedCheck)}`,
        (chunk) => fingerprint.update(chunk),
      );
      fingerprint.update('\0');
    } catch (error) {
      addError(
        '.browser-check-run.json.generatedSourceHash',
        `cannot read generated source ${relative(generatedDir, generatedCheck)}: ${error.message}`,
      );
      continue;
    }
  }

  return `sha256:${fingerprint.digest('hex')}`;
}

function validateBrowserRuntime(
  value,
  path,
  canonicalPlanBaseUrl,
  plannedUseAuthState,
  planEnvironmentValues,
  expectedDatabaseRuntime,
) {
  const runtime = requireRecord(value, path);
  const expectedKeys = new Set([
    'baseUrl',
    'appEnvironment',
    'databaseConnection',
    'databaseIdentifierHash',
    'browser',
    'locale',
    'timezone',
    'useAuthState',
    ...(plannedUseAuthState ? ['authStateHash'] : []),
    ...(expectedDatabaseRuntime.connection === 'mysql' ? ['dependenciesFingerprint'] : []),
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

  const appEnvironment = requireString(runtime, 'appEnvironment', path);
  if (appEnvironment && appEnvironment !== 'testing') {
    addError(`${path}.appEnvironment`, 'must equal testing');
  }
  if (
    appEnvironment &&
    planEnvironmentValues.appEnvironment &&
    appEnvironment !== planEnvironmentValues.appEnvironment
  ) {
    addError(`${path}.appEnvironment`, 'must match plan.environment.appEnvironment');
  }

  const databaseConnection = requireEnum(
    runtime.databaseConnection,
    new Set(['sqlite', 'mysql']),
    `${path}.databaseConnection`,
  );
  const databaseIdentifierHash = requireString(runtime, 'databaseIdentifierHash', path);
  if (databaseIdentifierHash && !FINGERPRINT_PATTERN.test(databaseIdentifierHash)) {
    addError(`${path}.databaseIdentifierHash`, 'must be a lowercase sha256 fingerprint');
  }
  if (
    databaseConnection &&
    expectedDatabaseRuntime.connection &&
    databaseConnection !== expectedDatabaseRuntime.connection
  ) {
    addError(
      `${path}.databaseConnection`,
      `must equal ${expectedDatabaseRuntime.connection} for the planned browser execution mode`,
    );
  }
  if (
    databaseIdentifierHash &&
    expectedDatabaseRuntime.identifierHash &&
    databaseIdentifierHash !== expectedDatabaseRuntime.identifierHash
  ) {
    addError(
      `${path}.databaseIdentifierHash`,
      'must match the database identity derived from the planned browser execution mode',
    );
  }
  let dependenciesFingerprint;
  if (expectedDatabaseRuntime.connection === 'mysql') {
    dependenciesFingerprint = requireString(runtime, 'dependenciesFingerprint', path);
    if (dependenciesFingerprint && !FINGERPRINT_PATTERN.test(dependenciesFingerprint)) {
      addError(`${path}.dependenciesFingerprint`, 'must be a lowercase sha256 fingerprint');
    }
  } else if (runtime.dependenciesFingerprint !== undefined) {
    addError(`${path}.dependenciesFingerprint`, 'must be omitted for host browser execution');
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
    appEnvironment,
    databaseConnection,
    databaseIdentifierHash,
    dependenciesFingerprint,
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
  expectedDatabaseRuntime,
  requiresPostflight,
  forbidsPostflight,
  temporaryResultRecords,
  hasPlaywrightReport,
  artifactManifestValidationPromise,
}) {
  try {
    const claimStat = await lstat(resolve(runDir, '.browser-check-run.json'));
    if (claimStat.isSymbolicLink() || !claimStat.isFile() || claimStat.nlink !== 1) {
      addError('.browser-check-run.json', 'must be a regular file with no link aliases');
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

  let expectedFrontendAssetsHash;
  try {
    const planUsesDockerAssets =
      typeof planEnvironmentValues.baseUrl === 'string' &&
      new URL(planEnvironmentValues.baseUrl).hostname === 'nginx-browser-check';
    const assetWorkspaceRoot = planUsesDockerAssets
      ? resolve(runDir, 'runtime/assets')
      : workspaceRoot;
    const claimedDependenciesFingerprint = planUsesDockerAssets
      ? claim.runtime?.dependenciesFingerprint
      : undefined;
    expectedFrontendAssetsHash = frontendAssetsFingerprint(
      assetWorkspaceRoot,
      planRevision,
      undefined,
      claimedDependenciesFingerprint,
    );
  } catch (error) {
    addError(
      '.browser-check-run.json.frontendAssetsHash',
      `cannot bind public/build: ${error.message}`,
    );
  }
  const claimFrontendAssetsHash = requireString(
    claim,
    'frontendAssetsHash',
    '.browser-check-run.json',
  );
  if (claimFrontendAssetsHash && !FINGERPRINT_PATTERN.test(claimFrontendAssetsHash)) {
    addError(
      '.browser-check-run.json.frontendAssetsHash',
      'must be a lowercase sha256 fingerprint',
    );
  }
  if (
    claimFrontendAssetsHash &&
    expectedFrontendAssetsHash &&
    claimFrontendAssetsHash !== expectedFrontendAssetsHash
  ) {
    addError(
      '.browser-check-run.json.frontendAssetsHash',
      'must match the current public/build tree',
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
    expectedDatabaseRuntime,
  );
  if (plannedUseAuthState) {
    await validateRunAuthStateFile(claimRuntime.authStateHash);
  }

  const claimedAt = canonicalIsoTimestamp(claim.claimedAt, '.browser-check-run.json.claimedAt');
  if (forbidsPostflight && claim.postflight !== undefined) {
    addError(
      '.browser-check-run.json.postflight',
      'must be omitted when a global pre-report execution error exists',
    );
    return;
  }
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

  const postflightFrontendAssetsHash = requireString(
    postflight,
    'frontendAssetsHash',
    '.browser-check-run.json.postflight',
  );
  if (postflightFrontendAssetsHash && !FINGERPRINT_PATTERN.test(postflightFrontendAssetsHash)) {
    addError(
      '.browser-check-run.json.postflight.frontendAssetsHash',
      'must be a lowercase sha256 fingerprint',
    );
  }
  if (
    postflightFrontendAssetsHash &&
    expectedFrontendAssetsHash &&
    postflightFrontendAssetsHash !== expectedFrontendAssetsHash
  ) {
    addError(
      '.browser-check-run.json.postflight.frontendAssetsHash',
      'must match the current public/build tree',
    );
  }
  if (
    postflightFrontendAssetsHash &&
    claimFrontendAssetsHash &&
    postflightFrontendAssetsHash !== claimFrontendAssetsHash
  ) {
    addError(
      '.browser-check-run.json.postflight.frontendAssetsHash',
      'must equal the preflight frontendAssetsHash',
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

  const artifactManifest = artifactManifestValidationPromise
    ? await artifactManifestValidationPromise
    : undefined;
  const executionArtifactManifestHash = requireString(
    postflight,
    'executionArtifactManifestHash',
    '.browser-check-run.json.postflight',
  );
  if (executionArtifactManifestHash && !FINGERPRINT_PATTERN.test(executionArtifactManifestHash)) {
    addError(
      '.browser-check-run.json.postflight.executionArtifactManifestHash',
      'must be a lowercase sha256 fingerprint',
    );
  }
  if (!artifactManifest) {
    addError(
      '.browser-check-run.json.postflight.executionArtifactManifestHash',
      'requires .browser-check-artifacts.json',
    );
  } else if (
    executionArtifactManifestHash &&
    artifactManifest.hash &&
    executionArtifactManifestHash !== artifactManifest.hash
  ) {
    addError(
      '.browser-check-run.json.postflight.executionArtifactManifestHash',
      'must match the exact raw .browser-check-artifacts.json bytes',
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
    expectedDatabaseRuntime,
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
  for (const key of [
    'appEnvironment',
    'databaseConnection',
    'databaseIdentifierHash',
    'dependenciesFingerprint',
    'browser',
    'locale',
    'timezone',
    'authStateHash',
  ]) {
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
      basename(evidencePath).toLowerCase().endsWith('.zip') ||
      evidencePath.toLowerCase().startsWith('traces/')
    ) {
      addError(path, 'ZIP evidence is prohibited because trace archives can contain session data');
      continue;
    }
    const allowedRoot =
      evidencePath === 'playwright-results.json' ||
      evidencePath === '.browser-check-execution-error.json' ||
      ['artifacts/', 'playwright-report/', 'evidence/', 'videos/'].some((root) =>
        evidencePath.startsWith(root),
      );
    if (!normalizedRunRelativePath(evidencePath) || !allowedRoot) {
      addError(path, 'must be a normalized path beneath an approved evidence root');
      continue;
    }

    try {
      const absoluteEvidencePath = resolve(runDir, evidencePath);
      const evidenceStat = await lstat(absoluteEvidencePath);
      if (evidenceStat.isSymbolicLink() || !evidenceStat.isFile() || evidenceStat.nlink !== 1) {
        addError(path, 'must refer to a regular file with no symlink or hard-link aliases');
        continue;
      }
      const realEvidencePath = await realpath(absoluteEvidencePath);
      if (
        !pathStaysInside(realRunDir, realEvidencePath) ||
        relative(realRunDir, realEvidencePath).split(sep).join('/') !== evidencePath
      ) {
        addError(path, 'must resolve to the exact path inside the run directory');
        continue;
      }
      if (evidenceStat.size === 0) {
        addError(path, 'must not be empty');
        continue;
      }
      const prefix = await readRegularFilePrefix(realEvidencePath, evidenceStat, evidencePath);
      if (hasZipSignature(prefix)) {
        addError(path, 'must not contain ZIP archive bytes under a renamed extension');
        continue;
      }
      const extension = extname(evidencePath).toLowerCase();
      const textExtensions = new Set(['.txt', '.md', '.json', '.html']);
      const requiresStructuralInspection = textExtensions.has(extension) || extension === '.png';
      let contents;
      if (requiresStructuralInspection) {
        contents = (await readBoundedRegularFile(realEvidencePath, evidenceStat, evidencePath))
          .contents;
      }
      if (textExtensions.has(extension) && !contents?.toString('utf8').trim()) {
        addError(path, 'must contain non-whitespace evidence');
      }
      if (new Set(['.jpg', '.jpeg', '.webp']).has(extension)) {
        addError(path, 'must use PNG so the validator can verify the complete image structure');
      } else if (extension === '.png' && (!contents || !isStructurallyValidPng(contents))) {
        addError(path, 'must contain a structurally valid PNG image');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        addError(path, `referenced file does not exist: ${evidencePath}`);
      } else {
        addError(path, `cannot inspect referenced file ${evidencePath}: ${error.message}`);
      }
    }
  }
}

async function rejectRawTraceArtifacts() {
  const visit = async (directoryPath, relativeDirectory) => {
    let entries;
    try {
      entries = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return;
      }
      addError(relativeDirectory, `cannot inspect trace-sensitive artifact root: ${error.message}`);
      return;
    }
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = resolve(directoryPath, entry.name);
      const pathStat = await lstat(absolutePath);
      if (pathStat.isSymbolicLink()) {
        addError(relativePath, 'run artifacts must not contain symlinks');
        continue;
      }
      if (pathStat.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (pathStat.isFile()) {
        if (pathStat.nlink !== 1) {
          addError(relativePath, 'run artifacts must not contain hard-link aliases');
          continue;
        }
        let hasArchiveBytes = false;
        try {
          hasArchiveBytes = hasZipSignature(
            await readRegularFilePrefix(absolutePath, pathStat, relativePath),
          );
        } catch (error) {
          addError(relativePath, `cannot inspect trace-sensitive artifact: ${error.message}`);
        }
        if (
          relativeDirectory === 'traces' ||
          relativeDirectory.startsWith('traces/') ||
          entry.name.toLowerCase().endsWith('.zip') ||
          hasArchiveBytes
        ) {
          addError(
            relativePath,
            'ZIP evidence is prohibited because trace archives can contain session data',
          );
        }
      } else {
        addError(relativePath, 'run artifacts must be regular files or directories');
      }
    }
  };

  await visit(runDir, '');
}

async function validateDelegatedExecutionEvidence(evidencePath, item, itemPath) {
  const evidence = requireRecord(await readJson(evidencePath), evidencePath);
  requireExactKeys(
    evidence,
    new Set([
      'schemaVersion',
      'delegatedWorkId',
      'type',
      'target',
      'revision',
      'command',
      'workingDirectory',
      'selectedTargets',
      'exitCode',
      'summary',
    ]),
    evidencePath,
  );
  if (evidence.schemaVersion !== '1.0') {
    addError(`${evidencePath}.schemaVersion`, 'must equal 1.0');
  }
  if (evidence.delegatedWorkId !== item.id) {
    addError(`${evidencePath}.delegatedWorkId`, `must equal ${item.id}`);
  }
  if (evidence.type !== item.type) {
    addError(`${evidencePath}.type`, `must equal ${item.type}`);
  }
  if (evidence.target !== item.target) {
    addError(`${evidencePath}.target`, `must equal ${item.target}`);
  }
  const evidenceRevision = requireRecord(evidence.revision, `${evidencePath}.revision`);
  requireExactKeys(
    evidenceRevision,
    new Set(['baseSha', 'headSha', 'worktreeFingerprint']),
    `${evidencePath}.revision`,
  );
  for (const key of ['baseSha', 'headSha', 'worktreeFingerprint']) {
    if (evidenceRevision[key] !== planRevision[key]) {
      addError(`${evidencePath}.revision.${key}`, `must equal plan.json.revision.${key}`);
    }
  }
  requireString(evidence, 'command', evidencePath);
  requireString(evidence, 'workingDirectory', evidencePath);
  const selectedTargets = requireStringArray(
    evidence.selectedTargets,
    `${evidencePath}.selectedTargets`,
  );
  if (!selectedTargets.includes(item.target)) {
    addError(`${evidencePath}.selectedTargets`, `must include delegated target ${item.target}`);
  }
  if (evidence.exitCode !== 0) {
    addError(`${evidencePath}.exitCode`, 'must equal 0 for completed delegated work');
  }
  requireString(evidence, 'summary', evidencePath);

  if (!item.evidence.includes(evidencePath)) {
    addError(`${itemPath}.evidence`, `must cite ${evidencePath}`);
  }
}

async function validateAgentBrowserDomEvidence(evidencePath, checkId, expectedUrl) {
  const evidence = requireRecord(await readJson(evidencePath), evidencePath);
  requireExactKeys(
    evidence,
    new Set(['schemaVersion', 'checkId', 'url', 'capturedAt', 'content']),
    evidencePath,
  );
  if (evidence.schemaVersion !== '1.0') {
    addError(`${evidencePath}.schemaVersion`, 'must equal 1.0');
  }
  if (evidence.checkId !== checkId) {
    addError(`${evidencePath}.checkId`, `must equal ${checkId}`);
  }
  const url = requireString(evidence, 'url', evidencePath);
  if (url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        addError(`${evidencePath}.url`, 'must use HTTP or HTTPS');
      }
      if (parsedUrl.hostname === 'nginx-browser-check') {
        parsedUrl.hostname = 'localhost';
      }
      if (expectedUrl && parsedUrl.toString() !== expectedUrl) {
        addError(`${evidencePath}.url`, `must equal the planned target URL ${expectedUrl}`);
      }
    } catch {
      addError(`${evidencePath}.url`, 'must be an absolute URL');
    }
  }
  canonicalIsoTimestamp(evidence.capturedAt, `${evidencePath}.capturedAt`);
  requireString(evidence, 'content', evidencePath);
}

async function validateRunAuthStateFile(expectedHash) {
  const relativePath = 'auth/user.json';
  const absolutePath = resolve(runDir, relativePath);
  try {
    const pathStat = await lstat(absolutePath);
    if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
      addError(relativePath, 'must be a regular file with no symlink or hard-link aliases');
      return;
    }
    const realFilePath = await realpath(absolutePath);
    if (
      !pathStaysInside(realRunDir, realFilePath) ||
      relative(realRunDir, realFilePath).split(sep).join('/') !== relativePath
    ) {
      addError(relativePath, 'must remain at its exact run-owned path');
      return;
    }
    const currentHash = (await hashRegularFile(realFilePath, pathStat, relativePath)).sha256;
    if (expectedHash && currentHash !== expectedHash) {
      addError(relativePath, 'must match the claimed runtime authStateHash');
    }
  } catch (error) {
    addError(relativePath, `cannot be inspected: ${error.message}`);
  }
}

function executionArtifactPathIsAllowed(value) {
  return (
    value === EXECUTION_ARTIFACT_ROOT_FILE ||
    EXECUTION_ARTIFACT_ROOT_DIRECTORIES.some((root) => value.startsWith(`${root}/`))
  );
}

function normalizedRunRelativePath(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  if (isAbsolute(value) || value.includes('\\')) {
    return false;
  }

  const segments = value.split('/');
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

async function collectExecutionOutputFiles() {
  const outputPaths = new Set();

  async function inspectPath(absolutePath, relativePath, rootMayBeAbsent = false) {
    let pathStat;
    try {
      pathStat = await lstat(absolutePath);
    } catch (error) {
      if (rootMayBeAbsent && error.code === 'ENOENT') {
        return;
      }
      addError(
        '.browser-check-artifacts.json',
        `cannot inspect output ${relativePath}: ${error.message}`,
      );
      return;
    }

    if (pathStat.isSymbolicLink()) {
      addError(
        '.browser-check-artifacts.json',
        `execution output must not be a symlink: ${relativePath}`,
      );
      return;
    }

    let realOutputPath;
    try {
      realOutputPath = await realpath(absolutePath);
    } catch (error) {
      addError(
        '.browser-check-artifacts.json',
        `cannot resolve output ${relativePath}: ${error.message}`,
      );
      return;
    }
    if (
      !pathStaysInside(realRunDir, realOutputPath) ||
      relative(realRunDir, realOutputPath).split(sep).join('/') !== relativePath
    ) {
      addError(
        '.browser-check-artifacts.json',
        `execution output must stay at its run-relative path: ${relativePath}`,
      );
      return;
    }

    if (pathStat.isFile()) {
      outputPaths.add(relativePath);
      return;
    }
    if (!pathStat.isDirectory()) {
      addError(
        '.browser-check-artifacts.json',
        `execution output must be a regular file or directory: ${relativePath}`,
      );
      return;
    }

    let entries;
    try {
      entries = await readdir(absolutePath, { withFileTypes: true });
    } catch (error) {
      addError(
        '.browser-check-artifacts.json',
        `cannot read output directory ${relativePath}: ${error.message}`,
      );
      return;
    }
    for (const entry of entries) {
      await inspectPath(resolve(absolutePath, entry.name), `${relativePath}/${entry.name}`);
    }
  }

  await inspectPath(
    resolve(runDir, EXECUTION_ARTIFACT_ROOT_FILE),
    EXECUTION_ARTIFACT_ROOT_FILE,
    true,
  );
  for (const root of EXECUTION_ARTIFACT_ROOT_DIRECTORIES) {
    await inspectPath(resolve(runDir, root), root, true);
  }

  return outputPaths;
}

async function validateExecutionArtifactManifest() {
  const manifestData = await readRunFileData('.browser-check-artifacts.json', true);
  if (!manifestData) {
    return { hash: '', paths: new Set() };
  }

  const manifestSource = manifestData.contents;
  const manifestHash = manifestData.sha256;
  let rawManifest;
  try {
    rawManifest = JSON.parse(manifestSource.toString('utf8'));
  } catch (error) {
    addError('.browser-check-artifacts.json', `is not valid JSON: ${error.message}`);
    return { hash: manifestHash, paths: new Set() };
  }

  const manifest = requireRecord(rawManifest, '.browser-check-artifacts.json');
  requireExactKeys(manifest, new Set(['schemaVersion', 'files']), '.browser-check-artifacts.json');
  if (manifest.schemaVersion !== '1.0') {
    addError('.browser-check-artifacts.json.schemaVersion', 'must equal "1.0"');
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (!Array.isArray(manifest.files)) {
    addError('.browser-check-artifacts.json.files', 'must be an array');
  }
  const manifestPaths = new Set();
  let previousPath;
  for (const [index, rawFile] of files.entries()) {
    const path = `.browser-check-artifacts.json.files[${index}]`;
    const file = requireRecord(rawFile, path);
    requireExactKeys(file, new Set(['path', 'size', 'sha256']), path);
    const relativePath = requireString(file, 'path', path);
    if (relativePath && !normalizedRunRelativePath(relativePath)) {
      addError(`${path}.path`, 'must be a normalized run-relative POSIX path');
    } else if (relativePath && !executionArtifactPathIsAllowed(relativePath)) {
      addError(`${path}.path`, 'must be within an allowed browser execution output root');
    }
    if (relativePath && manifestPaths.has(relativePath)) {
      addError(`${path}.path`, `duplicates manifest path ${relativePath}`);
    }
    if (relativePath && previousPath !== undefined && relativePath <= previousPath) {
      addError(`${path}.path`, 'manifest paths must be strictly sorted');
    }
    if (relativePath) {
      manifestPaths.add(relativePath);
      previousPath = relativePath;
    }

    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      addError(`${path}.size`, 'must be a non-negative safe integer byte count');
    }
    const recordedHash = requireString(file, 'sha256', path);
    if (recordedHash && !FINGERPRINT_PATTERN.test(recordedHash)) {
      addError(`${path}.sha256`, 'must be a lowercase sha256 fingerprint');
    }

    if (!relativePath || !normalizedRunRelativePath(relativePath)) {
      continue;
    }
    const absolutePath = resolve(runDir, relativePath);
    if (!pathStaysInside(runDir, absolutePath)) {
      addError(`${path}.path`, 'must stay inside the run directory');
      continue;
    }
    try {
      const pathStat = await lstat(absolutePath);
      if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
        addError(`${path}.path`, 'must refer to a regular file with no link aliases');
        continue;
      }
      const realFilePath = await realpath(absolutePath);
      if (
        !pathStaysInside(realRunDir, realFilePath) ||
        relative(realRunDir, realFilePath).split(sep).join('/') !== relativePath
      ) {
        addError(`${path}.path`, 'must resolve to the same path inside the run directory');
        continue;
      }
      const hashedFile = await hashRegularFile(realFilePath, pathStat, relativePath);
      if (Number.isSafeInteger(file.size) && file.size !== hashedFile.size) {
        addError(`${path}.size`, `must equal ${hashedFile.size}, the current file size`);
      }
      if (recordedHash && recordedHash !== hashedFile.sha256) {
        addError(`${path}.sha256`, 'must match the current file bytes');
      }
    } catch (error) {
      addError(`${path}.path`, `cannot inspect manifest file ${relativePath}: ${error.message}`);
    }
  }

  const outputPaths = await collectExecutionOutputFiles();
  for (const outputPath of outputPaths) {
    if (!manifestPaths.has(outputPath)) {
      addError(
        '.browser-check-artifacts.json.files',
        `must list every browser execution output file: ${outputPath}`,
      );
    }
  }
  for (const manifestPath of manifestPaths) {
    if (!outputPaths.has(manifestPath)) {
      addError(
        '.browser-check-artifacts.json.files',
        `lists a path outside the current browser execution outputs: ${manifestPath}`,
      );
    }
  }

  return { hash: manifestHash, paths: manifestPaths };
}

async function validateGlobalExecutionError(plannedChecks, resultRecords) {
  const executionError = requireRecord(
    await readJson('.browser-check-execution-error.json'),
    '.browser-check-execution-error.json',
  );
  requireExactKeys(
    executionError,
    new Set([
      'schemaVersion',
      'phase',
      'scope',
      'affectedCheckIds',
      'classification',
      'message',
      'occurredAt',
    ]),
    '.browser-check-execution-error.json',
  );
  if (executionError.schemaVersion !== '1.0') {
    addError('.browser-check-execution-error.json.schemaVersion', 'must equal "1.0"');
  }
  if (executionError.phase !== 'pre-report') {
    addError('.browser-check-execution-error.json.phase', 'must equal pre-report');
  }
  if (executionError.scope !== 'global') {
    addError('.browser-check-execution-error.json.scope', 'must equal global');
  }
  const affectedCheckIds = requireStringArray(
    executionError.affectedCheckIds,
    '.browser-check-execution-error.json.affectedCheckIds',
  );
  const sortedTemporaryCheckIds = [...plannedChecks]
    .filter(([, check]) => check.driver === 'playwright-temporary')
    .map(([checkId]) => checkId)
    .sort((left, right) => left.localeCompare(right));
  if (
    affectedCheckIds.length !== sortedTemporaryCheckIds.length ||
    affectedCheckIds.some((checkId, index) => checkId !== sortedTemporaryCheckIds[index])
  ) {
    addError(
      '.browser-check-execution-error.json.affectedCheckIds',
      'must equal every planned playwright-temporary check ID in sorted order',
    );
  }
  requireEnum(
    executionError.classification,
    new Set(['environment-defect', 'check-script-defect']),
    '.browser-check-execution-error.json.classification',
  );
  requireString(executionError, 'message', '.browser-check-execution-error.json');
  canonicalIsoTimestamp(
    executionError.occurredAt,
    '.browser-check-execution-error.json.occurredAt',
  );

  if (sortedTemporaryCheckIds.length === 0) {
    addError(
      '.browser-check-execution-error.json',
      'must not exist without a planned playwright-temporary check',
    );
  }
  for (const checkId of sortedTemporaryCheckIds) {
    const checkResult = resultRecords.get(checkId);
    if (checkResult?.status !== 'blocked') {
      addError(
        `result.json.results.${checkId}.status`,
        'must be blocked when a global browser execution error prevented a report',
      );
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
  executionArtifactManifestExists,
  browserExecutionErrorExists,
] = await Promise.all([
  readJson('plan.json'),
  readJson('result.json'),
  readRunFile('issues.md'),
  readRunFile('plan.json'),
  runFileExists('playwright-results.json'),
  runFileExists('.browser-check-run.json'),
  runFileExists('.browser-check-artifacts.json'),
  runFileExists('.browser-check-execution-error.json'),
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
    if (plannedUseAuthState) {
      addError(
        'plan.json.environment.useAuthState',
        'reusable auth state is unsupported; authenticate explicitly inside the check',
      );
    }
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
const evidenceValidationTasks = [];
const planningContext = {};
for (const key of ['unnecessaryChecks', 'assumptions', 'specificationGaps']) {
  planningContext[key] = requireStringArray(plan[key], `plan.json.${key}`);
}
if (plan.delegatedWork !== undefined) {
  addError('plan.json.delegatedWork', 'is obsolete; use delegatedWorkItems');
}
const rawDelegatedWorkItems = Array.isArray(plan.delegatedWorkItems) ? plan.delegatedWorkItems : [];
if (!Array.isArray(plan.delegatedWorkItems)) {
  addError('plan.json.delegatedWorkItems', 'must be an array');
}
const delegatedWorkItems = new Map();
rawDelegatedWorkItems.forEach((rawItem, index) => {
  const path = `plan.json.delegatedWorkItems[${index}]`;
  const item = requireRecord(rawItem, path);
  requireExactKeys(
    item,
    new Set([
      'id',
      'type',
      'priority',
      'requiredForVerdict',
      'status',
      'target',
      'reason',
      'evidence',
    ]),
    path,
  );
  const id = requireString(item, 'id', path);
  if (id && !/^DW-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{3}$/.test(id)) {
    addError(`${path}.id`, 'must match DW-{normalized-change-id}-{three-digit-sequence}');
  }
  if (id && changeId) {
    const itemChangeId = id.slice(3, -4);
    const compactChangeId = changeId.replaceAll('-', '');
    if (itemChangeId !== changeId && itemChangeId !== compactChangeId) {
      addError(`${path}.id`, `must identify plan change ${changeId}`);
    }
  }
  if (delegatedWorkItems.has(id)) {
    addError(`${path}.id`, `duplicates delegated work ID ${id}`);
  } else if (id) {
    delegatedWorkItems.set(id, item);
  }

  requireEnum(item.type, DELEGATED_WORK_TYPES, `${path}.type`);
  requireEnum(item.priority, PRIORITIES, `${path}.priority`);
  if (typeof item.requiredForVerdict !== 'boolean') {
    addError(`${path}.requiredForVerdict`, 'must be a boolean');
  }
  const status = requireEnum(item.status, DELEGATED_WORK_STATUSES, `${path}.status`);
  requireString(item, 'target', path);
  requireString(item, 'reason', path);
  const itemEvidence = requireStringArray(item.evidence, `${path}.evidence`);
  if (status === 'not_required' && item.requiredForVerdict === true) {
    addError(`${path}.requiredForVerdict`, 'must be false when status is not_required');
  }
  if (item.requiredForVerdict === true && status === 'completed' && itemEvidence.length === 0) {
    addError(`${path}.evidence`, 'completed required delegated work must include evidence');
  }
  if (itemEvidence.length > 0) {
    evidenceValidationTasks.push(validateEvidenceFiles(itemEvidence, path));
  }
  if (item.requiredForVerdict === true && status === 'completed' && id) {
    const executionEvidencePath = `evidence/delegated/${id}.json`;
    if (!itemEvidence.includes(executionEvidencePath)) {
      addError(
        `${path}.evidence`,
        `completed required delegated work must include ${executionEvidencePath}`,
      );
    } else {
      evidenceValidationTasks.push(
        validateDelegatedExecutionEvidence(executionEvidencePath, item, path),
      );
    }
  }
});

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
  if (planEnvironmentValues.appEnvironment !== 'testing') {
    addError(
      'plan.json.environment.appEnvironment',
      'playwright-temporary checks require the testing application environment',
    );
  }
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
let expectedDatabaseRuntime = {};
if (hasTemporaryPlaywrightCheck && canonicalPlanBaseUrl) {
  const rawPlanBaseUrl = new URL(planEnvironmentValues.baseUrl);
  const planUsesDocker = rawPlanBaseUrl.hostname === 'nginx-browser-check';
  let databaseIdentity;
  if (planUsesDocker) {
    if (planEnvironmentValues.baseUrl !== 'http://nginx-browser-check:80') {
      addError(
        'plan.json.environment.baseUrl',
        'Docker temporary checks must use the exact raw URL http://nginx-browser-check:80',
      );
    }
    databaseIdentity = 'mysql:mysql-browser-check/browser_check';
    expectedDatabaseRuntime.connection = 'mysql';
  } else {
    const hostPort = Number(rawPlanBaseUrl.port);
    if (!rawPlanBaseUrl.port || hostPort < 1024 || hostPort > 65535) {
      addError(
        'plan.json.environment.baseUrl',
        'host temporary checks require an explicit port from 1024 through 65535',
      );
    }
    if (plannedUseAuthState) {
      addError(
        'plan.json.environment.useAuthState',
        'host temporary-browser execution must not use authentication state',
      );
    }
    const workspaceRelativeDatabasePath = `${relative(process.cwd(), runDir)
      .split(sep)
      .join('/')}/runtime/browser-check.sqlite`;
    databaseIdentity = `sqlite:${workspaceRelativeDatabasePath}`;
    expectedDatabaseRuntime.connection = 'sqlite';
  }
  expectedDatabaseRuntime.identifierHash = `sha256:${createHash('sha256')
    .update(databaseIdentity)
    .digest('hex')}`;
}
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

const rawIssueRecords = Array.isArray(result.issueRecords) ? result.issueRecords : [];
if (!Array.isArray(result.issueRecords)) {
  addError('result.json.issueRecords', 'must be an array');
}

const issueRecords = new Map();

function validateOwnedPngEvidence(evidencePaths, checkId, ownerPath) {
  if (!checkId) {
    return;
  }
  for (const [evidenceIndex, evidencePath] of evidencePaths.entries()) {
    if (extname(evidencePath).toLowerCase() !== '.png') {
      continue;
    }
    const checkIdOccurrences = evidencePath.match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? [];
    if (checkIdOccurrences.length !== 1 || checkIdOccurrences[0] !== checkId) {
      addError(
        `${ownerPath}.evidence[${evidenceIndex}]`,
        `PNG evidence must contain exactly one bounded owning check ID ${checkId}`,
      );
    }
  }
}

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
    validateOwnedPngEvidence(issueEvidence, checkId, path);
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
  validateOwnedPngEvidence(evidence, checkId, path);
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
    if (!evidenceHasExtension(evidence, new Set(['.png']))) {
      addError(
        `${path}.evidence`,
        'playwright-temporary pass requires an owner-bound focused PNG screenshot',
      );
    }
  }
  if (status === 'pass' && driver === 'agent-browser') {
    const hasScreenshot = evidenceHasExtension(evidence, new Set(['.png']));
    const domEvidencePath = `evidence/dom/${checkId}.json`;
    const hasDomRecord = evidence.includes(domEvidencePath);
    if (!hasScreenshot && !hasDomRecord) {
      addError(
        `${path}.evidence`,
        `agent-browser pass requires a valid image or ${domEvidencePath}`,
      );
    }
    if (hasDomRecord) {
      let expectedDomUrl = '';
      const plannedTargetUrl = plannedChecks.get(checkId)?.target?.url;
      if (typeof plannedTargetUrl === 'string' && canonicalPlanBaseUrl) {
        try {
          const parsedExpectedUrl = new URL(plannedTargetUrl, canonicalPlanBaseUrl);
          if (parsedExpectedUrl.hostname === 'nginx-browser-check') {
            parsedExpectedUrl.hostname = 'localhost';
          }
          expectedDomUrl = parsedExpectedUrl.toString();
        } catch {
          // The plan validation above records the invalid target URL.
        }
      }
      evidenceValidationTasks.push(
        validateAgentBrowserDomEvidence(domEvidencePath, checkId, expectedDomUrl),
      );
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
    } else if (issueRecord.classification === 'product-defect') {
      if (status !== 'fail') {
        addError(
          `${path}.issues[${issueIndex}]`,
          'a product-defect issue requires the owning objective check to have fail status',
        );
      }
    } else if (
      [
        'test-data-defect',
        'check-script-defect',
        'environment-defect',
        'specification-gap',
      ].includes(issueRecord.classification) &&
      !['blocked', 'not_run'].includes(status)
    ) {
      addError(
        `${path}.issues[${issueIndex}]`,
        'an unresolved tooling, data, environment, or specification issue requires blocked or not_run status',
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
const temporaryEvidenceCitations = [];
for (const [checkId, checkResult] of temporaryResultRecords) {
  for (const evidencePath of Array.isArray(checkResult.evidence) ? checkResult.evidence : []) {
    temporaryEvidenceCitations.push({ checkId, evidencePath, source: 'result' });
  }
}
for (const issueRecord of issueRecords.values()) {
  if (plannedChecks.get(issueRecord.checkId)?.driver !== 'playwright-temporary') {
    continue;
  }
  for (const evidencePath of Array.isArray(issueRecord.evidence) ? issueRecord.evidence : []) {
    temporaryEvidenceCitations.push({
      checkId: issueRecord.checkId,
      evidencePath,
      source: `issue ${issueRecord.id}`,
    });
  }
}

if (browserExecutionErrorExists && playwrightResultsExists) {
  addError('.browser-check-execution-error.json', 'must not coexist with playwright-results.json');
}
if (browserExecutionErrorExists && executionArtifactManifestExists) {
  addError(
    '.browser-check-execution-error.json',
    'must not coexist with .browser-check-artifacts.json',
  );
}

const artifactManifestValidationPromise = executionArtifactManifestExists
  ? validateExecutionArtifactManifest()
  : undefined;
if (artifactManifestValidationPromise) {
  evidenceValidationTasks.push(
    artifactManifestValidationPromise.then((manifest) => {
      if (!manifest.paths.has('playwright-results.json')) {
        addError('.browser-check-artifacts.json.files', 'must include playwright-results.json');
      }
      for (const { checkId, evidencePath, source } of temporaryEvidenceCitations) {
        if (!manifest.paths.has(evidencePath)) {
          addError(
            `.browser-check-artifacts.json.files`,
            `must include temporary-browser evidence ${evidencePath} cited by ${source} for ${checkId}`,
          );
        }
      }
    }),
  );
}
if (
  !browserExecutionErrorExists &&
  (playwrightResultsExists || reportCitedByResult || temporaryEvidenceExists) &&
  !executionArtifactManifestExists
) {
  addError(
    '.browser-check-artifacts.json',
    'is required for Playwright reports and temporary-browser evidence',
  );
}
if (browserExecutionErrorExists) {
  for (const { checkId, evidencePath } of temporaryEvidenceCitations) {
    if (evidencePath !== '.browser-check-execution-error.json') {
      addError(
        `result.json.results.${checkId}.evidence`,
        'a global pre-report failure may cite only .browser-check-execution-error.json',
      );
    }
  }
  evidenceValidationTasks.push(validateGlobalExecutionError(plannedChecks, resultRecords));
}

const shouldValidatePlaywrightReport =
  !browserExecutionErrorExists &&
  (playwrightResultsExists ||
    browserClaimExists ||
    executionArtifactManifestExists ||
    reportCitedByResult ||
    executedTemporaryResultRecords.length > 0);
const requiresBrowserPostflight =
  !browserExecutionErrorExists &&
  (playwrightResultsExists ||
    executionArtifactManifestExists ||
    reportCitedByResult ||
    temporaryEvidenceExists);
const requiresBrowserClaim =
  shouldValidatePlaywrightReport ||
  temporaryEvidenceExists ||
  executionArtifactManifestExists ||
  browserExecutionErrorExists;

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
      expectedDatabaseRuntime,
      requiresPostflight: requiresBrowserPostflight,
      forbidsPostflight: browserExecutionErrorExists,
      temporaryResultRecords,
      hasPlaywrightReport: playwrightResultsExists,
      artifactManifestValidationPromise,
    }),
  );
}
if (
  (playwrightResultsExists ||
    browserClaimExists ||
    executionArtifactManifestExists ||
    browserExecutionErrorExists) &&
  temporaryResultRecords.length === 0
) {
  addError(
    'result.json.results',
    'Playwright execution artifacts require a playwright-temporary result',
  );
}
for (const [checkId, checkResult] of temporaryResultRecords) {
  if (
    checkResult.status === 'not_run' &&
    (playwrightResultsExists ||
      browserClaimExists ||
      executionArtifactManifestExists ||
      browserExecutionErrorExists)
  ) {
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
markdownSection('plan.md', '## Delegated Work', /^#{1,2}\s/);
for (const [key, heading] of [
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
for (const [itemId, item] of delegatedWorkItems) {
  const expectedDelegatedWorkRow = [
    itemId,
    item.type,
    item.priority,
    String(item.requiredForVerdict),
    item.status,
    item.target,
    item.reason,
  ];
  const matchingRows = markdownTableRows('plan.md').filter((cells) => cells[0] === itemId);
  if (
    matchingRows.length !== 1 ||
    matchingRows[0]?.length !== 7 ||
    expectedDelegatedWorkRow.some((value, index) => matchingRows[0]?.[index] !== value)
  ) {
    addError('plan.md', `must contain one exact delegated-work row for ${itemId}`);
  }
  const itemSection = checkSection('plan.md', itemId);
  for (const evidencePath of Array.isArray(item.evidence) ? item.evidence : []) {
    if (
      !itemSection.includes(evidencePath) &&
      !itemSection.includes(evidencePath.replaceAll('|', '\\|'))
    ) {
      addError('plan.md', `must project delegated-work evidence under ${itemId}: ${evidencePath}`);
    }
  }
  requireProjectionValue('review.md', itemId, 'reviewed delegated work ID');
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
const allowedDelegatedWorkIds = new Set(delegatedWorkItems.keys());
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
  rejectUnknownIds(
    filename,
    new RegExp(DELEGATED_WORK_ID_PATTERN_SOURCE, 'g'),
    allowedDelegatedWorkIds,
    'delegated work ID',
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
rejectUnknownIds(
  'issues.md',
  new RegExp(DELEGATED_WORK_ID_PATTERN_SOURCE, 'g'),
  allowedDelegatedWorkIds,
  'delegated work ID',
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
  const unresolvedRequiredDelegatedWork = [...delegatedWorkItems.values()].filter(
    (item) => item.requiredForVerdict === true && item.status !== 'completed',
  );
  const unresolvedHighPriorityDelegatedWork = unresolvedRequiredDelegatedWork.filter((item) =>
    ['P0', 'P1', 'P2'].includes(item.priority),
  );
  const conditionalPassIsSupported =
    unresolvedResults.every((checkResult) => {
      const plannedCheck = plannedChecks.get(checkResult.checkId);
      return plannedCheck?.driver === 'human' || plannedCheck?.priority === 'P3';
    }) && unresolvedRequiredDelegatedWork.every((item) => item.priority === 'P3');
  const hasUnresolvedWork =
    summary.blocked > 0 || summary.notRun > 0 || unresolvedRequiredDelegatedWork.length > 0;
  if (browserExecutionErrorExists) {
    if (verdict !== 'incomplete') {
      addError(
        'review.md',
        'verdict must be incomplete when a global pre-report browser execution error exists',
      );
    }
  } else if (unresolvedHighPriorityDelegatedWork.length > 0) {
    if (verdict !== 'incomplete') {
      addError(
        'review.md',
        'verdict must be incomplete while required P0-P2 delegated work is not completed',
      );
    }
  } else if (summary.fail > 0 && verdict !== 'fail') {
    addError('review.md', 'verdict must be fail when one or more checks failed');
  } else if (
    summary.fail === 0 &&
    hasUnresolvedWork &&
    !['conditional-pass', 'incomplete'].includes(verdict)
  ) {
    addError(
      'review.md',
      'verdict must be conditional-pass or incomplete while required work remains unresolved',
    );
  } else if (verdict === 'conditional-pass' && !conditionalPassIsSupported) {
    addError(
      'review.md',
      'conditional-pass permits only human or P3 unresolved checks and delegated work; use incomplete otherwise',
    );
  } else if (summary.fail === 0 && !hasUnresolvedWork && verdict !== 'pass') {
    addError('review.md', 'verdict must be pass when no failed or unresolved work remains');
  }
}

await rejectRawTraceArtifacts();
await Promise.all(evidenceValidationTasks);

if (errors.length > 0) {
  console.error(`Change-verification artifacts are invalid (${errors.length} error(s)):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Change-verification artifacts are valid: ${plannedChecks.size} check(s), run ${runId}.`,
);
