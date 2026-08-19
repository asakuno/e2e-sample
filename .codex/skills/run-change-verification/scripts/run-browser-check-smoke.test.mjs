import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertBrowserCheckComposeSourceIsFailClosed,
  dependencyStateFingerprint,
  dependencyManifestSetId,
  dockerComposeBindOptionsAreFailClosed,
  dockerEndpointIsLocal,
  dockerPlaywrightExecutionTimeout,
  dockerWrapperCompletionKind,
  prepareDockerNodeModulesCacheMountpoints,
  runDockerProcess,
  trustedDependencyState,
} from './run-browser-check-smoke.mjs';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'run-browser-check-smoke.mjs');

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runNodeInWorkspace(workspace, source, extraEnvironment = {}) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

void test('Docker wrapper timeout covers inner execution, termination grace, and postflight', () => {
  assert.equal(dockerPlaywrightExecutionTimeout(1), 155_000);
  assert.equal(dockerPlaywrightExecutionTimeout(12), 815_000);
  assert.throws(() => dockerPlaywrightExecutionTimeout(0), /between 1 and 12/);
  assert.throws(() => dockerPlaywrightExecutionTimeout(13), /between 1 and 12/);
});

void test('Docker endpoint guard accepts only local daemon transports', () => {
  assert.equal(dockerEndpointIsLocal('unix:///var/run/docker.sock'), true);
  assert.equal(dockerEndpointIsLocal('npipe:////./pipe/docker_engine'), true);
  assert.equal(dockerEndpointIsLocal('tcp://127.0.0.1:2375'), true);
  assert.equal(dockerEndpointIsLocal('https://localhost:2376'), true);
  assert.equal(dockerEndpointIsLocal('ssh://builder@example.com'), false);
  assert.equal(dockerEndpointIsLocal('tcp://192.0.2.10:2375'), false);
});

void test('Docker Compose bind options disable implicit host path creation exactly', () => {
  assert.equal(dockerComposeBindOptionsAreFailClosed({ create_host_path: false }), true);
  assert.equal(dockerComposeBindOptionsAreFailClosed({}), true);
  assert.equal(dockerComposeBindOptionsAreFailClosed(undefined), false);
  assert.equal(dockerComposeBindOptionsAreFailClosed(null), false);
  assert.equal(dockerComposeBindOptionsAreFailClosed([]), false);
  assert.equal(dockerComposeBindOptionsAreFailClosed(''), false);
  assert.equal(dockerComposeBindOptionsAreFailClosed(0), false);
  assert.equal(dockerComposeBindOptionsAreFailClosed({ create_host_path: true }), false);
  assert.equal(
    dockerComposeBindOptionsAreFailClosed({
      create_host_path: false,
      propagation: 'rshared',
    }),
    false,
  );
  assert.equal(dockerComposeBindOptionsAreFailClosed({ selinux: 'z' }), false);
});

void test('Browser-check Compose source disables host path creation for every bind mount', () => {
  const composeSource = readFileSync(
    resolve(dirname(scriptPath), '../../../../compose.yml'),
    'utf8',
  );
  assert.doesNotThrow(() => assertBrowserCheckComposeSourceIsFailClosed(composeSource));

  const implicitCreationSource = composeSource.replace(
    '          create_host_path: false',
    '          create_host_path: true',
  );
  assert.notEqual(implicitCreationSource, composeSource);
  assert.throws(
    () => assertBrowserCheckComposeSourceIsFailClosed(implicitCreationSource),
    /must explicitly disable host path creation for every bind mount/,
  );

  const mysqlLongBind = [
    '      - type: bind',
    '        source: ./.docker/local/mysql/my.cnf',
    '        target: /etc/mysql/my.cnf',
    '        read_only: true',
    '        bind:',
    '          create_host_path: false',
  ].join('\n');
  const shortSyntaxSource = composeSource.replace(
    mysqlLongBind,
    '      - "./.docker/local/mysql/my.cnf:/etc/mysql/my.cnf:ro"',
  );
  assert.notEqual(shortSyntaxSource, composeSource);
  assert.throws(
    () => assertBrowserCheckComposeSourceIsFailClosed(shortSyntaxSource),
    /must explicitly disable host path creation for every bind mount/,
  );

  const extraBindOptionSource = composeSource.replace(
    '          create_host_path: false',
    '          create_host_path: false\n          propagation: rshared',
  );
  assert.notEqual(extraBindOptionSource, composeSource);
  assert.throws(
    () => assertBrowserCheckComposeSourceIsFailClosed(extraBindOptionSource),
    /must explicitly disable host path creation for every bind mount/,
  );
});

void test('Docker build prepares cache mountpoints below read-only node_modules', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-cache-mountpoints-'));
  try {
    const nodeModulesPath = resolve(fixture, 'node_modules');
    mkdirSync(nodeModulesPath);
    const nodeModules = realpathSync(nodeModulesPath);

    prepareDockerNodeModulesCacheMountpoints(nodeModules);
    prepareDockerNodeModulesCacheMountpoints(nodeModules);

    for (const directoryName of ['.vite', '.vite-temp']) {
      const mountpoint = resolve(nodeModules, directoryName);
      assert.equal(existsSync(mountpoint), true);
      assert.equal(lstatSync(mountpoint).isDirectory(), true);
    }

    rmSync(resolve(nodeModules, '.vite'), { recursive: true });
    writeFileSync(resolve(nodeModules, '.vite'), 'unsafe\n');
    assert.throws(
      () => prepareDockerNodeModulesCacheMountpoints(nodeModules),
      /\.vite cache mountpoint is unsafe/,
    );

    rmSync(resolve(nodeModules, '.vite'));
    mkdirSync(resolve(nodeModules, '.vite'));
    writeFileSync(resolve(nodeModules, '.vite/cache.json'), '{}\n');
    assert.throws(
      () => prepareDockerNodeModulesCacheMountpoints(nodeModules),
      /\.vite cache mountpoint is unsafe/,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

void test('Docker subprocess timeout escalates from SIGTERM to SIGKILL', async () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-docker-process-'));
  try {
    const fakeDocker = resolve(fixture, 'docker');
    writeFileSync(
      fakeDocker,
      `#!${process.execPath}\nprocess.on('SIGTERM', () => {});\nsetInterval(() => {}, 1000);\n`,
    );
    chmodSync(fakeDocker, 0o755);
    const startedAt = Date.now();
    await assert.rejects(
      runDockerProcess([], { PATH: fixture }, 50, false),
      /exceeded its bounded 50 ms timeout/,
    );
    assert.ok(Date.now() - startedAt < 7_000);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

void test('Docker wrapper preserves both assertion failures and trustworthy global launch failures', () => {
  assert.equal(
    dockerWrapperCompletionKind({
      claim: { postflight: { playwrightExitCode: 1 } },
      executionError: undefined,
      exitCode: 1,
      plannedCheckIds: ['BC-TEST-001'],
      reportExists: true,
      manifestExists: true,
    }),
    'postflight',
  );
  assert.equal(
    dockerWrapperCompletionKind({
      claim: {},
      executionError: {
        schemaVersion: '1.0',
        phase: 'pre-report',
        scope: 'global',
        affectedCheckIds: ['BC-TEST-001'],
        classification: 'environment-defect',
        message: 'Chromium could not start.',
        occurredAt: '2026-08-04T00:00:00.000Z',
      },
      exitCode: 1,
      plannedCheckIds: ['BC-TEST-001'],
      reportExists: false,
      manifestExists: false,
    }),
    'global-execution-error',
  );
  assert.throws(
    () =>
      dockerWrapperCompletionKind({
        claim: {},
        executionError: undefined,
        exitCode: 1,
        plannedCheckIds: ['BC-TEST-001'],
        reportExists: false,
        manifestExists: false,
      }),
    /without a trustworthy wrapper completion/,
  );
});

void test('dependency fingerprint rejects installed npm content that disagrees with package-lock', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-dependencies-'));
  try {
    const source = resolve(fixture, 'source');
    const expectedPackage = {
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
      integrity: 'sha512-example',
    };
    writeJson(resolve(source, 'package-lock.json'), {
      lockfileVersion: 3,
      packages: { '': {}, 'node_modules/example': expectedPackage },
    });
    writeJson(resolve(source, 'package.json'), {
      name: 'fixture',
      private: true,
    });
    writeJson(resolve(source, 'composer.lock'), { packages: [], 'packages-dev': [] });
    writeJson(resolve(source, 'composer.json'), { name: 'fixture/project' });
    const dependencyRootRelative = `storage/framework/browser-check-dependencies/${dependencyManifestSetId(source)}`;
    const dependencyRoot = resolve(fixture, dependencyRootRelative);
    const nodeModules = resolve(dependencyRoot, 'node_modules');
    const vendor = resolve(dependencyRoot, 'vendor');
    writeJson(resolve(nodeModules, '.package-lock.json'), {
      lockfileVersion: 3,
      packages: { 'node_modules/example': expectedPackage },
    });
    writeJson(resolve(nodeModules, 'example/package.json'), {
      name: 'example',
      version: '0.9.0',
    });
    writeJson(resolve(vendor, 'composer/installed.json'), { packages: [] });
    const canonicalNodeModules = realpathSync(nodeModules);
    const canonicalVendor = realpathSync(vendor);

    assert.throws(
      () => dependencyStateFingerprint(source, canonicalNodeModules, canonicalVendor),
      /Installed npm package contents do not match lock metadata/,
    );
    writeJson(resolve(nodeModules, 'example/package.json'), {
      name: 'example',
      version: '1.0.0',
    });
    writeFileSync(resolve(nodeModules, 'example/index.js'), 'export default 1;\n');
    prepareDockerNodeModulesCacheMountpoints(canonicalNodeModules);
    const beforeMutation = dependencyStateFingerprint(
      source,
      canonicalNodeModules,
      canonicalVendor,
    );
    writeFileSync(resolve(nodeModules, '.vite/cache.json'), '{}\n');
    assert.throws(
      () => dependencyStateFingerprint(source, canonicalNodeModules, canonicalVendor),
      /\.vite cache mountpoint must be an empty canonical directory/,
    );
    rmSync(resolve(nodeModules, '.vite/cache.json'));
    assert.equal(
      dependencyStateFingerprint(source, canonicalNodeModules, canonicalVendor),
      beforeMutation,
    );
    writeJson(resolve(fixture, 'storage/framework/browser-check-dependencies.json'), {
      schemaVersion: '2.0',
      dependencyRoot: dependencyRootRelative,
      dependenciesFingerprint: beforeMutation,
    });
    assert.equal(trustedDependencyState(source, fixture).dependenciesFingerprint, beforeMutation);
    writeFileSync(resolve(nodeModules, 'example/index.js'), 'export default 2;\n');
    const afterMutation = dependencyStateFingerprint(source, canonicalNodeModules, canonicalVendor);
    assert.notEqual(afterMutation, beforeMutation);
    assert.throws(
      () => trustedDependencyState(source, fixture),
      /differ from the clean-install attestation/,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

void test('sanitized snapshot preserves an intentional tracked deletion', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-deletion-'));
  try {
    const git = (arguments_) => {
      const result = spawnSync('git', arguments_, { cwd: fixture, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    };
    git(['init', '--quiet']);
    writeFileSync(resolve(fixture, 'kept.txt'), 'kept\n');
    writeFileSync(resolve(fixture, 'deleted.txt'), 'deleted\n');
    writeFileSync(resolve(fixture, '.env.example'), 'APP_ENV=local\n');
    git(['add', 'kept.txt', 'deleted.txt', '.env.example']);
    rmSync(resolve(fixture, 'deleted.txt'));

    const output = runNodeInWorkspace(
      fixture,
      `import { existsSync, rmSync } from 'node:fs';
       import { resolve } from 'node:path';
       import { createSanitizedBuildWorkspace } from ${JSON.stringify(pathToFileURL(scriptPath).href)};
       const created = createSanitizedBuildWorkspace({ PATH: process.env.PATH, HOME: process.env.HOME });
       try {
         console.log(JSON.stringify({
           kept: existsSync(resolve(created.buildWorkspace, 'kept.txt')),
           deleted: existsSync(resolve(created.buildWorkspace, 'deleted.txt')),
           environmentExample: existsSync(resolve(created.buildWorkspace, '.env.example')),
         }));
       } finally {
         rmSync(created.temporaryRoot, { recursive: true, force: true });
       }`,
    );
    assert.deepEqual(JSON.parse(output), {
      kept: true,
      deleted: false,
      environmentExample: true,
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

void test('sanitized snapshot fails closed for tracked sensitive configuration', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-sensitive-'));
  try {
    const git = spawnSync('git', ['init', '--quiet'], { cwd: fixture, encoding: 'utf8' });
    assert.equal(git.status, 0, git.stderr);
    writeFileSync(resolve(fixture, '.npmrc'), '//registry.example.invalid/:_authToken=secret\n');
    const add = spawnSync('git', ['add', '.npmrc'], { cwd: fixture, encoding: 'utf8' });
    assert.equal(add.status, 0, add.stderr);
    const output = runNodeInWorkspace(
      fixture,
      `import { createSanitizedBuildWorkspace } from ${JSON.stringify(pathToFileURL(scriptPath).href)};
       try {
         createSanitizedBuildWorkspace({ PATH: process.env.PATH, HOME: process.env.HOME });
         console.log('unexpected success');
       } catch (error) {
         console.log(error.message);
       }`,
    );
    assert.match(output, /Sensitive configuration cannot enter a browser-check: \.npmrc/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

void test('Docker setup failure removes run assets and every allocated source snapshot', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'browser-check-cleanup-'));
  const isolatedTmp = resolve(fixture, 'tmp');
  mkdirSync(isolatedTmp);
  try {
    const git = spawnSync('git', ['init', '--quiet'], { cwd: fixture, encoding: 'utf8' });
    assert.equal(git.status, 0, git.stderr);
    const runRelative = 'test-results/change-verification/CLEANUP/20260804010101';
    mkdirSync(resolve(fixture, runRelative), { recursive: true });
    const output = runNodeInWorkspace(
      fixture,
      `import { existsSync, readdirSync } from 'node:fs';
       import { resolve } from 'node:path';
       import { runDockerBrowserCheck } from ${JSON.stringify(pathToFileURL(scriptPath).href)};
       let failed = false;
       try { await runDockerBrowserCheck(${JSON.stringify(runRelative)}); } catch { failed = true; }
       console.log(JSON.stringify({
         failed,
         assets: existsSync(resolve(${JSON.stringify(runRelative)}, 'runtime/assets')),
         temporary: readdirSync(process.env.TMPDIR),
       }));`,
      { TMPDIR: isolatedTmp },
    );
    assert.deepEqual(JSON.parse(output), { failed: true, assets: false, temporary: [] });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
