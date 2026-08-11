import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { resolve } from 'node:path';

const buildMarkerName = 'browser-check-assets.json';
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/;
const shaPattern = /^[0-9a-f]{40}$/;
const FILE_READ_CHUNK_BYTES = 64 * 1024;
const MAX_STRUCTURED_FILE_BYTES = 16 * 1024 * 1024;
const MAX_FRONTEND_ASSET_FILES = 10_000;
const MAX_FRONTEND_ASSET_BYTES = 1024 * 1024 * 1024;

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

function streamRegularFileSync(filePath, beforeStat, label, onChunk, maxBytes) {
  if (beforeStat.isSymbolicLink() || !beforeStat.isFile() || beforeStat.nlink !== 1) {
    throw new Error(`${label} must be a real, single-link regular file`);
  }
  if (maxBytes !== undefined && beforeStat.size > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte structural file limit`);
  }

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
      onChunk(chunk.subarray(0, bytesRead));
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
  return totalBytes;
}

function readBoundedRegularFileSync(filePath, beforeStat, label) {
  const chunks = [];
  streamRegularFileSync(
    filePath,
    beforeStat,
    label,
    (chunk) => chunks.push(Buffer.from(chunk)),
    MAX_STRUCTURED_FILE_BYTES,
  );
  return Buffer.concat(chunks, beforeStat.size);
}

export function frontendAssetsContentFingerprint(workspaceRoot) {
  const canonicalWorkspaceRoot = realpathSync(workspaceRoot);
  const viteHotPath = resolve(canonicalWorkspaceRoot, 'public/hot');
  if (existsSync(viteHotPath)) {
    throw new Error('public/hot must be absent so Laravel serves the revision-bound build');
  }
  const frontendAssetsRoot = resolve(canonicalWorkspaceRoot, 'public/build');
  const frontendManifestPath = resolve(frontendAssetsRoot, 'manifest.json');
  if (
    !existsSync(frontendAssetsRoot) ||
    lstatSync(frontendAssetsRoot).isSymbolicLink() ||
    !statSync(frontendAssetsRoot).isDirectory() ||
    realpathSync(frontendAssetsRoot) !== frontendAssetsRoot
  ) {
    throw new Error('public/build must be a real, non-symlinked directory built before the run');
  }
  if (
    !existsSync(frontendManifestPath) ||
    lstatSync(frontendManifestPath).isSymbolicLink() ||
    !statSync(frontendManifestPath).isFile() ||
    statSync(frontendManifestPath).nlink !== 1 ||
    realpathSync(frontendManifestPath) !== frontendManifestPath
  ) {
    throw new Error('public/build/manifest.json must be a regular, non-symlinked build manifest');
  }

  const fingerprint = createHash('sha256');
  const collisionKeys = new Set();
  let totalAssetBytes = 0;
  let totalAssetFiles = 0;
  fingerprint.update('browser-check-frontend-assets-v1\0');

  const visitDirectory = (directoryPath, relativeDirectory = '') => {
    const entries = readdirSync(directoryPath).sort();
    for (const entry of entries) {
      if (!relativeDirectory && entry.startsWith('.browser-check-revision.')) {
        throw new Error(`public/build contains an unfinished build marker: ${entry}`);
      }
      const entryPath = resolve(directoryPath, entry);
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry}` : entry;
      if (relativePath.normalize('NFC') !== relativePath) {
        throw new Error(`public/build contains a non-canonical path: ${relativePath}`);
      }
      const collisionKey = relativePath.toLowerCase();
      if (collisionKeys.has(collisionKey)) {
        throw new Error(`public/build contains duplicate or colliding paths: ${relativePath}`);
      }
      collisionKeys.add(collisionKey);

      const beforeStat = lstatSync(entryPath);
      if (beforeStat.isSymbolicLink()) {
        throw new Error(`public/build must not contain symlinks: ${relativePath}`);
      }
      if (beforeStat.isDirectory()) {
        fingerprint.update('directory\0');
        fingerprint.update(relativePath);
        fingerprint.update('\0');
        visitDirectory(entryPath, relativePath);
        continue;
      }
      if (!beforeStat.isFile()) {
        throw new Error(
          `public/build may contain only regular files and directories: ${relativePath}`,
        );
      }
      if (beforeStat.nlink !== 1) {
        throw new Error(`public/build must not contain hard-linked files: ${relativePath}`);
      }
      totalAssetFiles += 1;
      totalAssetBytes += beforeStat.size;
      if (totalAssetFiles > MAX_FRONTEND_ASSET_FILES) {
        throw new Error(
          `public/build exceeds the ${MAX_FRONTEND_ASSET_FILES}-file frontend asset limit`,
        );
      }
      if (!Number.isSafeInteger(totalAssetBytes) || totalAssetBytes > MAX_FRONTEND_ASSET_BYTES) {
        throw new Error(
          `public/build exceeds the ${MAX_FRONTEND_ASSET_BYTES}-byte frontend asset limit`,
        );
      }
      fingerprint.update('file\0');
      fingerprint.update(relativePath);
      fingerprint.update('\0');
      fingerprint.update(String(beforeStat.size));
      fingerprint.update('\0');
      streamRegularFileSync(entryPath, beforeStat, `public/build/${relativePath}`, (chunk) =>
        fingerprint.update(chunk),
      );
      fingerprint.update('\0');
    }
    const finalEntries = readdirSync(directoryPath).sort();
    if (
      entries.length !== finalEntries.length ||
      entries.some((entry, index) => entry !== finalEntries[index])
    ) {
      throw new Error(
        `public/build changed while it was being hashed: ${relativeDirectory || '.'}`,
      );
    }
  };

  visitDirectory(frontendAssetsRoot);
  return `sha256:${fingerprint.digest('hex')}`;
}

export function frontendAssetsFingerprint(
  workspaceRoot,
  expectedRevision,
  markerPathOverride,
  expectedDependenciesFingerprint,
) {
  if (
    !expectedRevision ||
    typeof expectedRevision !== 'object' ||
    !shaPattern.test(expectedRevision.headSha) ||
    !fingerprintPattern.test(expectedRevision.worktreeFingerprint)
  ) {
    throw new Error('an exact Git head and worktree fingerprint are required for public/build');
  }
  if (
    expectedDependenciesFingerprint !== undefined &&
    !fingerprintPattern.test(expectedDependenciesFingerprint)
  ) {
    throw new Error('the expected dependency installation must use a lowercase sha256 fingerprint');
  }

  const canonicalWorkspaceRoot = realpathSync(workspaceRoot);
  const markerPath = markerPathOverride
    ? resolve(canonicalWorkspaceRoot, markerPathOverride)
    : resolve(canonicalWorkspaceRoot, `storage/framework/${buildMarkerName}`);
  const markerRelativePath = markerPath.slice(canonicalWorkspaceRoot.length + 1);
  if (
    markerPath === canonicalWorkspaceRoot ||
    markerPath.startsWith(`${canonicalWorkspaceRoot}/`) === false ||
    markerRelativePath.normalize('NFC') !== markerRelativePath
  ) {
    throw new Error('the browser-check build marker must stay inside the workspace');
  }
  if (
    !existsSync(markerPath) ||
    lstatSync(markerPath).isSymbolicLink() ||
    !statSync(markerPath).isFile() ||
    realpathSync(markerPath) !== markerPath
  ) {
    throw new Error('npm run build:browser-check must create a regular browser-check build marker');
  }
  const beforeStat = lstatSync(markerPath);
  if (beforeStat.nlink !== 1) {
    throw new Error('the browser-check build marker must not be hard-linked');
  }
  const markerSource = readBoundedRegularFileSync(
    markerPath,
    beforeStat,
    'the browser-check build marker',
  ).toString('utf8');
  let marker;
  try {
    marker = JSON.parse(markerSource);
  } catch {
    throw new Error('the browser-check build marker must contain valid JSON');
  }
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) {
    throw new Error('the browser-check build marker must be an object');
  }
  const markerKeys = Object.keys(marker).sort();
  const allowedMarkerKeys = new Set([
    'assetsHash',
    'dependenciesFingerprint',
    'revision',
    'schemaVersion',
  ]);
  if (
    ![3, 4].includes(markerKeys.length) ||
    !markerKeys.includes('assetsHash') ||
    !markerKeys.includes('revision') ||
    !markerKeys.includes('schemaVersion') ||
    markerKeys.some((key) => !allowedMarkerKeys.has(key))
  ) {
    throw new Error('the browser-check build marker has unexpected fields');
  }
  const revision = marker.revision;
  if (
    marker.schemaVersion !== '1.0' ||
    !revision ||
    typeof revision !== 'object' ||
    Array.isArray(revision) ||
    Object.keys(revision).sort().join(',') !== 'headSha,worktreeFingerprint' ||
    !shaPattern.test(revision.headSha) ||
    !fingerprintPattern.test(revision.worktreeFingerprint) ||
    !fingerprintPattern.test(marker.assetsHash) ||
    (marker.dependenciesFingerprint !== undefined &&
      !fingerprintPattern.test(marker.dependenciesFingerprint))
  ) {
    throw new Error('the browser-check build marker schema is invalid');
  }
  if (
    revision.headSha !== expectedRevision.headSha ||
    revision.worktreeFingerprint !== expectedRevision.worktreeFingerprint
  ) {
    throw new Error('public/build was not produced from the planned Git worktree');
  }
  if (
    expectedDependenciesFingerprint !== undefined &&
    marker.dependenciesFingerprint !== expectedDependenciesFingerprint
  ) {
    throw new Error(
      'public/build was not produced with the trusted Docker dependency installation',
    );
  }
  const assetsHash = frontendAssetsContentFingerprint(canonicalWorkspaceRoot);
  if (marker.assetsHash !== assetsHash) {
    throw new Error('public/build does not match its revision-bound build marker');
  }
  const afterStat = lstatSync(markerPath);
  if (
    !afterStat.isFile() ||
    afterStat.isSymbolicLink() ||
    beforeStat.ino !== afterStat.ino ||
    beforeStat.size !== afterStat.size ||
    beforeStat.mtimeMs !== afterStat.mtimeMs ||
    afterStat.nlink !== 1
  ) {
    throw new Error('the browser-check build marker changed while it was being validated');
  }

  return assetsHash;
}
