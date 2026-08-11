#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readlinkSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontendAssetsContentFingerprint } from './browser-check-assets.mjs';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const workspaceRoot = realpathSync(process.cwd());
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const smokeMode = process.env.BROWSER_CHECK_SMOKE_MODE?.trim() || 'host';
if (!['host', 'docker'].includes(smokeMode)) {
  throw new Error('BROWSER_CHECK_SMOKE_MODE must be either host or docker');
}
const isDockerMode = smokeMode === 'docker';
const changeId = isDockerMode ? 'CI-BROWSER-CHECK-DOCKER-SMOKE' : 'CI-BROWSER-CHECK-SMOKE';
const checkId = isDockerMode ? 'BC-CIBROWSERCHECKDOCKERSMOKE-001' : 'BC-CIBROWSERCHECKSMOKE-001';
const baseRef = process.env.CHANGE_VERIFICATION_TEST_BASE_REF?.trim() || 'HEAD';
const baseUrl = isDockerMode ? 'http://nginx-browser-check:80' : 'http://localhost:8000';

function jstParts(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replaceAll(/[-:T]/g, '');
}

function jstTimestamp(date) {
  const value = new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
  return `${value}+09:00`;
}

function createRunDirectory(startedAt) {
  ensureDirectory(resolve(workspaceRoot, 'test-results'));
  ensureDirectory(verificationRoot);
  const changeRoot = resolve(verificationRoot, changeId);
  ensureDirectory(changeRoot);
  for (let offset = 0; offset < 3600; offset += 1) {
    const runId = jstParts(new Date(startedAt.getTime() + offset * 1000));
    const runDir = resolve(changeRoot, runId);
    if (!existsSync(runDir)) {
      mkdirSync(runDir, { mode: 0o700 });
      if (realpathSync(runDir) !== runDir) {
        throw new Error(`Fresh browser-check run resolved outside its expected path: ${runDir}`);
      }
      return { runDir, runId };
    }
  }
  throw new Error('Could not allocate a fresh append-only browser-check smoke run');
}

function ensureDirectory(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { mode: 0o700 });
  }
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink() || !pathStat.isDirectory() || realpathSync(path) !== path) {
    throw new Error(`Browser-check smoke directory must not be redirected: ${path}`);
  }
}

function writeText(path, source) {
  writeFileSync(path, source.endsWith('\n') ? source : `${source}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
}

function readBoundedRegularJson(path, label, maximumBytes = 16 * 1024 * 1024) {
  const beforeStat = lstatSync(path);
  if (
    beforeStat.isSymbolicLink() ||
    !beforeStat.isFile() ||
    beforeStat.nlink !== 1 ||
    beforeStat.size > maximumBytes
  ) {
    throw new Error(`${label} must be a bounded regular file`);
  }
  const contents = readFileSync(path);
  const afterStat = lstatSync(path);
  if (
    afterStat.ino !== beforeStat.ino ||
    afterStat.size !== beforeStat.size ||
    afterStat.mtimeMs !== beforeStat.mtimeMs
  ) {
    throw new Error(`${label} changed while it was read`);
  }
  try {
    return JSON.parse(contents.toString('utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function runNode(scriptPath, arguments_, environment, timeout) {
  const result = spawnSync(process.execPath, [scriptPath, ...arguments_], {
    cwd: workspaceRoot,
    env: environment,
    stdio: 'inherit',
    timeout,
    killSignal: 'SIGTERM',
  });
  if (result.error) {
    throw new Error(`${scriptPath} could not run: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`${scriptPath} ended from signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`${scriptPath} exited ${result.status}`);
  }
}

const activeDockerProcesses = new Set();

function signalDockerProcess(child, signal) {
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }
}

export function runDockerProcess(arguments_, environment, timeout, captureOutput) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn('docker', arguments_, {
      cwd: workspaceRoot,
      env: environment,
      detached: process.platform !== 'win32',
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    activeDockerProcesses.add(child);
    const stdoutChunks = [];
    const stderrChunks = [];
    let outputBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    let spawnError;
    let forceTimer;
    const appendOutput = (chunks, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 10 * 1024 * 1024) {
        outputExceeded = true;
        signalDockerProcess(child, 'SIGTERM');
        forceTimer ??= setTimeout(() => signalDockerProcess(child, 'SIGKILL'), 5_000);
        return;
      }
      chunks.push(chunk);
    };
    child.stdout?.on('data', (chunk) => appendOutput(stdoutChunks, chunk));
    child.stderr?.on('data', (chunk) => appendOutput(stderrChunks, chunk));
    child.once('error', (error) => {
      spawnError = error;
    });
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      signalDockerProcess(child, 'SIGTERM');
      forceTimer = setTimeout(() => signalDockerProcess(child, 'SIGKILL'), 5_000);
    }, timeout);
    child.once('close', (status, signal) => {
      clearTimeout(timeoutTimer);
      if (forceTimer) {
        clearTimeout(forceTimer);
      }
      activeDockerProcesses.delete(child);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (spawnError) {
        rejectProcess(new Error(`docker could not run: ${spawnError.message}`));
      } else if (timedOut) {
        rejectProcess(new Error(`docker exceeded its bounded ${timeout} ms timeout`));
      } else if (outputExceeded) {
        rejectProcess(new Error('docker output exceeded the 10 MiB capture limit'));
      } else if (signal) {
        rejectProcess(new Error(`docker ended from signal ${signal}`));
      } else {
        resolveProcess({ status, stdout, stderr });
      }
    });
  });
}

async function runDockerCommandStatus(arguments_, environment, timeout) {
  const result = await runDockerProcess(arguments_, environment, timeout, false);
  return result.status;
}

async function runDockerCommand(arguments_, environment, timeout) {
  const status = await runDockerCommandStatus(arguments_, environment, timeout);
  if (status !== 0) {
    throw new Error(`docker exited ${status}`);
  }
}

async function captureDockerCommand(arguments_, environment, timeout) {
  const result = await runDockerProcess(arguments_, environment, timeout, true);
  if (result.status !== 0) {
    throw new Error(`docker exited ${result.status}: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function captureCommand(command, arguments_, environment, timeout) {
  const result = spawnSync(command, arguments_, {
    cwd: workspaceRoot,
    env: environment,
    encoding: 'utf8',
    timeout,
    killSignal: 'SIGTERM',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`${command} could not run: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`${command} ended from signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function dockerClientEnvironment() {
  const environment = {};
  for (const name of [
    'DOCKER_CERT_PATH',
    'DOCKER_CONFIG',
    'DOCKER_CONTEXT',
    'DOCKER_HOST',
    'DOCKER_TLS_VERIFY',
    'HOME',
    'PATH',
    'TMPDIR',
  ]) {
    if (process.env[name] !== undefined) {
      environment[name] = process.env[name];
    }
  }
  return environment;
}

export function dockerEndpointIsLocal(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.trim() !== endpoint || endpoint === '') {
    return false;
  }
  if (endpoint.startsWith('unix://') || endpoint.startsWith('npipe://')) {
    return true;
  }
  try {
    const parsed = new URL(endpoint);
    return (
      ['tcp:', 'http:', 'https:'].includes(parsed.protocol) &&
      ['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

async function requireLocalDockerEndpoint(dockerEnvironment) {
  const contexts = JSON.parse(
    await captureDockerCommand(['context', 'inspect'], dockerEnvironment, 30_000),
  );
  const endpoint = contexts?.length === 1 ? contexts[0]?.Endpoints?.docker?.Host : undefined;
  if (!dockerEndpointIsLocal(endpoint)) {
    throw new Error('Docker browser-check requires a local Unix, npipe, or loopback daemon');
  }
  return endpoint;
}

export function createSanitizedBuildWorkspace(dockerEnvironment) {
  const temporaryRoot = realpathSync(mkdtempSync(resolve(tmpdir(), 'browser-check-build-')));
  const buildWorkspace = resolve(temporaryRoot, 'workspace');
  mkdirSync(buildWorkspace, { mode: 0o755 });
  try {
    const gitEnvironment = { ...dockerEnvironment, GIT_OPTIONAL_LOCKS: '0' };
    const trackedFiles = new Set(
      captureCommand(
        'git',
        ['-c', 'core.excludesFile=/dev/null', 'ls-files', '-z', '--cached'],
        gitEnvironment,
        60_000,
      )
        .split('\0')
        .filter(Boolean),
    );
    const untrackedFiles = captureCommand(
      'git',
      ['-c', 'core.excludesFile=/dev/null', 'ls-files', '-z', '--others', '--exclude-standard'],
      gitEnvironment,
      60_000,
    )
      .split('\0')
      .filter(Boolean);
    const listedFiles = [...new Set([...trackedFiles, ...untrackedFiles])];
    const deletedTrackedFiles = new Set(
      captureCommand(
        'git',
        ['-c', 'core.excludesFile=/dev/null', 'ls-files', '-z', '--deleted'],
        { ...dockerEnvironment, GIT_OPTIONAL_LOCKS: '0' },
        60_000,
      )
        .split('\0')
        .filter(Boolean),
    );
    let copiedBytes = 0;
    let copiedFiles = 0;
    for (const relativePath of listedFiles) {
      const normalizedPath = relativePath.split(sep).join('/');
      const pathBasename = basename(normalizedPath);
      const lowerPath = normalizedPath.toLowerCase();
      const lowerBasename = pathBasename.toLowerCase();
      const sensitiveBasenames = new Set([
        '.netrc',
        'auth.json',
        'auth.json.bak',
        'composer-auth.json',
        'credentials.json',
        'id_dsa',
        'id_ed25519',
        'id_rsa',
        'service-account.json',
      ]);
      const isTracked = trackedFiles.has(relativePath);
      const isEnvironmentExample = /^\.env(?:\.[a-z0-9_-]+)*\.example$/i.test(pathBasename);
      const isSensitive =
        pathBasename === '.npmrc' ||
        pathBasename === '.gitconfig' ||
        (pathBasename.startsWith('.env') && !isEnvironmentExample) ||
        sensitiveBasenames.has(lowerBasename) ||
        ['.key', '.p12', '.pfx', '.pem'].some((extension) => lowerBasename.endsWith(extension)) ||
        ['.aws/', '.gnupg/', '.ssh/', 'auth/', 'credentials/', 'secrets/'].some(
          (sensitiveRoot) =>
            lowerPath === sensitiveRoot.slice(0, -1) || lowerPath.startsWith(sensitiveRoot),
        );
      const isGeneratedOrRuntime = [
        'node_modules',
        'vendor',
        'storage',
        'test-results',
        'public/build',
        'bootstrap/cache',
        'bootstrap/ssr',
      ].some(
        (excludedRoot) =>
          normalizedPath === excludedRoot || normalizedPath.startsWith(`${excludedRoot}/`),
      );
      if (normalizedPath !== relativePath) {
        throw new Error(`Browser-check source path is not normalized: ${relativePath}`);
      }
      if (isSensitive) {
        throw new Error(`Sensitive configuration cannot enter a browser-check: ${relativePath}`);
      }
      if (isGeneratedOrRuntime) {
        if (
          isTracked &&
          /^(?:storage\/(?:.+\/)?|bootstrap\/cache\/)\.gitignore$/.test(normalizedPath)
        ) {
          continue;
        }
        throw new Error(
          `A revision-bound path is excluded from the browser-check snapshot: ${relativePath}`,
        );
      }
      const sourcePath = resolve(workspaceRoot, normalizedPath);
      const destinationPath = resolve(buildWorkspace, normalizedPath);
      if (
        relative(workspaceRoot, sourcePath).split(sep).join('/') !== normalizedPath ||
        relative(buildWorkspace, destinationPath).split(sep).join('/') !== normalizedPath
      ) {
        throw new Error(`Sanitized browser-check source path is not canonical: ${normalizedPath}`);
      }
      if (!existsSync(sourcePath)) {
        if (deletedTrackedFiles.has(normalizedPath)) {
          continue;
        }
        throw new Error(`Browser-check source disappeared while it was copied: ${normalizedPath}`);
      }
      const beforeStat = lstatSync(sourcePath);
      if (beforeStat.isSymbolicLink() || !beforeStat.isFile() || beforeStat.nlink !== 1) {
        throw new Error(`Sanitized browser-check source must be a regular file: ${normalizedPath}`);
      }
      copiedBytes += beforeStat.size;
      copiedFiles += 1;
      if (copiedFiles > 50_000) {
        throw new Error('Sanitized browser-check source exceeds the 50,000-file safety limit');
      }
      if (copiedBytes > 512 * 1024 * 1024) {
        throw new Error('Sanitized browser-check source exceeds the 512 MiB safety limit');
      }
      mkdirSync(dirname(destinationPath), { recursive: true, mode: 0o755 });
      copyFileSync(sourcePath, destinationPath);
      const afterStat = lstatSync(sourcePath);
      const destinationStat = lstatSync(destinationPath);
      if (
        afterStat.ino !== beforeStat.ino ||
        afterStat.size !== beforeStat.size ||
        afterStat.mtimeMs !== beforeStat.mtimeMs ||
        !destinationStat.isFile() ||
        destinationStat.size !== beforeStat.size
      ) {
        throw new Error(`Browser-check source changed while it was copied: ${normalizedPath}`);
      }
    }
    for (const relativeDirectory of [
      'bootstrap/cache',
      'bootstrap/ssr',
      'public/build',
      'storage/app/private',
      'storage/framework/cache/data',
      'storage/framework/sessions',
      'storage/framework/views',
      'storage/logs',
    ]) {
      mkdirSync(resolve(buildWorkspace, relativeDirectory), { recursive: true, mode: 0o755 });
    }
    mkdirSync(resolve(buildWorkspace, '.git'), { mode: 0o755 });
    for (const relativePath of [
      '.env',
      '.env.testing',
      '.env.local',
      '.env.production',
      '.env.production.local',
      '.npmrc',
      '.git/config',
    ]) {
      writeFileSync(
        resolve(buildWorkspace, relativePath),
        '# Intentionally empty: isolated browser-check configuration.\n',
        { encoding: 'utf8', flag: 'wx', mode: 0o644 },
      );
    }
    return { buildWorkspace, temporaryRoot };
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

function createRunAssetWorkspace(runDirectory) {
  const runtimeDirectory = resolve(runDirectory, 'runtime');
  if (!existsSync(runtimeDirectory)) {
    mkdirSync(runtimeDirectory, { mode: 0o700 });
  }
  const runtimeStat = lstatSync(runtimeDirectory);
  if (
    runtimeStat.isSymbolicLink() ||
    !runtimeStat.isDirectory() ||
    realpathSync(runtimeDirectory) !== runtimeDirectory
  ) {
    throw new Error('Docker browser-check runtime directory must not be redirected');
  }
  const assetWorkspace = resolve(runtimeDirectory, 'assets');
  if (existsSync(assetWorkspace)) {
    throw new Error('Docker browser-check run-local asset workspace must be fresh');
  }
  for (const relativeDirectory of ['public/build', 'bootstrap/ssr', 'storage/framework']) {
    mkdirSync(resolve(assetWorkspace, relativeDirectory), { recursive: true, mode: 0o755 });
  }
  return realpathSync(assetWorkspace);
}

function sanitizedSourceFingerprint(sourceWorkspace) {
  const fingerprint = createHash('sha256');
  let fileCount = 0;
  let totalBytes = 0;
  const excludedRoots = new Set([
    'bootstrap/cache',
    'bootstrap/ssr',
    'node_modules',
    'public/build',
    'storage',
    'vendor',
  ]);
  const visit = (directoryPath, relativeDirectory = '') => {
    for (const entry of readdirSync(directoryPath).sort()) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry}` : entry;
      if (
        [...excludedRoots].some(
          (root) => relativePath === root || relativePath.startsWith(`${root}/`),
        )
      ) {
        continue;
      }
      const entryPath = resolve(directoryPath, entry);
      const entryStat = lstatSync(entryPath);
      if (entryStat.isSymbolicLink()) {
        throw new Error(
          `Sanitized browser-check source must not contain symlinks: ${relativePath}`,
        );
      }
      if (entryStat.isDirectory()) {
        fingerprint.update(`directory\0${relativePath}\0`);
        visit(entryPath, relativePath);
        continue;
      }
      if (!entryStat.isFile() || entryStat.nlink !== 1) {
        throw new Error(
          `Sanitized browser-check source must contain regular files: ${relativePath}`,
        );
      }
      fileCount += 1;
      totalBytes += entryStat.size;
      if (
        fileCount > 50_000 ||
        totalBytes > 512 * 1024 * 1024 ||
        entryStat.size > 64 * 1024 * 1024
      ) {
        throw new Error('Sanitized browser-check source exceeds its fingerprint safety limits');
      }
      const contents = readFileSync(entryPath);
      const finalStat = lstatSync(entryPath);
      if (
        finalStat.ino !== entryStat.ino ||
        finalStat.size !== entryStat.size ||
        finalStat.mtimeMs !== entryStat.mtimeMs
      ) {
        throw new Error(`Sanitized browser-check source changed while hashed: ${relativePath}`);
      }
      fingerprint.update(`file\0${relativePath}\0${entryStat.size}\0`);
      fingerprint.update(contents);
      fingerprint.update('\0');
    }
  };
  visit(sourceWorkspace);
  return `sha256:${fingerprint.digest('hex')}`;
}

function appendDependencyTreeFingerprint(fingerprint, rootDirectory, label) {
  let entryCount = 0;
  let totalBytes = 0;
  const chunk = Buffer.allocUnsafe(64 * 1024);
  const visit = (directoryPath, relativeDirectory = '') => {
    const directoryBefore = lstatSync(directoryPath);
    if (directoryBefore.isSymbolicLink() || !directoryBefore.isDirectory()) {
      throw new Error(`Docker browser-check ${label} dependency root must be a real directory`);
    }
    for (const entry of readdirSync(directoryPath).sort()) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry}` : entry;
      if (label === 'node_modules' && ['.vite', '.vite-temp'].includes(relativePath)) {
        continue;
      }
      const entryPath = resolve(directoryPath, entry);
      const beforeStat = lstatSync(entryPath);
      entryCount += 1;
      if (entryCount > 40_000) {
        throw new Error(`Docker browser-check ${label} exceeds the dependency entry limit`);
      }
      if (beforeStat.isSymbolicLink()) {
        const target = readlinkSync(entryPath);
        const resolvedTarget = realpathSync(entryPath);
        const targetRelative = relative(rootDirectory, resolvedTarget).split(sep).join('/');
        if (targetRelative.startsWith('../') || targetRelative === '..') {
          throw new Error(`Docker browser-check ${label} symlink escapes its dependency root`);
        }
        const afterStat = lstatSync(entryPath);
        if (
          afterStat.ino !== beforeStat.ino ||
          afterStat.mtimeMs !== beforeStat.mtimeMs ||
          readlinkSync(entryPath) !== target
        ) {
          throw new Error(`Docker browser-check ${label} symlink changed while hashed`);
        }
        fingerprint.update(`symlink\0${label}/${relativePath}\0${target}\0`);
        continue;
      }
      if (beforeStat.isDirectory()) {
        fingerprint.update(`directory\0${label}/${relativePath}\0`);
        visit(entryPath, relativePath);
        continue;
      }
      if (!beforeStat.isFile() || beforeStat.nlink !== 1 || beforeStat.size > 128 * 1024 * 1024) {
        throw new Error(`Docker browser-check ${label} contains an unsafe dependency entry`);
      }
      totalBytes += beforeStat.size;
      if (totalBytes > 1024 * 1024 * 1024) {
        throw new Error(`Docker browser-check ${label} exceeds the dependency byte limit`);
      }
      fingerprint.update(`file\0${label}/${relativePath}\0${beforeStat.size}\0`);
      const descriptor = openSync(entryPath, 'r');
      try {
        let offset = 0;
        while (offset < beforeStat.size) {
          const bytesRead = readSync(
            descriptor,
            chunk,
            0,
            Math.min(chunk.length, beforeStat.size - offset),
            offset,
          );
          if (bytesRead === 0) {
            throw new Error(`Docker browser-check ${label} dependency ended while hashed`);
          }
          fingerprint.update(chunk.subarray(0, bytesRead));
          offset += bytesRead;
        }
        const afterStat = fstatSync(descriptor);
        if (
          afterStat.ino !== beforeStat.ino ||
          afterStat.size !== beforeStat.size ||
          afterStat.mtimeMs !== beforeStat.mtimeMs
        ) {
          throw new Error(`Docker browser-check ${label} dependency changed while hashed`);
        }
      } finally {
        closeSync(descriptor);
      }
      fingerprint.update('\0');
    }
    const directoryAfter = lstatSync(directoryPath);
    if (
      directoryAfter.ino !== directoryBefore.ino ||
      directoryAfter.mtimeMs !== directoryBefore.mtimeMs
    ) {
      throw new Error(`Docker browser-check ${label} directory changed while hashed`);
    }
  };
  fingerprint.update(`dependency-tree\0${label}\0`);
  visit(rootDirectory);
}

export function dependencyStateFingerprint(sourceWorkspace, nodeModulesDirectory, vendorDirectory) {
  const readRegularJson = (path, label) => {
    const pathStat = lstatSync(path);
    if (
      pathStat.isSymbolicLink() ||
      !pathStat.isFile() ||
      pathStat.nlink !== 1 ||
      pathStat.size > 8 * 1024 * 1024
    ) {
      throw new Error(`Docker browser-check ${label} must be a bounded regular file`);
    }
    const contents = readFileSync(path);
    const finalStat = lstatSync(path);
    if (
      finalStat.ino !== pathStat.ino ||
      finalStat.size !== pathStat.size ||
      finalStat.mtimeMs !== pathStat.mtimeMs
    ) {
      throw new Error(`Docker browser-check ${label} changed while it was read`);
    }
    try {
      return { contents, value: JSON.parse(contents.toString('utf8')) };
    } catch (error) {
      throw new Error(`Docker browser-check ${label} is not valid JSON: ${error.message}`);
    }
  };
  const packageLock = readRegularJson(
    resolve(sourceWorkspace, 'package-lock.json'),
    'package lock',
  );
  const packageManifest = readRegularJson(
    resolve(sourceWorkspace, 'package.json'),
    'package manifest',
  );
  const installedPackageLock = readRegularJson(
    resolve(nodeModulesDirectory, '.package-lock.json'),
    'installed npm lock',
  );
  const composerLock = readRegularJson(resolve(sourceWorkspace, 'composer.lock'), 'Composer lock');
  const composerManifest = readRegularJson(
    resolve(sourceWorkspace, 'composer.json'),
    'Composer manifest',
  );
  const installedComposer = readRegularJson(
    resolve(vendorDirectory, 'composer/installed.json'),
    'installed Composer metadata',
  );

  if (
    packageLock.value.lockfileVersion !== installedPackageLock.value.lockfileVersion ||
    !packageLock.value.packages ||
    !installedPackageLock.value.packages
  ) {
    throw new Error('Installed npm dependencies do not match package-lock.json');
  }
  const npmIdentity = (entry) =>
    Object.fromEntries(
      ['version', 'resolved', 'integrity', 'link', 'dev', 'optional', 'devOptional', 'inBundle']
        .filter((key) => entry?.[key] !== undefined)
        .map((key) => [key, entry[key]]),
    );
  const expectedNpmPackages = new Map(
    Object.entries(packageLock.value.packages).filter(([path]) => path.startsWith('node_modules/')),
  );
  const installedNpmPackages = new Map(
    Object.entries(installedPackageLock.value.packages).filter(([path]) =>
      path.startsWith('node_modules/'),
    ),
  );
  for (const [path, installed] of installedNpmPackages) {
    const expected = expectedNpmPackages.get(path);
    if (
      !expected ||
      JSON.stringify(npmIdentity(expected)) !== JSON.stringify(npmIdentity(installed))
    ) {
      throw new Error(`Installed npm dependency does not match package-lock.json: ${path}`);
    }
    if (installed.link === true) {
      throw new Error(`Docker browser-check does not accept linked npm dependencies: ${path}`);
    }
    const packagePath = resolve(nodeModulesDirectory, path.slice('node_modules/'.length));
    const packageRelative = relative(nodeModulesDirectory, packagePath).split(sep).join('/');
    if (packageRelative !== path.slice('node_modules/'.length)) {
      throw new Error(`Installed npm dependency path is not canonical: ${path}`);
    }
    const packageStat = lstatSync(packagePath);
    if (packageStat.isSymbolicLink() || !packageStat.isDirectory()) {
      throw new Error(`Installed npm dependency must be a real directory: ${path}`);
    }
    const packageJson = readRegularJson(
      resolve(packagePath, 'package.json'),
      `${path} package.json`,
    );
    if (
      packageJson.value.version !== installed.version ||
      (installed.name !== undefined && packageJson.value.name !== installed.name)
    ) {
      throw new Error(`Installed npm package contents do not match lock metadata: ${path}`);
    }
  }
  for (const [path, expected] of expectedNpmPackages) {
    if (
      !installedNpmPackages.has(path) &&
      expected.optional !== true &&
      expected.devOptional !== true
    ) {
      throw new Error(`Required npm dependency is not installed from package-lock.json: ${path}`);
    }
  }

  const expectedComposerPackages = [
    ...(Array.isArray(composerLock.value.packages) ? composerLock.value.packages : []),
    ...(Array.isArray(composerLock.value['packages-dev'])
      ? composerLock.value['packages-dev']
      : []),
  ];
  const installedComposerPackages = Array.isArray(installedComposer.value)
    ? installedComposer.value
    : installedComposer.value.packages;
  if (!Array.isArray(installedComposerPackages)) {
    throw new Error('Installed Composer metadata does not contain a package list');
  }
  const composerIdentity = (entry) =>
    Object.fromEntries(
      ['name', 'version', 'source', 'dist']
        .filter((key) => entry?.[key] !== undefined)
        .map((key) => [key, entry[key]]),
    );
  const expectedComposerByName = new Map(
    expectedComposerPackages.map((entry) => [entry.name, entry]),
  );
  const installedComposerByName = new Map(
    installedComposerPackages.map((entry) => [entry.name, entry]),
  );
  if (
    expectedComposerByName.size !== expectedComposerPackages.length ||
    installedComposerByName.size !== installedComposerPackages.length ||
    expectedComposerByName.size !== installedComposerByName.size
  ) {
    throw new Error('Installed Composer dependency set does not match composer.lock');
  }
  for (const [name, expected] of expectedComposerByName) {
    const installed = installedComposerByName.get(name);
    if (
      !installed ||
      JSON.stringify(stableValue(composerIdentity(expected))) !==
        JSON.stringify(stableValue(composerIdentity(installed)))
    ) {
      throw new Error(`Installed Composer dependency does not match composer.lock: ${name}`);
    }
  }

  const fingerprint = createHash('sha256');
  fingerprint.update('browser-check-dependencies-v1\0');
  fingerprint.update(packageLock.contents);
  fingerprint.update('\0');
  fingerprint.update(packageManifest.contents);
  fingerprint.update('\0');
  fingerprint.update(composerLock.contents);
  fingerprint.update('\0');
  fingerprint.update(composerManifest.contents);
  fingerprint.update('\0');
  fingerprint.update(
    JSON.stringify(
      stableValue({
        npm: Object.fromEntries(
          [...installedNpmPackages].map(([path, entry]) => [path, npmIdentity(entry)]),
        ),
        composer: Object.fromEntries(
          [...installedComposerByName].map(([name, entry]) => [name, composerIdentity(entry)]),
        ),
      }),
    ),
  );
  appendDependencyTreeFingerprint(fingerprint, nodeModulesDirectory, 'node_modules');
  appendDependencyTreeFingerprint(fingerprint, vendorDirectory, 'vendor');
  return `sha256:${fingerprint.digest('hex')}`;
}

export function dependencyManifestSetId(sourceWorkspace) {
  const fingerprint = createHash('sha256');
  for (const filename of ['package.json', 'package-lock.json', 'composer.json', 'composer.lock']) {
    const path = resolve(sourceWorkspace, filename);
    const pathStat = lstatSync(path);
    if (
      pathStat.isSymbolicLink() ||
      !pathStat.isFile() ||
      pathStat.nlink !== 1 ||
      pathStat.size > 8 * 1024 * 1024
    ) {
      throw new Error(`Docker browser-check ${filename} must be a bounded regular file`);
    }
    const contents = readFileSync(path);
    const finalStat = lstatSync(path);
    if (
      finalStat.ino !== pathStat.ino ||
      finalStat.size !== pathStat.size ||
      finalStat.mtimeMs !== pathStat.mtimeMs
    ) {
      throw new Error(`Docker browser-check ${filename} changed while it was read`);
    }
    fingerprint.update(`${filename}\0`);
    fingerprint.update(contents);
    fingerprint.update('\0');
  }
  return fingerprint.digest('hex');
}

export function trustedDependencyState(sourceWorkspace, markerWorkspace = workspaceRoot) {
  const markerWorkspaceRoot = realpathSync(markerWorkspace);
  const markerPath = resolve(
    markerWorkspaceRoot,
    'storage/framework/browser-check-dependencies.json',
  );
  const markerStat = lstatSync(markerPath);
  if (
    markerStat.isSymbolicLink() ||
    !markerStat.isFile() ||
    markerStat.nlink !== 1 ||
    realpathSync(markerPath) !== markerPath
  ) {
    throw new Error('Browser-check dependencies require a regular clean-install attestation');
  }
  const marker = readBoundedRegularJson(
    markerPath,
    'Browser-check clean-install dependency attestation',
  );
  if (
    JSON.stringify(Object.keys(marker).sort()) !==
      JSON.stringify(['dependenciesFingerprint', 'dependencyRoot', 'schemaVersion']) ||
    marker.schemaVersion !== '2.0' ||
    marker.dependencyRoot !==
      `storage/framework/browser-check-dependencies/${dependencyManifestSetId(sourceWorkspace)}` ||
    !/^sha256:[0-9a-f]{64}$/.test(marker.dependenciesFingerprint)
  ) {
    throw new Error('Browser-check clean-install dependency attestation is malformed');
  }
  const dependencyRoot = resolve(markerWorkspaceRoot, marker.dependencyRoot);
  if (
    relative(markerWorkspaceRoot, dependencyRoot).split(sep).join('/') !== marker.dependencyRoot ||
    !existsSync(dependencyRoot)
  ) {
    throw new Error('Browser-check clean-install dependency root is not canonical');
  }
  const dependencyRootStat = lstatSync(dependencyRoot);
  if (
    dependencyRootStat.isSymbolicLink() ||
    !dependencyRootStat.isDirectory() ||
    realpathSync(dependencyRoot) !== dependencyRoot
  ) {
    throw new Error('Browser-check clean-install dependency root must be a real directory');
  }
  const nodeModulesDirectory = resolve(dependencyRoot, 'node_modules');
  const vendorDirectory = resolve(dependencyRoot, 'vendor');
  const currentFingerprint = dependencyStateFingerprint(
    sourceWorkspace,
    nodeModulesDirectory,
    vendorDirectory,
  );
  if (currentFingerprint !== marker.dependenciesFingerprint) {
    throw new Error(
      'Installed dependencies differ from the clean-install attestation; reinstall from the lockfiles',
    );
  }
  return {
    dependenciesFingerprint: currentFingerprint,
    nodeModulesDirectory: realpathSync(nodeModulesDirectory),
    vendorDirectory: realpathSync(vendorDirectory),
  };
}

export function dockerPlaywrightExecutionTimeout(checkCount) {
  if (!Number.isSafeInteger(checkCount) || checkCount < 1 || checkCount > 12) {
    throw new Error('Docker browser-check requires between 1 and 12 temporary checks');
  }
  const wrapperOverheadMs = 30_000;
  const perCheckBudgetMs = 2 * 30_000;
  const wrapperTerminationGraceMs = 5_000;
  const composeAndPostflightMarginMs = 60_000;
  return (
    wrapperOverheadMs +
    checkCount * perCheckBudgetMs +
    wrapperTerminationGraceMs +
    composeAndPostflightMarginMs
  );
}

export function dockerWrapperCompletionKind({
  claim,
  executionError,
  exitCode,
  plannedCheckIds,
  reportExists,
  manifestExists,
}) {
  if (claim?.postflight?.playwrightExitCode === exitCode && executionError === undefined) {
    return 'postflight';
  }
  const expectedKeys = [
    'affectedCheckIds',
    'classification',
    'message',
    'occurredAt',
    'phase',
    'schemaVersion',
    'scope',
  ];
  if (
    exitCode !== 0 &&
    claim?.postflight === undefined &&
    executionError &&
    JSON.stringify(Object.keys(executionError).sort()) === JSON.stringify(expectedKeys) &&
    executionError.schemaVersion === '1.0' &&
    executionError.phase === 'pre-report' &&
    executionError.scope === 'global' &&
    ['environment-defect', 'check-script-defect'].includes(executionError.classification) &&
    typeof executionError.message === 'string' &&
    executionError.message.trim() !== '' &&
    typeof executionError.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(executionError.occurredAt)) &&
    JSON.stringify(executionError.affectedCheckIds) ===
      JSON.stringify([...plannedCheckIds].sort((left, right) => left.localeCompare(right))) &&
    reportExists === false &&
    manifestExists === false
  ) {
    return 'global-execution-error';
  }
  throw new Error('Docker browser-check exited without a trustworthy wrapper completion');
}

function promoteBuildDirectory(sourceDirectory, destinationDirectory) {
  let copiedBytes = 0;
  let copiedFiles = 0;
  const visit = (source, destination) => {
    for (const entry of readdirSync(source).sort()) {
      const sourcePath = resolve(source, entry);
      const destinationPath = resolve(destination, entry);
      const beforeStat = lstatSync(sourcePath);
      if (beforeStat.isSymbolicLink()) {
        throw new Error(`Browser-check build output must not contain symlinks: ${sourcePath}`);
      }
      if (beforeStat.isDirectory()) {
        mkdirSync(destinationPath, { mode: 0o755 });
        visit(sourcePath, destinationPath);
        continue;
      }
      if (!beforeStat.isFile() || beforeStat.nlink !== 1) {
        throw new Error(`Browser-check build output must be a regular file: ${sourcePath}`);
      }
      copiedBytes += beforeStat.size;
      copiedFiles += 1;
      if (copiedFiles > 20_000) {
        throw new Error('Browser-check build output exceeds the 20,000-file safety limit');
      }
      if (copiedBytes > 1024 * 1024 * 1024) {
        throw new Error('Browser-check build output exceeds the 1 GiB safety limit');
      }
      copyFileSync(sourcePath, destinationPath);
      const afterStat = lstatSync(sourcePath);
      const destinationStat = lstatSync(destinationPath);
      if (
        afterStat.ino !== beforeStat.ino ||
        afterStat.size !== beforeStat.size ||
        afterStat.mtimeMs !== beforeStat.mtimeMs ||
        !destinationStat.isFile() ||
        destinationStat.nlink !== 1 ||
        destinationStat.size !== beforeStat.size
      ) {
        throw new Error(`Browser-check build output changed while copied: ${sourcePath}`);
      }
    }
  };
  visit(sourceDirectory, destinationDirectory);
}

function recordRunLocalAssetMarker(
  assetWorkspace,
  buildWorkspace,
  planRevision,
  dependenciesFingerprint,
) {
  promoteBuildDirectory(
    resolve(buildWorkspace, 'public/build'),
    resolve(assetWorkspace, 'public/build'),
  );
  promoteBuildDirectory(
    resolve(buildWorkspace, 'bootstrap/ssr'),
    resolve(assetWorkspace, 'bootstrap/ssr'),
  );
  const marker = {
    schemaVersion: '1.0',
    revision: {
      headSha: planRevision.headSha,
      worktreeFingerprint: planRevision.worktreeFingerprint,
    },
    dependenciesFingerprint,
    assetsHash: frontendAssetsContentFingerprint(assetWorkspace),
  };
  writeText(
    resolve(assetWorkspace, 'storage/framework/browser-check-assets.json'),
    JSON.stringify(marker, null, 2),
  );
}

function assertExactRecord(actual, expected, label) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    throw new Error(`Docker Compose omitted the exact ${label}`);
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index]) ||
    expectedKeys.some((key) => actual[key] !== expected[key])
  ) {
    throw new Error(`Docker Compose changed the exact ${label}`);
  }
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function assertExactValue(actual, expected, label) {
  if (JSON.stringify(stableValue(actual)) !== JSON.stringify(stableValue(expected))) {
    throw new Error(`Docker Compose changed the exact ${label}`);
  }
}

function assertAllowedServiceKeys(service, serviceName, allowedKeys) {
  const unknownKeys = Object.keys(service).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Docker browser-check service ${serviceName} has forbidden options: ${unknownKeys.join(', ')}`,
    );
  }
}

function assertCanonicalHostPath(path, label) {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink() || realpathSync(path) !== path) {
    throw new Error(`Docker browser-check ${label} must not be redirected`);
  }
  if (pathStat.isFile() && pathStat.nlink !== 1) {
    throw new Error(`Docker browser-check ${label} must not be hard-linked`);
  }
  if (!pathStat.isFile() && !pathStat.isDirectory()) {
    throw new Error(`Docker browser-check ${label} must be a regular file or directory`);
  }
}

function assertExactBuild(service, serviceName, expectedContext, expectedArguments) {
  const build = service.build;
  assertCanonicalHostPath(expectedContext, `${serviceName} build context`);
  assertCanonicalHostPath(resolve(expectedContext, 'Dockerfile'), `${serviceName} Dockerfile`);
  if (!build || build.context !== expectedContext || build.dockerfile !== 'Dockerfile') {
    throw new Error(`Docker browser-check service ${serviceName} changed its build boundary`);
  }
  if (expectedArguments) {
    assertExactRecord(build.args, expectedArguments, `${serviceName} build arguments`);
  } else if (build.args !== undefined) {
    throw new Error(`Docker browser-check service ${serviceName} added build arguments`);
  }
  const allowedBuildKeys = new Set([
    'context',
    'dockerfile',
    ...(expectedArguments ? ['args'] : []),
  ]);
  const unknownBuildKeys = Object.keys(build).filter((key) => !allowedBuildKeys.has(key));
  if (unknownBuildKeys.length > 0) {
    throw new Error(`Docker browser-check service ${serviceName} added unsafe build options`);
  }
}

function assertExactVolumes(service, serviceName, expectedVolumes) {
  const volumes = Array.isArray(service.volumes) ? service.volumes : [];
  if (volumes.length !== expectedVolumes.size) {
    throw new Error(`Docker browser-check service ${serviceName} changed its mount count`);
  }
  for (const [target, expectedSource] of expectedVolumes) {
    assertCanonicalHostPath(expectedSource, `${serviceName} ${target} mount source`);
    const volume = volumes.find((candidate) => candidate?.target === target);
    if (
      !volume ||
      volume.type !== 'bind' ||
      volume.read_only !== true ||
      volume.source !== expectedSource ||
      Object.keys(volume).some(
        (key) => !new Set(['type', 'source', 'target', 'read_only', 'bind']).has(key),
      ) ||
      (volume.bind && Object.keys(volume.bind).length > 0)
    ) {
      throw new Error(
        `Docker browser-check service ${serviceName} changed the exact ${target} mount`,
      );
    }
  }
}

export function verifyRenderedDockerConfiguration(
  config,
  projectName,
  browserBuildDirectory,
  runtimeWorkspace = workspaceRoot,
  nodeModulesDirectory = resolve(workspaceRoot, 'node_modules'),
  vendorDirectory = resolve(workspaceRoot, 'vendor'),
) {
  if (!config || typeof config !== 'object' || config.name !== projectName) {
    throw new Error('Docker Compose rendered an unexpected project');
  }
  const services = config.services;
  const network = config.networks?.['browser-check'];
  const requiredServices = [
    'mysql-browser-check',
    'app-browser-check',
    'browser-check-build',
    'nginx-browser-check',
    'playwright-browser-check',
  ];
  if (!services || !network?.internal || requiredServices.some((name) => !services[name])) {
    throw new Error('Docker Compose omitted an isolated browser-check service or network');
  }
  assertExactValue(
    network,
    { name: `${projectName}_browser-check`, ipam: {}, internal: true },
    'internal browser-check network',
  );
  for (const name of requiredServices) {
    const service = services[name];
    if (Array.isArray(service.ports) && service.ports.length > 0) {
      throw new Error(`Docker browser-check service must not publish host ports: ${name}`);
    }
    if (!service.networks || !Object.hasOwn(service.networks, 'browser-check')) {
      throw new Error(`Docker browser-check service left the internal network: ${name}`);
    }
  }
  const app = services['app-browser-check'];
  const build = services['browser-check-build'];
  const mysql = services['mysql-browser-check'];
  const nginx = services['nginx-browser-check'];
  const playwright = services['playwright-browser-check'];
  if (
    app.environment?.APP_ENV !== 'testing' ||
    app.environment?.DB_HOST !== 'mysql-browser-check' ||
    app.environment?.DB_DATABASE !== 'browser_check' ||
    app.environment?.CACHE_STORE !== 'array' ||
    app.environment?.QUEUE_CONNECTION !== 'sync' ||
    app.environment?.MARKET_DATA_DISPLAY_SOURCE !== 'demo' ||
    app.environment?.ALPHA_VANTAGE_API_KEY !== '' ||
    app.environment?.OPENAI_API_KEY !== '' ||
    mysql.environment?.MYSQL_DATABASE !== 'browser_check' ||
    playwright.environment?.PLAYWRIGHT_BASE_URL !== 'http://nginx-browser-check:80'
  ) {
    throw new Error('Docker Compose rendered an unsafe browser-check environment');
  }
  const commonApplicationEnvironment = {
    ALPHA_VANTAGE_API_KEY: '',
    ALPHA_VANTAGE_BASE_URL: 'http://127.0.0.1:9',
    APP_DEBUG: 'false',
    APP_ENV: 'testing',
    APP_KEY: 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    APP_URL: 'http://localhost',
    AWS_ACCESS_KEY_ID: '',
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_SECRET_ACCESS_KEY: '',
    AWS_SESSION_TOKEN: '',
    CACHE_STORE: 'array',
    DB_CONNECTION: 'mysql',
    DB_DATABASE: 'browser_check',
    DB_HOST: 'mysql-browser-check',
    DB_PASSWORD: 'browser_check_testing_only',
    DB_PORT: '3306',
    DB_USERNAME: 'browser_check',
    INERTIA_SSR_ENABLED: 'false',
    INERTIA_SSR_URL: 'http://127.0.0.1:9',
    MAIL_HOST: '127.0.0.1',
    MAIL_MAILER: 'array',
    MAIL_PORT: '9',
    MARKET_DATA_DISPLAY_SOURCE: 'demo',
    MEMCACHED_HOST: '127.0.0.1',
    OPENAI_API_KEY: '',
    OPENAI_BASE_URL: 'http://127.0.0.1:9',
    QUEUE_CONNECTION: 'sync',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '9',
  };
  assertExactRecord(
    mysql.environment,
    {
      MYSQL_DATABASE: 'browser_check',
      MYSQL_PASSWORD: 'browser_check_testing_only',
      MYSQL_ROOT_PASSWORD: 'browser_check_root_testing_only',
      MYSQL_USER: 'browser_check',
    },
    'mysql-browser-check environment',
  );
  assertExactRecord(
    build.environment,
    commonApplicationEnvironment,
    'browser-check-build environment',
  );
  assertExactRecord(
    app.environment,
    {
      ...commonApplicationEnvironment,
      BROWSER_CHECK_DATABASE_CONNECTION: 'mysql',
      BROWSER_CHECK_DATABASE_IDENTIFIER: 'mysql:mysql-browser-check/browser_check',
      LOG_CHANNEL: 'stderr',
      SESSION_CONNECTION: 'mysql',
      SESSION_COOKIE: 'browser_check_session',
      SESSION_DOMAIN: 'null',
      SESSION_DRIVER: 'database',
      SESSION_ENCRYPT: 'true',
      SESSION_SAME_SITE: 'lax',
      SESSION_SECURE_COOKIE: 'false',
    },
    'app-browser-check environment',
  );
  assertExactRecord(
    playwright.environment,
    {
      BROWSER_CHECK_DATABASE_CONNECTION: 'mysql',
      BROWSER_CHECK_DATABASE_IDENTIFIER: 'mysql:mysql-browser-check/browser_check',
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'safe.directory',
      GIT_CONFIG_VALUE_0: '/app',
      GIT_OPTIONAL_LOCKS: '0',
      PLAYWRIGHT_BASE_URL: 'http://nginx-browser-check:80',
    },
    'playwright-browser-check environment',
  );

  const emptyMask = resolve(workspaceRoot, '.docker/local/browser-check/empty.env');
  if (
    readFileSync(emptyMask, 'utf8').trim() !==
    '# Intentionally empty: masks repository environment files in the isolated browser-check app.'
  ) {
    throw new Error('Docker browser-check configuration mask must remain exactly empty');
  }
  const commonReadOnlyTargets = new Map([
    ['/app', runtimeWorkspace],
    ['/app/public/build', browserBuildDirectory],
    ['/app/.env', emptyMask],
    ['/app/.env.testing', emptyMask],
    ['/app/.env.local', emptyMask],
    ['/app/.env.production', emptyMask],
    ['/app/.env.production.local', emptyMask],
    ['/app/.npmrc', emptyMask],
    ['/app/.git/config', emptyMask],
  ]);
  assertExactVolumes(
    app,
    'app-browser-check',
    new Map([
      ...commonReadOnlyTargets,
      ['/app/vendor', vendorDirectory],
      ['/usr/local/etc/php/conf.d/php.ini', resolve(workspaceRoot, '.docker/local/php/php.ini')],
      [
        '/usr/local/etc/php-fpm.d/www.conf',
        resolve(workspaceRoot, '.docker/local/php-fpm/www.conf'),
      ],
    ]),
  );
  assertExactVolumes(
    playwright,
    'playwright-browser-check',
    new Map([...commonReadOnlyTargets, ['/app/node_modules', nodeModulesDirectory]]),
  );
  assertExactVolumes(
    mysql,
    'mysql-browser-check',
    new Map([['/etc/mysql/my.cnf', resolve(workspaceRoot, '.docker/local/mysql/my.cnf')]]),
  );
  assertExactVolumes(
    nginx,
    'nginx-browser-check',
    new Map([
      ['/app/public', resolve(runtimeWorkspace, 'public')],
      ['/app/public/build', browserBuildDirectory],
      [
        '/etc/nginx/nginx.conf',
        resolve(workspaceRoot, '.docker/local/nginx/nginx.browser-check.conf'),
      ],
    ]),
  );
  assertExactVolumes(build, 'browser-check-build', new Map());

  assertExactBuild(mysql, 'mysql-browser-check', resolve(workspaceRoot, '.docker/local/mysql'));
  assertExactBuild(app, 'app-browser-check', resolve(workspaceRoot, '.docker/local/php'));
  assertExactBuild(build, 'browser-check-build', resolve(workspaceRoot, '.docker/local/php'));
  assertExactBuild(nginx, 'nginx-browser-check', resolve(workspaceRoot, '.docker/local/nginx'));
  assertExactBuild(
    playwright,
    'playwright-browser-check',
    resolve(workspaceRoot, '.docker/local/playwright'),
    { GROUP_ID: '1000', USER_ID: '1000' },
  );

  const commonAllowedKeys = new Set([
    'profiles',
    'build',
    'command',
    'entrypoint',
    'networks',
    'cpus',
    'mem_limit',
    'pids_limit',
  ]);
  assertAllowedServiceKeys(
    mysql,
    'mysql-browser-check',
    new Set([...commonAllowedKeys, 'environment', 'healthcheck', 'platform', 'tmpfs', 'volumes']),
  );
  assertAllowedServiceKeys(
    app,
    'app-browser-check',
    new Set([
      ...commonAllowedKeys,
      'depends_on',
      'environment',
      'healthcheck',
      'read_only',
      'tmpfs',
      'ulimits',
      'volumes',
      'working_dir',
    ]),
  );
  assertAllowedServiceKeys(
    build,
    'browser-check-build',
    new Set([...commonAllowedKeys, 'environment', 'read_only', 'tmpfs', 'ulimits', 'working_dir']),
  );
  assertAllowedServiceKeys(
    nginx,
    'nginx-browser-check',
    new Set([...commonAllowedKeys, 'depends_on', 'healthcheck', 'volumes']),
  );
  assertAllowedServiceKeys(
    playwright,
    'playwright-browser-check',
    new Set([
      ...commonAllowedKeys,
      'depends_on',
      'environment',
      'init',
      'read_only',
      'shm_size',
      'tmpfs',
      'ulimits',
      'volumes',
      'working_dir',
    ]),
  );
  for (const name of requiredServices) {
    const service = services[name];
    assertExactValue(service.profiles, ['browser-check'], `${name} profiles`);
    assertExactValue(service.networks, { 'browser-check': null }, `${name} networks`);
    if (service.command !== null || service.entrypoint !== null) {
      if (name !== 'app-browser-check') {
        throw new Error(`Docker browser-check service ${name} changed its process command`);
      }
    }
  }
  assertExactValue(
    app.command,
    [
      '/bin/sh',
      '-lc',
      'mkdir -p bootstrap/cache storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs && chmod -R 0777 bootstrap/cache storage && php artisan migrate:fresh --force --env=testing && php artisan db:seed --class=StockAnalysisDemoSeeder --force --env=testing && exec php-fpm',
    ],
    'app-browser-check command',
  );
  assertExactValue(mysql.tmpfs, ['/var/lib/mysql'], 'mysql-browser-check tmpfs');
  assertExactValue(
    app.tmpfs,
    [
      '/app/bootstrap/cache:mode=1777',
      '/app/storage:mode=1777',
      '/tmp:mode=1777',
      '/usr/local/var/run:mode=1777',
      '/var/log/php:mode=1777',
    ],
    'app-browser-check tmpfs',
  );
  assertExactValue(
    build.tmpfs,
    [
      '/tmp:mode=1777',
      '/workspace/node_modules/.vite:mode=1777',
      '/workspace/node_modules/.vite-temp:mode=1777',
    ],
    'browser-check-build tmpfs',
  );
  assertExactValue(playwright.tmpfs, ['/tmp:mode=1777'], 'playwright-browser-check tmpfs');
  assertExactValue(
    app.depends_on,
    { 'mysql-browser-check': { condition: 'service_healthy', required: true } },
    'app-browser-check dependencies',
  );
  assertExactValue(
    nginx.depends_on,
    { 'app-browser-check': { condition: 'service_healthy', required: true } },
    'nginx-browser-check dependencies',
  );
  assertExactValue(
    playwright.depends_on,
    { 'nginx-browser-check': { condition: 'service_healthy', required: true } },
    'playwright-browser-check dependencies',
  );
  assertExactValue(
    mysql.healthcheck,
    {
      test: [
        'CMD-SHELL',
        'MYSQL_PWD="$${MYSQL_PASSWORD}" mysqladmin ping -h 127.0.0.1 -u$${MYSQL_USER} --silent',
      ],
      timeout: '5s',
      interval: '2s',
      retries: 30,
      start_period: '10s',
    },
    'mysql-browser-check healthcheck',
  );
  assertExactValue(
    app.healthcheck,
    {
      test: ['CMD', 'php', '-r', "exit(@fsockopen('127.0.0.1', 9000) ? 0 : 1);"],
      timeout: '5s',
      interval: '2s',
      retries: 30,
      start_period: '30s',
    },
    'app-browser-check healthcheck',
  );
  assertExactValue(
    nginx.healthcheck,
    {
      test: ['CMD-SHELL', 'nginx -t && kill -0 $$(cat /var/run/nginx.pid)'],
      timeout: '5s',
      interval: '2s',
      retries: 30,
      start_period: '5s',
    },
    'nginx-browser-check healthcheck',
  );
  assertExactValue(
    {
      mysql: [mysql.cpus, mysql.mem_limit, mysql.pids_limit],
      app: [app.cpus, app.mem_limit, app.pids_limit],
      build: [build.cpus, build.mem_limit, build.pids_limit],
      nginx: [nginx.cpus, nginx.mem_limit, nginx.pids_limit],
      playwright: [playwright.cpus, playwright.mem_limit, playwright.pids_limit],
    },
    {
      mysql: [2, '1073741824', 256],
      app: [2, '1073741824', 256],
      build: [2, '2147483648', 256],
      nginx: [1, '268435456', 64],
      playwright: [2, '3221225472', 512],
    },
    'browser-check resource limits',
  );
  assertExactValue(
    build.ulimits,
    {
      fsize: { soft: 268435456, hard: 268435456 },
      nofile: { soft: 4096, hard: 4096 },
    },
    'browser-check-build ulimits',
  );
  assertExactValue(
    app.ulimits,
    {
      fsize: { soft: 268435456, hard: 268435456 },
      nofile: { soft: 4096, hard: 4096 },
    },
    'app-browser-check ulimits',
  );
  assertExactValue(
    playwright.ulimits,
    {
      fsize: { soft: 536870912, hard: 536870912 },
      nofile: { soft: 4096, hard: 4096 },
    },
    'playwright-browser-check ulimits',
  );
  if (
    mysql.platform !== 'linux/amd64' ||
    app.entrypoint !== null ||
    app.working_dir !== '/app' ||
    app.read_only !== true ||
    build.working_dir !== '/workspace' ||
    playwright.working_dir !== '/app' ||
    build.read_only !== true ||
    playwright.read_only !== true ||
    playwright.init !== true ||
    playwright.shm_size !== '2147483648'
  ) {
    throw new Error('Docker Compose changed a browser-check runtime boundary');
  }
  if (
    playwright.read_only !== true ||
    playwright.environment?.GIT_OPTIONAL_LOCKS !== '0' ||
    playwright.environment?.GIT_CONFIG_KEY_0 !== 'safe.directory' ||
    playwright.environment?.GIT_CONFIG_VALUE_0 !== '/app'
  ) {
    throw new Error('Docker Compose did not preserve the read-only Playwright boundary');
  }
}

export async function runDockerBrowserCheck(
  runDirRelative,
  { useAuthState = false, wrapperArguments = [] } = {},
) {
  if (typeof runDirRelative !== 'string' || typeof useAuthState !== 'boolean') {
    throw new Error('Docker browser-check requires a relative run directory and boolean auth mode');
  }
  if (useAuthState) {
    throw new Error(
      'Docker browser-check requires explicit in-check login; reusable auth state is unsupported',
    );
  }
  if (
    !Array.isArray(wrapperArguments) ||
    wrapperArguments.some((argument) => argument !== '--headed')
  ) {
    throw new Error('Docker browser-check supports only the optional --headed wrapper argument');
  }
  const requestedRunDirectory = resolve(workspaceRoot, runDirRelative);
  const requestedRunStat = lstatSync(requestedRunDirectory);
  const realRunDirectory = realpathSync(requestedRunDirectory);
  const canonicalRunDirRelative = relative(workspaceRoot, realRunDirectory).split(sep).join('/');
  if (
    requestedRunStat.isSymbolicLink() ||
    !requestedRunStat.isDirectory() ||
    canonicalRunDirRelative !== runDirRelative ||
    !/^test-results\/change-verification\/[A-Za-z0-9][A-Za-z0-9._-]*\/\d{14}$/.test(
      canonicalRunDirRelative,
    )
  ) {
    throw new Error('Docker browser-check run directory must be a canonical run-owned directory');
  }
  const runId = runDirRelative.split('/').at(-1) ?? '';
  if (!/^\d{14}$/.test(runId)) {
    throw new Error('Docker browser-check requires a validated timestamp run ID');
  }
  const projectName = `browser-check-${runId}-${process.pid}`;
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(projectName)) {
    throw new Error('Docker browser-check project name is invalid');
  }
  const dockerEnvironment = dockerClientEnvironment();
  const temporaryRoots = [];
  let primaryError;
  let cleanupError;
  let trustedRevision;
  let dependenciesFingerprint;
  let browserCheckExitCode = 0;
  let browserCheckCompleted = false;
  let projectTouched = false;
  let assetWorkspace;
  let composeArguments;
  const cleanup = async () => {
    if (!projectTouched) {
      return;
    }
    await runDockerCommand(
      [
        ...composeArguments,
        'down',
        '--remove-orphans',
        '--volumes',
        '--rmi',
        'local',
        '--timeout',
        '10',
      ],
      dockerEnvironment,
      120_000,
    );
    projectTouched = false;
  };
  let handlingSignal = false;
  const handleSignal = async (signal) => {
    if (handlingSignal) {
      return;
    }
    handlingSignal = true;
    try {
      for (const child of activeDockerProcesses) {
        signalDockerProcess(child, 'SIGTERM');
      }
      await cleanup();
    } catch (error) {
      console.error(`Docker browser-check signal cleanup failed: ${error.message}`);
    } finally {
      for (const temporaryRoot of temporaryRoots) {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
      if (assetWorkspace && existsSync(assetWorkspace)) {
        rmSync(assetWorkspace, { recursive: true, force: true });
      }
    }
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  const handleInterrupt = () => void handleSignal('SIGINT');
  const handleTermination = () => void handleSignal('SIGTERM');
  process.once('SIGINT', handleInterrupt);
  process.once('SIGTERM', handleTermination);

  try {
    await requireLocalDockerEndpoint(dockerEnvironment);
    assetWorkspace = createRunAssetWorkspace(realRunDirectory);
    const buildSource = createSanitizedBuildWorkspace(dockerEnvironment);
    temporaryRoots.push(buildSource.temporaryRoot);
    const runtimeSource = createSanitizedBuildWorkspace(dockerEnvironment);
    temporaryRoots.push(runtimeSource.temporaryRoot);
    const buildWorkspace = buildSource.buildWorkspace;
    const runtimeWorkspace = runtimeSource.buildWorkspace;
    const expectedSanitizedSourceHash = sanitizedSourceFingerprint(runtimeWorkspace);
    for (const relativeDirectory of ['node_modules', 'vendor', canonicalRunDirRelative]) {
      mkdirSync(resolve(runtimeWorkspace, relativeDirectory), { recursive: true, mode: 0o755 });
    }
    const browserBuildDirectory = realpathSync(resolve(assetWorkspace, 'public/build'));
    dockerEnvironment.BROWSER_CHECK_BUILD_DIR = browserBuildDirectory;
    dockerEnvironment.BROWSER_CHECK_SOURCE_DIR = runtimeWorkspace;
    const trustedDependencies = trustedDependencyState(runtimeWorkspace, workspaceRoot);
    const { nodeModulesDirectory, vendorDirectory } = trustedDependencies;
    dependenciesFingerprint = trustedDependencies.dependenciesFingerprint;
    dockerEnvironment.BROWSER_CHECK_NODE_MODULES_DIR = nodeModulesDirectory;
    dockerEnvironment.BROWSER_CHECK_VENDOR_DIR = vendorDirectory;
    const dockerUser = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
    const composePath = realpathSync(resolve(workspaceRoot, 'compose.yml'));
    const composeEnvironmentPath = realpathSync(
      resolve(workspaceRoot, '.docker/local/browser-check/empty.env'),
    );
    composeArguments = [
      'compose',
      '--project-name',
      projectName,
      '--project-directory',
      workspaceRoot,
      '--file',
      composePath,
      '--env-file',
      composeEnvironmentPath,
      '--profile',
      'browser-check',
    ];
    const services = ['app-browser-check', 'nginx-browser-check'];
    let renderedConfiguration;
    try {
      renderedConfiguration = JSON.parse(
        await captureDockerCommand(
          [...composeArguments, 'config', '--format', 'json'],
          dockerEnvironment,
          60_000,
        ),
      );
    } catch (error) {
      throw new Error(`Docker browser-check configuration is invalid: ${error.message}`);
    }
    verifyRenderedDockerConfiguration(
      renderedConfiguration,
      projectName,
      browserBuildDirectory,
      runtimeWorkspace,
      nodeModulesDirectory,
      vendorDirectory,
    );
    projectTouched = true;
    await runDockerCommand(
      [...composeArguments, 'build', 'playwright-browser-check'],
      dockerEnvironment,
      600_000,
    );
    await runDockerCommand(
      [...composeArguments, 'up', '-d', '--force-recreate', '--wait', 'mysql-browser-check'],
      dockerEnvironment,
      600_000,
    );

    await runDockerCommand(
      [
        ...composeArguments,
        'run',
        '--rm',
        '--no-deps',
        '--build',
        '--user',
        dockerUser,
        '--volume',
        `${buildWorkspace}:/workspace:rw`,
        '--volume',
        `${nodeModulesDirectory}:/workspace/node_modules:ro`,
        '--volume',
        `${vendorDirectory}:/workspace/vendor:ro`,
        '-e',
        'NPM_CONFIG_CACHE=/tmp/browser-check-npm-cache',
        '-e',
        'NPM_CONFIG_USERCONFIG=/workspace/.npmrc',
        '-e',
        'XDG_CACHE_HOME=/tmp/browser-check-cache',
        'browser-check-build',
        'npm',
        'run',
        'build:all',
      ],
      dockerEnvironment,
      600_000,
    );

    if (sanitizedSourceFingerprint(buildWorkspace) !== expectedSanitizedSourceHash) {
      throw new Error(
        'The isolated frontend build changed source files; commit generated sources before verification',
      );
    }
    if (
      dependencyStateFingerprint(runtimeWorkspace, nodeModulesDirectory, vendorDirectory) !==
      dependenciesFingerprint
    ) {
      throw new Error('Installed dependencies changed during the isolated frontend build');
    }

    const plan = JSON.parse(readFileSync(resolve(realRunDirectory, 'plan.json'), 'utf8'));
    const temporaryCheckCount = Array.isArray(plan?.checks)
      ? plan.checks.filter((check) => check?.driver === 'playwright-temporary').length
      : 0;
    const dockerPlaywrightTimeout = dockerPlaywrightExecutionTimeout(temporaryCheckCount);
    trustedRevision = revisionSnapshot(plan?.change?.baseRef, workspaceRoot);
    if (
      !plan?.revision ||
      plan.revision.baseSha !== trustedRevision.baseSha ||
      plan.revision.headSha !== trustedRevision.headSha ||
      plan.revision.worktreeFingerprint !== trustedRevision.worktreeFingerprint
    ) {
      throw new Error('Docker browser-check plan revision changed before the isolated build');
    }
    recordRunLocalAssetMarker(
      assetWorkspace,
      buildWorkspace,
      plan.revision,
      dependenciesFingerprint,
    );

    await runDockerCommand(
      [...composeArguments, 'up', '-d', '--force-recreate', '--wait', ...services],
      dockerEnvironment,
      600_000,
    );

    const verifyIsolatedConfiguration = String.raw`
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$isEmpty = static fn ($value): bool => $value === null || $value === '';
$secretKeys = [
    'services.postmark.key',
    'services.resend.key',
    'services.ses.key',
    'services.ses.secret',
    'services.slack.notifications.bot_user_oauth_token',
    'services.slack.notifications.channel',
    'services.alpha_vantage.api_key',
    'services.openai.api_key',
    'mail.mailers.smtp.username',
    'mail.mailers.smtp.password',
    'logging.channels.slack.url',
];
foreach ($secretKeys as $key) {
    if (! $isEmpty(config($key))) {
        fwrite(STDERR, "Unsafe browser-check secret: {$key}\n");
        exit(2);
    }
}
$emptyEnvironmentContents = '# Intentionally empty: masks repository environment files in the isolated browser-check app.';
foreach (['/app/.env', '/app/.env.testing', '/app/.env.local', '/app/.env.production', '/app/.env.production.local', '/app/.npmrc', '/app/.git/config'] as $environmentFile) {
    if (trim((string) file_get_contents($environmentFile)) !== $emptyEnvironmentContents) {
        fwrite(STDERR, "Browser-check environment mask is missing: {$environmentFile}\n");
        exit(2);
    }
}
$safeConfiguration = [
    config('app.env') === 'testing',
    config('app.debug') === false,
    config('app.key') === 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    config('app.url') === 'http://localhost',
    config('database.default') === 'mysql',
    config('database.connections.mysql.host') === 'mysql-browser-check',
    config('database.connections.mysql.database') === 'browser_check',
    config('database.redis.default.host') === '127.0.0.1',
    (int) config('database.redis.default.port') === 9,
    config('cache.default') === 'array',
    config('cache.stores.memcached.servers.0.host') === '127.0.0.1',
    config('queue.default') === 'sync',
    config('mail.default') === 'array',
    config('services.stock_analysis.price_display_source') === 'demo',
    config('services.alpha_vantage.base_url') === 'http://127.0.0.1:9',
    config('services.openai.base_url') === 'http://127.0.0.1:9',
    config('inertia.ssr.enabled') === false,
    config('inertia.ssr.url') === 'http://127.0.0.1:9',
];
if (in_array(false, $safeConfiguration, true)) {
    fwrite(STDERR, "Browser-check external integrations are not safely disabled.\n");
    exit(2);
}
echo "Docker browser-check application configuration is isolated.\n";
`;
    await runDockerCommand(
      [
        ...composeArguments,
        'exec',
        '-T',
        'app-browser-check',
        'php',
        '-r',
        verifyIsolatedConfiguration,
      ],
      dockerEnvironment,
      60_000,
    );

    browserCheckExitCode = await runDockerCommandStatus(
      [
        ...composeArguments,
        'run',
        '--rm',
        '--no-deps',
        '--user',
        dockerUser,
        '--volume',
        `${realRunDirectory}:/app/${canonicalRunDirRelative}:rw`,
        '-e',
        'NPM_CONFIG_CACHE=/tmp/browser-check-npm-cache',
        '-e',
        'NPM_CONFIG_USERCONFIG=/app/.npmrc',
        '-e',
        'XDG_CACHE_HOME=/tmp/browser-check-cache',
        '-e',
        'PLAYWRIGHT_BROWSERS_PATH=/ms-playwright',
        '-e',
        `BROWSER_CHECK_RUN_DIR=${runDirRelative}`,
        '-e',
        'BROWSER_CHECK_USE_AUTH_STATE=false',
        '-e',
        `BROWSER_CHECK_ASSET_WORKSPACE=${canonicalRunDirRelative}/runtime/assets`,
        '-e',
        'PLAYWRIGHT_BASE_URL=http://nginx-browser-check:80',
        '-e',
        'BROWSER_CHECK_DATABASE_CONNECTION=mysql',
        '-e',
        'BROWSER_CHECK_DATABASE_IDENTIFIER=mysql:mysql-browser-check/browser_check',
        '-e',
        'GIT_OPTIONAL_LOCKS=0',
        '-e',
        'GIT_CONFIG_COUNT=1',
        '-e',
        'GIT_CONFIG_KEY_0=safe.directory',
        '-e',
        'GIT_CONFIG_VALUE_0=/app',
        '-e',
        `BROWSER_CHECK_TRUSTED_BASE_SHA=${trustedRevision.baseSha}`,
        '-e',
        `BROWSER_CHECK_TRUSTED_HEAD_SHA=${trustedRevision.headSha}`,
        '-e',
        `BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT=${trustedRevision.worktreeFingerprint}`,
        '-e',
        `BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT=${dependenciesFingerprint}`,
        'playwright-browser-check',
        ...(wrapperArguments.includes('--headed') ? ['xvfb-run', '-a'] : []),
        'npm',
        'run',
        'test:browser-check',
        ...(wrapperArguments.length > 0 ? ['--', ...wrapperArguments] : []),
      ],
      dockerEnvironment,
      dockerPlaywrightTimeout,
    );
    const completedClaim = readBoundedRegularJson(
      resolve(realRunDirectory, '.browser-check-run.json'),
      'Docker browser-check claim',
    );
    const executionErrorPath = resolve(realRunDirectory, '.browser-check-execution-error.json');
    const executionError = existsSync(executionErrorPath)
      ? readBoundedRegularJson(executionErrorPath, 'Docker browser-check global execution error')
      : undefined;
    dockerWrapperCompletionKind({
      claim: completedClaim,
      executionError,
      exitCode: browserCheckExitCode,
      plannedCheckIds: plan.checks
        .filter((check) => check?.driver === 'playwright-temporary')
        .map((check) => check.id),
      reportExists: existsSync(resolve(realRunDirectory, 'playwright-results.json')),
      manifestExists: existsSync(resolve(realRunDirectory, '.browser-check-artifacts.json')),
    });
    browserCheckCompleted = true;
    if (
      dependencyStateFingerprint(runtimeWorkspace, nodeModulesDirectory, vendorDirectory) !==
      dependenciesFingerprint
    ) {
      throw new Error('Installed dependencies changed during Docker browser-check execution');
    }
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await cleanup();
    } catch (error) {
      cleanupError = error;
    }
    process.removeListener('SIGINT', handleInterrupt);
    process.removeListener('SIGTERM', handleTermination);
    for (const temporaryRoot of temporaryRoots) {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
    if (
      (primaryError || (cleanupError && !browserCheckCompleted)) &&
      assetWorkspace &&
      existsSync(assetWorkspace)
    ) {
      rmSync(assetWorkspace, { recursive: true, force: true });
    }
  }
  if (primaryError) {
    if (cleanupError) {
      console.error(`Docker browser-check cleanup also failed: ${cleanupError.message}`);
    }
    throw primaryError;
  }
  if (cleanupError) {
    throw cleanupError;
  }
  return browserCheckExitCode;
}

async function runSmoke() {
  const startedAt = new Date();
  const { runDir, runId } = createRunDirectory(startedAt);
  const runDirRelative = relative(workspaceRoot, runDir).split(sep).join('/');
  const databaseIdentifier = isDockerMode
    ? 'mysql:mysql-browser-check/browser_check'
    : `sqlite:${runDirRelative}/runtime/browser-check.sqlite`;
  const screenshotEvidencePath = `evidence/screenshots/${checkId}-${runId}.png`;
  const screenshotSourcePath = `${runDirRelative}/${screenshotEvidencePath}`;
  const revision = revisionSnapshot(baseRef, workspaceRoot);

  const plan = {
    schemaVersion: '1.0',
    change: {
      id: changeId,
      title: `Isolated ${smokeMode} browser-check pipeline smoke`,
      source: 'continuous-integration',
      baseRef,
      headRef: 'HEAD',
      summary: `Exercise the real ${smokeMode} guest browser-check pipeline and its evidence contract.`,
    },
    revision,
    environment: {
      baseUrl,
      appEnvironment: 'testing',
      browser: 'chromium',
      locale: 'ja-JP',
      timezone: 'Asia/Tokyo',
      useAuthState: false,
    },
    scope: {
      affectedFiles: ['resources/js/pages/auth/Login.tsx'],
      routes: ['/login'],
    },
    existingTestCommands: [],
    delegatedWorkItems: [],
    unnecessaryChecks: [],
    assumptions: ['The built frontend assets are available to the isolated testing server.'],
    specificationGaps: [],
    checks: [
      {
        id: checkId,
        title: 'Guest login surface is visible',
        risk: 'The temporary browser-check runtime cannot render a deterministic guest route.',
        priority: 'P1',
        responsibility: 'browser',
        lifecycle: 'change-only',
        driver: 'playwright-temporary',
        evaluationMode: 'objective',
        target: {
          url: '/login',
          files: ['resources/js/pages/auth/Login.tsx'],
        },
        preconditions: ['StockAnalysisDemoSeeder completed in the isolated testing database.'],
        steps: ['Open the login page as a guest.'],
        expectedResults: ['The login submit button is visible.'],
        evidence: ['Playwright JSON', 'focused screenshot'],
        promotionCandidate: false,
        status: 'planned',
      },
    ],
  };

  mkdirSync(resolve(runDir, 'generated'), { mode: 0o700 });
  mkdirSync(resolve(runDir, 'evidence'), { mode: 0o700 });
  mkdirSync(resolve(runDir, 'evidence/screenshots'), { mode: 0o700 });
  writeText(resolve(runDir, 'plan.json'), JSON.stringify(plan, null, 2));
  writeText(
    resolve(runDir, 'plan.md'),
    `# Change Verification Plan

- id: ${changeId}
- title: ${plan.change.title}
- source: ${plan.change.source}
- baseRef: ${baseRef}
- headRef: ${plan.change.headRef}
- summary: ${plan.change.summary}
- baseSha: ${revision.baseSha}
- headSha: ${revision.headSha}
- worktreeFingerprint: ${revision.worktreeFingerprint}
- baseUrl: ${baseUrl}
- appEnvironment: testing
- browser: chromium
- locale: ja-JP
- timezone: Asia/Tokyo
- useAuthState: false
- affected file: resources/js/pages/auth/Login.tsx
- route: /login

| Check ID | Title | Priority | Responsibility | Lifecycle | Driver | Evaluation Mode | Risk | Promotion Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| ${checkId} | Guest login surface is visible | P1 | browser | change-only | playwright-temporary | objective | The temporary browser-check runtime cannot render a deterministic guest route. | false | planned |

### \`${checkId}\`

- /login
- resources/js/pages/auth/Login.tsx
- StockAnalysisDemoSeeder completed in the isolated testing database.
- Open the login page as a guest.
- The login submit button is visible.
- Playwright JSON
- focused screenshot

## Delegated Work

| Delegated Work ID | Type | Priority | Required For Verdict | Status | Target | Reason |
|---|---|---|---|---|---|---|

No delegated work.

## Unnecessary Checks

- None

## Assumptions

- The built frontend assets are available to the isolated testing server.

## Specification Gaps

- None`,
  );
  writeText(
    resolve(runDir, 'generated/login.check.spec.ts'),
    `import { expect, test } from '../../../../../playwright.browser-check.fixture';

test('${checkId} guest login surface is visible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'ログインする' })).toBeVisible();
  await page.screenshot({ path: '${screenshotSourcePath}' });
});`,
  );

  const executionEnvironment = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
    BROWSER_CHECK_RUN_DIR: runDirRelative,
    BROWSER_CHECK_USE_AUTH_STATE: 'false',
    BROWSER_CHECK_DATABASE_CONNECTION: isDockerMode ? 'mysql' : 'sqlite',
    BROWSER_CHECK_DATABASE_IDENTIFIER: databaseIdentifier,
  };
  delete executionEnvironment.BROWSER_CHECK_CONTRACT_TEST_TIMEOUT;

  if (isDockerMode) {
    const dockerExitCode = await runDockerBrowserCheck(runDirRelative);
    if (dockerExitCode !== 0) {
      throw new Error(`Docker browser-check smoke exited ${dockerExitCode}`);
    }
  } else {
    executionEnvironment.BROWSER_CHECK_TRUSTED_HOST_SMOKE = 'true';
    runNode(
      resolve(workspaceRoot, '.codex/skills/run-change-verification/scripts/run-browser-check.mjs'),
      [],
      executionEnvironment,
      300_000,
    );
  }

  const manifest = JSON.parse(
    readFileSync(resolve(runDir, '.browser-check-artifacts.json'), 'utf8'),
  );
  const manifestPaths = Array.isArray(manifest.files)
    ? manifest.files.map((file) => file?.path).filter((path) => typeof path === 'string')
    : [];
  if (
    !manifestPaths.includes('playwright-results.json') ||
    !manifestPaths.includes(screenshotEvidencePath) ||
    manifestPaths.some((path) => path === 'traces' || path.endsWith('/trace.zip'))
  ) {
    throw new Error('The real browser-check run did not produce a report and safe screenshot');
  }

  const completedAt = new Date();
  const actualResult = 'The isolated guest login page rendered its login submit button.';
  const executionNote = isDockerMode
    ? 'Executed through the wrapper and the isolated Docker browser-check profile.'
    : 'Executed through the wrapper, isolated host server, config, and fixture.';
  const result = {
    schemaVersion: '1.0',
    changeId,
    runId,
    revision,
    startedAt: jstTimestamp(startedAt),
    completedAt: jstTimestamp(completedAt),
    summary: {
      pass: 1,
      fail: 0,
      blocked: 0,
      notRun: 0,
      observation: 0,
      notRequired: 0,
    },
    issueRecords: [],
    results: [
      {
        checkId,
        driver: 'playwright-temporary',
        status: 'pass',
        actualResult,
        environment: {
          browser: 'chromium',
          viewport: '1280x720',
          baseUrl,
        },
        evidence: ['playwright-results.json', screenshotEvidencePath],
        issues: [],
        executionNotes: [executionNote],
      },
    ],
  };

  writeText(resolve(runDir, 'result.json'), JSON.stringify(result, null, 2));
  writeText(
    resolve(runDir, 'result.md'),
    `# Change Verification Result

- Change ID: ${changeId}
- Run ID: ${runId}
- baseSha: ${revision.baseSha}
- headSha: ${revision.headSha}
- worktreeFingerprint: ${revision.worktreeFingerprint}

| Check ID | Driver | Status | Actual Result |
|---|---|---|---|
| ${checkId} | playwright-temporary | pass | ${actualResult} |

### \`${checkId}\`

- chromium
- 1280x720
- ${baseUrl}
- playwright-results.json
- ${screenshotEvidencePath}
- ${executionNote}

Summary counts: pass=1; fail=0; blocked=0; notRun=0; observation=0; notRequired=0`,
  );
  writeText(
    resolve(runDir, 'review.md'),
    `# Change Verification Review

- ${checkId}

Corrected summary counts: pass=1; fail=0; blocked=0; notRun=0; observation=0; notRequired=0

## Verdict

\`pass\``,
  );
  writeText(
    resolve(runDir, 'promotion.md'),
    `# Promotion Review

| Check ID | Recommendation | Rationale | Target E2E Specification | Target Playwright Test | Test Data | Lower-Level Dependencies | Runtime, Flakiness, and Maintenance Risk |
|---|---|---|---|---|---|---|---|
| ${checkId} | keep-change-only | This smoke protects the verification pipeline rather than a product behavior contract. | not applicable | not applicable | StockAnalysisDemoSeeder | not applicable | CI-only smoke execution has bounded runtime and no permanent product test surface. |`,
  );
  writeText(resolve(runDir, 'issues.md'), '# Issues\n\nNo issues recorded.');

  runNode(
    resolve(
      workspaceRoot,
      '.codex/skills/run-change-verification/scripts/validate-change-verification.mjs',
    ),
    [runDirRelative],
    process.env,
    30_000,
  );

  console.log(`Browser-check smoke artifacts are valid: ${runDirRelative}`);
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  await runSmoke();
}
