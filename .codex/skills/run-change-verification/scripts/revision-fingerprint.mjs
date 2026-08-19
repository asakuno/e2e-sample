#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function pathStaysInside(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

export function revisionGitEnvironment(sourceEnvironment = process.env) {
  const environment = {
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'core.excludesFile',
    GIT_CONFIG_KEY_1: 'core.attributesFile',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_VALUE_0: '/dev/null',
    GIT_CONFIG_VALUE_1: '/dev/null',
    GIT_OPTIONAL_LOCKS: '0',
  };
  for (const name of ['LANG', 'LC_ALL', 'PATH', 'TMPDIR']) {
    if (sourceEnvironment[name] !== undefined) {
      environment[name] = sourceEnvironment[name];
    }
  }
  return environment;
}

function runGit(workspaceRoot, args, encoding) {
  const result = spawnSync('git', args, {
    cwd: workspaceRoot,
    encoding,
    env: revisionGitEnvironment(),
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : String(result.stderr ?? '');
    throw new Error(stderr.trim() || `git ${args.join(' ')} exited ${result.status}`);
  }
  return result.stdout;
}

export function currentGitRevision(workspace = process.cwd()) {
  const workspaceRoot = realpathSync(workspace);
  const indexEntries = String(runGit(workspaceRoot, ['ls-files', '-v', '-z'], 'utf8'))
    .split('\0')
    .filter(Boolean);
  const hiddenIndexEntry = indexEntries.find(
    (entry) => entry.length < 3 || entry[1] !== ' ' || entry[0] !== 'H',
  );
  if (hiddenIndexEntry) {
    throw new Error(
      `tracked files must not use assume-unchanged, skip-worktree, or noncanonical index flags: ${hiddenIndexEntry.slice(2)}`,
    );
  }
  const headSha = String(
    runGit(workspaceRoot, ['rev-parse', '--verify', 'HEAD^{commit}'], 'utf8'),
  ).trim();
  const trackedDiff = runGit(
    workspaceRoot,
    ['diff', '--binary', '--no-ext-diff', 'HEAD', '--'],
    null,
  );
  const status = String(
    runGit(workspaceRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], 'utf8'),
  );
  const untrackedPaths = status
    .split('\0')
    .filter((entry) => entry.startsWith('?? '))
    .map((entry) => entry.slice(3))
    .sort();
  const fingerprint = createHash('sha256');
  fingerprint.update('tracked-diff\0');
  fingerprint.update(trackedDiff);

  for (const untrackedPath of untrackedPaths) {
    const absolutePath = resolve(workspaceRoot, untrackedPath);
    if (!pathStaysInside(workspaceRoot, absolutePath)) {
      throw new Error(`untracked path escapes the workspace: ${untrackedPath}`);
    }
    const pathStat = lstatSync(absolutePath);
    fingerprint.update('untracked\0');
    fingerprint.update(untrackedPath);
    fingerprint.update('\0');
    fingerprint.update(String(pathStat.mode & 0o111));
    fingerprint.update('\0');
    if (pathStat.isSymbolicLink()) {
      fingerprint.update('symlink\0');
      fingerprint.update(readlinkSync(absolutePath));
    } else if (pathStat.isFile()) {
      fingerprint.update('file\0');
      fingerprint.update(readFileSync(absolutePath));
    } else {
      throw new Error(`unsupported untracked path type: ${untrackedPath}`);
    }
    fingerprint.update('\0');
  }

  return {
    headSha,
    worktreeFingerprint: `sha256:${fingerprint.digest('hex')}`,
  };
}

export function revisionSnapshot(baseRef, workspace = process.cwd()) {
  if (typeof baseRef !== 'string' || baseRef.trim() === '') {
    throw new Error('A non-empty base ref is required');
  }
  const workspaceRoot = realpathSync(workspace);
  const baseSha = String(
    runGit(workspaceRoot, ['rev-parse', '--verify', `${baseRef}^{commit}`], 'utf8'),
  ).trim();
  return { baseSha, ...currentGitRevision(workspaceRoot) };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const baseRef = process.argv[2]?.trim();
  if (!baseRef) {
    console.error('Usage: node revision-fingerprint.mjs <base-ref>');
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(revisionSnapshot(baseRef), null, 2));
  } catch (error) {
    console.error(`Cannot fingerprint the Git revision: ${error.message}`);
    process.exit(1);
  }
}
