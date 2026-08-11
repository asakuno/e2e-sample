#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, isAbsolute, relative, resolve, sep } from 'node:path';
import {
  dependencyManifestSetId,
  dependencyStateFingerprint,
  prepareDockerNodeModulesCacheMountpoints,
} from './run-browser-check-smoke.mjs';

const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const TERMINATION_GRACE_MS = 5_000;
const workspaceRoot = realpathSync(process.cwd());

function pathIsInside(parent, candidate) {
  const candidateRelative = relative(parent, candidate);
  return (
    candidateRelative !== '' &&
    candidateRelative !== '..' &&
    !candidateRelative.startsWith(`..${sep}`) &&
    !isAbsolute(candidateRelative)
  );
}

function trustedExecutable(name) {
  for (const pathEntry of (process.env.PATH ?? '').split(delimiter)) {
    if (!pathEntry || !isAbsolute(pathEntry)) {
      continue;
    }
    const candidate = resolve(pathEntry, name);
    try {
      accessSync(candidate, constants.X_OK);
      const realCandidate = realpathSync(candidate);
      const candidateStat = lstatSync(realCandidate);
      if (candidateStat.isFile() && !pathIsInside(workspaceRoot, realCandidate)) {
        return realCandidate;
      }
    } catch {
      // Continue until an executable outside the revision-controlled workspace is found.
    }
  }
  throw new Error(`Cannot find a trusted external ${name} executable`);
}

function installerEnvironment(workingDirectory) {
  const environment = {};
  for (const name of [
    'CI',
    'COMPOSER_AUTH',
    'GITHUB_TOKEN',
    'HOME',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'LANG',
    'LC_ALL',
    'NO_PROXY',
    'PATH',
    'SSL_CERT_DIR',
    'SSL_CERT_FILE',
    'TMPDIR',
    'https_proxy',
    'http_proxy',
    'no_proxy',
  ]) {
    if (process.env[name] !== undefined) {
      environment[name] = process.env[name];
    }
  }
  return {
    ...environment,
    COMPOSER_ALLOW_SUPERUSER: '1',
    COMPOSER_NO_INTERACTION: '1',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_globalconfig: resolve(workingDirectory, '.npmrc-global'),
    npm_config_ignore_scripts: 'true',
    npm_config_userconfig: resolve(workingDirectory, '.npmrc-user'),
  };
}

function signalProcess(child, signal) {
  if (child.pid === undefined) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      child.kill(signal);
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error;
    }
  }
}

async function runInstaller(executable, args, workingDirectory) {
  await new Promise((accept, reject) => {
    const child = spawn(executable, args, {
      cwd: workingDirectory,
      detached: process.platform !== 'win32',
      env: installerEnvironment(workingDirectory),
      stdio: 'inherit',
    });
    let timedOut = false;
    let forceTimer;
    const timeout = setTimeout(() => {
      timedOut = true;
      signalProcess(child, 'SIGTERM');
      forceTimer = setTimeout(() => signalProcess(child, 'SIGKILL'), TERMINATION_GRACE_MS);
      forceTimer.unref();
    }, INSTALL_TIMEOUT_MS);
    timeout.unref();
    child.once('error', reject);
    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      clearTimeout(forceTimer);
      if (timedOut) {
        reject(new Error(`${executable} exceeded its bounded clean-install timeout`));
      } else if (code !== 0) {
        reject(new Error(`${executable} clean install exited ${code ?? signal ?? 'unknown'}`));
      } else {
        accept();
      }
    });
  });
}

function requireDependencyDirectory(path, label) {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink() || !pathStat.isDirectory() || realpathSync(path) !== path) {
    throw new Error(`${label} must be a real workspace-owned directory`);
  }
}

const storageDirectory = resolve(workspaceRoot, 'storage');
const frameworkDirectory = resolve(storageDirectory, 'framework');
for (const directory of [storageDirectory, frameworkDirectory]) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { mode: 0o700 });
  }
  const directoryStat = lstatSync(directory);
  if (
    directoryStat.isSymbolicLink() ||
    !directoryStat.isDirectory() ||
    realpathSync(directory) !== directory
  ) {
    throw new Error('Dependency attestation storage must be a real workspace-owned directory');
  }
}

const dependencyStoreDirectory = resolve(frameworkDirectory, 'browser-check-dependencies');
if (!existsSync(dependencyStoreDirectory)) {
  mkdirSync(dependencyStoreDirectory, { mode: 0o700 });
}
requireDependencyDirectory(dependencyStoreDirectory, 'Browser-check dependency store');

for (const filename of ['package.json', 'package-lock.json', 'composer.json', 'composer.lock']) {
  const source = resolve(workspaceRoot, filename);
  const sourceStat = lstatSync(source);
  if (sourceStat.isSymbolicLink() || !sourceStat.isFile() || sourceStat.nlink !== 1) {
    throw new Error(`${filename} must be a regular workspace-owned file`);
  }
}
const dependencySetId = dependencyManifestSetId(workspaceRoot);
const dependencyRootRelative = `storage/framework/browser-check-dependencies/${dependencySetId}`;
const dependencyRoot = resolve(workspaceRoot, dependencyRootRelative);
let cleanWorkspace = mkdtempSync(resolve(dependencyStoreDirectory, `.pending-${dependencySetId}-`));
try {
  writeFileSync(resolve(cleanWorkspace, '.npmrc-global'), '', { mode: 0o600 });
  writeFileSync(resolve(cleanWorkspace, '.npmrc-user'), '', { mode: 0o600 });
  for (const filename of ['package.json', 'package-lock.json', 'composer.json', 'composer.lock']) {
    const source = resolve(workspaceRoot, filename);
    const sourceStat = lstatSync(source);
    if (sourceStat.isSymbolicLink() || !sourceStat.isFile() || sourceStat.nlink !== 1) {
      throw new Error(`${filename} must be a regular workspace-owned file`);
    }
    copyFileSync(source, resolve(cleanWorkspace, filename));
  }

  await runInstaller(
    trustedExecutable(process.platform === 'win32' ? 'npm.cmd' : 'npm'),
    ['ci', '--ignore-scripts', '--no-audit', '--no-fund'],
    cleanWorkspace,
  );
  await runInstaller(
    trustedExecutable(process.platform === 'win32' ? 'composer.bat' : 'composer'),
    [
      'install',
      '--no-interaction',
      '--prefer-dist',
      '--no-scripts',
      '--no-plugins',
      '--optimize-autoloader',
      '--no-progress',
    ],
    cleanWorkspace,
  );

  prepareDockerNodeModulesCacheMountpoints(realpathSync(resolve(cleanWorkspace, 'node_modules')));

  const cleanFingerprint = dependencyStateFingerprint(
    cleanWorkspace,
    resolve(cleanWorkspace, 'node_modules'),
    resolve(cleanWorkspace, 'vendor'),
  );
  if (existsSync(dependencyRoot)) {
    requireDependencyDirectory(dependencyRoot, 'Existing browser-check dependency root');
    prepareDockerNodeModulesCacheMountpoints(realpathSync(resolve(dependencyRoot, 'node_modules')));
    const existingFingerprint = dependencyStateFingerprint(
      dependencyRoot,
      resolve(dependencyRoot, 'node_modules'),
      resolve(dependencyRoot, 'vendor'),
    );
    if (existingFingerprint !== cleanFingerprint) {
      throw new Error('Existing lock-bound browser-check dependency root is corrupted');
    }
  } else {
    renameSync(cleanWorkspace, dependencyRoot);
    cleanWorkspace = undefined;
  }

  const markerPath = resolve(frameworkDirectory, 'browser-check-dependencies.json');
  if (existsSync(markerPath)) {
    const markerStat = lstatSync(markerPath);
    if (markerStat.isSymbolicLink() || !markerStat.isFile() || markerStat.nlink !== 1) {
      throw new Error('Existing dependency attestation must be a regular workspace-owned file');
    }
  }
  const temporaryPath = resolve(
    frameworkDirectory,
    `.browser-check-dependencies.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(
      temporaryPath,
      `${JSON.stringify(
        {
          schemaVersion: '2.0',
          dependencyRoot: dependencyRootRelative,
          dependenciesFingerprint: cleanFingerprint,
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    );
    renameSync(temporaryPath, markerPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  console.log(`Installed and attested clean browser-check dependencies: ${cleanFingerprint}`);
} finally {
  if (cleanWorkspace && existsSync(cleanWorkspace)) {
    rmSync(cleanWorkspace, { recursive: true, force: true });
  }
}
