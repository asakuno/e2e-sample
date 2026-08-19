#!/usr/bin/env node

import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { frontendAssetsContentFingerprint } from './browser-check-assets.mjs';
import { currentGitRevision } from './revision-fingerprint.mjs';

const fingerprintPattern = /^sha256:[0-9a-f]{64}$/;
const dependenciesFingerprint = process.env.BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT;
if (dependenciesFingerprint !== undefined && !fingerprintPattern.test(dependenciesFingerprint)) {
  throw new Error(
    'BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT must be a lowercase sha256 fingerprint',
  );
}

const workspaceRoot = realpathSync(process.cwd());
const storageDirectory = resolve(workspaceRoot, 'storage');
const storageStat = lstatSync(storageDirectory);
if (
  storageStat.isSymbolicLink() ||
  !storageStat.isDirectory() ||
  realpathSync(storageDirectory) !== storageDirectory
) {
  throw new Error('storage must be a real workspace-owned directory');
}
const markerDirectory = resolve(storageDirectory, 'framework');
if (existsSync(markerDirectory)) {
  const markerDirectoryStat = lstatSync(markerDirectory);
  if (
    markerDirectoryStat.isSymbolicLink() ||
    !markerDirectoryStat.isDirectory() ||
    realpathSync(markerDirectory) !== markerDirectory
  ) {
    throw new Error('storage/framework must be a real workspace-owned directory');
  }
} else {
  mkdirSync(markerDirectory, { mode: 0o755 });
  if (realpathSync(markerDirectory) !== markerDirectory) {
    throw new Error('storage/framework was redirected outside the workspace');
  }
}
const markerPath = resolve(markerDirectory, 'browser-check-assets.json');
const temporaryPath = resolve(markerDirectory, `.browser-check-assets.${process.pid}.tmp`);

if (existsSync(markerPath)) {
  const markerStat = lstatSync(markerPath);
  if (markerStat.isSymbolicLink() || !markerStat.isFile() || markerStat.nlink !== 1) {
    throw new Error('The existing browser-check build marker must be a regular non-symlink file');
  }
}

const marker = {
  schemaVersion: '1.0',
  revision: currentGitRevision(workspaceRoot),
  assetsHash: frontendAssetsContentFingerprint(workspaceRoot),
  ...(dependenciesFingerprint ? { dependenciesFingerprint } : {}),
};
const source = `${JSON.stringify(marker, null, 2)}\n`;
let descriptor;
try {
  descriptor = openSync(temporaryPath, 'wx', 0o644);
  writeFileSync(descriptor, source, 'utf8');
  fsyncSync(descriptor);
  closeSync(descriptor);
  descriptor = undefined;
  renameSync(temporaryPath, markerPath);
} finally {
  if (descriptor !== undefined) {
    closeSync(descriptor);
  }
  if (existsSync(temporaryPath)) {
    unlinkSync(temporaryPath);
  }
}

console.log(`Recorded browser-check frontend assets for ${marker.revision.headSha}`);
