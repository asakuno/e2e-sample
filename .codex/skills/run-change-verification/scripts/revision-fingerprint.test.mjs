import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { currentGitRevision } from './revision-fingerprint.mjs';

function runGit(workspace, arguments_) {
  const result = spawnSync('git', arguments_, { cwd: workspace, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function createRepository() {
  const workspace = mkdtempSync(resolve(tmpdir(), 'revision-fingerprint-'));
  runGit(workspace, ['init', '--quiet']);
  writeFileSync(resolve(workspace, 'tracked.txt'), 'original\n');
  runGit(workspace, ['add', 'tracked.txt']);
  runGit(workspace, [
    '-c',
    'user.name=Browser Check',
    '-c',
    'user.email=browser-check@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  ]);
  return workspace;
}

void test('revision fingerprint rejects assume-unchanged and skip-worktree index flags', () => {
  for (const flag of ['--assume-unchanged', '--skip-worktree']) {
    const workspace = createRepository();
    try {
      runGit(workspace, ['update-index', flag, 'tracked.txt']);
      writeFileSync(resolve(workspace, 'tracked.txt'), 'hidden change\n');
      assert.throws(
        () => currentGitRevision(workspace),
        /must not use assume-unchanged, skip-worktree, or noncanonical index flags/,
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }
});

void test('revision fingerprint ignores ambient Git repository and index overrides', () => {
  const workspace = createRepository();
  const previousGitDirectory = process.env.GIT_DIR;
  const previousIndexFile = process.env.GIT_INDEX_FILE;
  try {
    process.env.GIT_DIR = resolve(workspace, 'missing-git-directory');
    process.env.GIT_INDEX_FILE = resolve(workspace, 'missing-index');
    assert.match(currentGitRevision(workspace).headSha, /^[0-9a-f]{40}$/);
  } finally {
    if (previousGitDirectory === undefined) {
      delete process.env.GIT_DIR;
    } else {
      process.env.GIT_DIR = previousGitDirectory;
    }
    if (previousIndexFile === undefined) {
      delete process.env.GIT_INDEX_FILE;
    } else {
      process.env.GIT_INDEX_FILE = previousIndexFile;
    }
    rmSync(workspace, { recursive: true, force: true });
  }
});
