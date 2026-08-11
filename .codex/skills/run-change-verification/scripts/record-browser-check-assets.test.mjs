import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const recorderPath = resolve(scriptDirectory, 'record-browser-check-assets.mjs');

void test('asset recorder rejects a malformed dependency fingerprint', async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'browser-check-assets-test-'));
  try {
    const execution = spawnSync(process.execPath, [recorderPath], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT: 'sha256:invalid',
      },
      timeout: 30_000,
    });
    assert.equal(execution.signal, null, `${execution.stdout}\n${execution.stderr}`);
    assert.notEqual(execution.status, 0, `${execution.stdout}\n${execution.stderr}`);
    assert.match(
      execution.stderr,
      /BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT must be a lowercase sha256 fingerprint/,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

void test('asset recorder rejects redirected storage before writing', async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'browser-check-assets-test-'));
  const workspace = resolve(fixtureRoot, 'workspace');
  const redirectedStorage = resolve(fixtureRoot, 'redirected-storage');
  await mkdir(workspace);
  await mkdir(redirectedStorage);
  await symlink(redirectedStorage, resolve(workspace, 'storage'));

  try {
    const execution = spawnSync(process.execPath, [recorderPath], {
      cwd: workspace,
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(execution.signal, null, `${execution.stdout}\n${execution.stderr}`);
    assert.notEqual(execution.status, 0, `${execution.stdout}\n${execution.stderr}`);
    assert.match(execution.stderr, /storage must be a real workspace-owned directory/);
    await assert.rejects(
      access(resolve(redirectedStorage, 'framework/browser-check-assets.json')),
      { code: 'ENOENT' },
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
