#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SAFE_GIT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const CHECK_ID_PATTERN_SOURCE =
  '(?<![A-Za-z0-9-])BC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{3}(?![A-Za-z0-9-])';
const ALLOWED_BASE_URL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx']);
const FORBIDDEN_IDENTIFIERS = new Set([
  'Bun',
  'Deno',
  'EventSource',
  'Function',
  'Object',
  'Proxy',
  'Reflect',
  'WebAssembly',
  'WebSocket',
  'XMLHttpRequest',
  'arguments',
  'eval',
  'fetch',
  'global',
  'globalThis',
  'module',
  'process',
  'require',
]);
const FORBIDDEN_PROPERTIES = new Set([
  '__proto__',
  '$$eval',
  '$eval',
  'addInitScript',
  'addListener',
  'addLocatorHandler',
  'addScriptTag',
  'addStyleTag',
  'apply',
  'arguments',
  'attach',
  'browser',
  'browserType',
  'call',
  'callee',
  'caller',
  'connect',
  'connectOverCDP',
  'context',
  'constructor',
  'createReadStream',
  'download',
  'eval',
  'evaluate',
  'evaluateAll',
  'evaluateHandle',
  'eventNames',
  'exposeBinding',
  'exposeFunction',
  'extend',
  'fetch',
  'fileChooser',
  'global',
  'globalThis',
  'launch',
  'launchPersistentContext',
  'launchServer',
  'listenerCount',
  'listeners',
  'module',
  'newBrowserCDPSession',
  'newCDPSession',
  'newContext',
  'off',
  'on',
  'once',
  'path',
  'pdf',
  'prependListener',
  'prependOnceListener',
  'process',
  'prototype',
  'rawListeners',
  'removeAllListeners',
  'removeListener',
  'request',
  'require',
  'route',
  'routeFromHAR',
  'routeWebSocket',
  'saveAs',
  'setContent',
  'setFiles',
  'setInputFiles',
  'storageState',
  'tracing',
  'unroute',
  'unrouteAll',
  'video',
  'waitForFunction',
]);

const plannedScreenshotTargets = new Set();
const plannedNavigationTargets = [];
const approvedDirectGotoMembers = new WeakSet();

function pathStaysInside(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function canonicalBaseUrl(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty URL`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, a query string, or a fragment`);
  }
  if (!ALLOWED_BASE_URL_HOSTS.has(parsed.hostname)) {
    throw new Error(`${label} must target localhost, loopback, or Docker nginx`);
  }
  if (parsed.hostname === 'nginx') {
    parsed.hostname = 'localhost';
  }
  return parsed.toString();
}

const passthroughArguments = process.argv.slice(2);
if (passthroughArguments.some((argument) => argument !== '--headed')) {
  console.error('The isolated browser-check wrapper accepts only the optional --headed flag');
  process.exit(2);
}
if (passthroughArguments.filter((argument) => argument === '--headed').length > 1) {
  console.error('--headed may be provided at most once');
  process.exit(2);
}

const runDirInput = process.env.BROWSER_CHECK_RUN_DIR?.trim();
if (!runDirInput) {
  console.error('BROWSER_CHECK_RUN_DIR is required');
  process.exit(2);
}

const workspaceRoot = realpathSync(process.cwd());
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const runDir = resolve(workspaceRoot, runDirInput);
const runDirRelativePath = relative(verificationRoot, runDir);
const runDirSegments = runDirRelativePath.split(sep);

if (
  runDirRelativePath === '' ||
  runDirRelativePath === '..' ||
  runDirRelativePath.startsWith(`..${sep}`) ||
  isAbsolute(runDirRelativePath) ||
  runDirSegments.length !== 2 ||
  runDirSegments.some((segment) => segment === '') ||
  !/^\d{14}$/.test(runDirSegments[1])
) {
  console.error(
    'BROWSER_CHECK_RUN_DIR must identify test-results/change-verification/{change-id}/{yyyyMMddHHmmss}',
  );
  process.exit(2);
}

let realRunDir;
try {
  const realVerificationRoot = realpathSync(verificationRoot);
  realRunDir = realpathSync(runDir);
  if (realVerificationRoot !== verificationRoot) {
    throw new Error('test-results/change-verification must not be a symlink');
  }
  if (relative(realVerificationRoot, realRunDir) !== runDirRelativePath) {
    throw new Error('the run path contains a symlink or resolves to another location');
  }
} catch (error) {
  console.error(`BROWSER_CHECK_RUN_DIR must exist without symlink indirection: ${error.message}`);
  process.exit(2);
}

function assertNoSymlinkDescendants(path) {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink()) {
    throw new Error(`run directories and files must not be symlinks: ${path}`);
  }
  if (pathStat.isDirectory()) {
    readdirSync(path).forEach((entry) => assertNoSymlinkDescendants(resolve(path, entry)));
  }
}

try {
  assertNoSymlinkDescendants(realRunDir);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const generatedDir = resolve(realRunDir, 'generated');
if (!existsSync(generatedDir) || !statSync(generatedDir).isDirectory()) {
  console.error('BROWSER_CHECK_RUN_DIR/generated must exist and be a directory');
  process.exit(2);
}
const screenshotEvidenceRoot = resolve(realRunDir, 'evidence/screenshots');
if (!existsSync(screenshotEvidenceRoot) || !statSync(screenshotEvidenceRoot).isDirectory()) {
  console.error('BROWSER_CHECK_RUN_DIR/evidence/screenshots must exist and be a directory');
  process.exit(2);
}

const outputMarkers = [
  resolve(realRunDir, 'artifacts'),
  resolve(realRunDir, 'playwright-results.json'),
  resolve(realRunDir, 'playwright-report'),
];
const existingOutputs = outputMarkers.filter((path) => {
  if (!existsSync(path)) {
    return false;
  }
  const pathStat = statSync(path);
  return pathStat.isFile() || (pathStat.isDirectory() && readdirSync(path).length > 0);
});
if (existingOutputs.length > 0) {
  console.error(
    `BROWSER_CHECK_RUN_DIR already contains execution output; create a new run: ${existingOutputs.join(', ')}`,
  );
  process.exit(2);
}

const claimPath = resolve(realRunDir, '.browser-check-run.json');
if (existsSync(claimPath)) {
  console.error('BROWSER_CHECK_RUN_DIR was already claimed; create a new run');
  process.exit(2);
}

function collectGeneratedChecks(path, checks = []) {
  for (const entry of readdirSync(path)) {
    const entryPath = resolve(path, entry);
    const entryStat = statSync(entryPath);
    if (entryStat.isDirectory()) {
      collectGeneratedChecks(entryPath, checks);
    } else if (!entryStat.isFile()) {
      throw new Error(`generated entries must be regular files or directories: ${entryPath}`);
    } else if (!entry.endsWith('.check.spec.ts')) {
      throw new Error(
        `generated may contain only *.check.spec.ts source files; helpers are not executable: ${entryPath}`,
      );
    } else {
      checks.push(entryPath);
    }
  }
  return checks;
}

let generatedChecks;
try {
  generatedChecks = collectGeneratedChecks(generatedDir);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (generatedChecks.length === 0) {
  console.error('BROWSER_CHECK_RUN_DIR/generated must contain at least one *.check.spec.ts file');
  process.exit(2);
}

const fixturePath = resolve(workspaceRoot, 'playwright.browser-check.fixture.ts');

function canonicalFixtureSpecifier(generatedCheck) {
  const relativeFixturePath = relative(dirname(generatedCheck), fixturePath)
    .split(sep)
    .join('/')
    .replace(/\.ts$/, '');
  return relativeFixturePath.startsWith('.') ? relativeFixturePath : `./${relativeFixturePath}`;
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (ts.isElementAccessExpression(node)) {
    const argument = node.argumentExpression;
    if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
      return argument.text;
    }
    if (!ts.isNumericLiteral(argument)) {
      return '<computed>';
    }
  }
  return undefined;
}

function declaredPropertyName(node) {
  if (!node) {
    return undefined;
  }
  if (ts.isComputedPropertyName(node)) {
    return '<computed>';
  }
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  return undefined;
}

function staticStringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

const approvedScreenshotPathProperties = new WeakSet();
const approvedDirectScreenshotMembers = new WeakSet();

function validateScreenshotCall(member, generatedCheck) {
  if (
    !ts.isPropertyAccessExpression(member) ||
    member.questionDotToken ||
    !ts.isCallExpression(member.parent) ||
    member.parent.expression !== member ||
    member.parent.arguments.length !== 1
  ) {
    throw new Error(`${generatedCheck} screenshot must be a direct call with inline options`);
  }
  const options = member.parent.arguments[0];
  if (!options || !ts.isObjectLiteralExpression(options)) {
    throw new Error(`${generatedCheck} screenshot options must be an inline object literal`);
  }
  const pathProperties = options.properties.filter(
    (property) =>
      ts.isPropertyAssignment(property) && declaredPropertyName(property.name) === 'path',
  );
  if (pathProperties.length !== 1) {
    throw new Error(`${generatedCheck} screenshot requires exactly one static path`);
  }
  const pathProperty = pathProperties[0];
  const screenshotPath = pathProperty ? staticStringValue(pathProperty.initializer) : undefined;
  if (!pathProperty || screenshotPath === undefined || isAbsolute(screenshotPath)) {
    throw new Error(`${generatedCheck} screenshot path must be a relative static string`);
  }
  const absoluteScreenshotPath = resolve(workspaceRoot, screenshotPath);
  const canonicalScreenshotPath = relative(workspaceRoot, absoluteScreenshotPath)
    .split(sep)
    .join('/');
  if (
    screenshotPath !== canonicalScreenshotPath ||
    !pathStaysInside(screenshotEvidenceRoot, absoluteScreenshotPath) ||
    !absoluteScreenshotPath.endsWith('.png')
  ) {
    throw new Error(
      `${generatedCheck} screenshot path must be beneath this run's evidence/screenshots directory`,
    );
  }
  if (existsSync(absoluteScreenshotPath) || plannedScreenshotTargets.has(absoluteScreenshotPath)) {
    throw new Error(`${generatedCheck} screenshot path must be new and unique within this run`);
  }
  plannedScreenshotTargets.add(absoluteScreenshotPath);
  approvedScreenshotPathProperties.add(pathProperty);
}

function validateGotoCall(member, generatedCheck) {
  if (
    !ts.isPropertyAccessExpression(member) ||
    member.questionDotToken ||
    !ts.isIdentifier(member.expression) ||
    member.expression.text !== 'page' ||
    !ts.isCallExpression(member.parent) ||
    member.parent.expression !== member ||
    member.parent.arguments.length < 1 ||
    member.parent.arguments.length > 2
  ) {
    throw new Error(`${generatedCheck} goto must be a direct page.goto(...) call`);
  }
  const navigationTarget = staticStringValue(member.parent.arguments[0]);
  if (navigationTarget === undefined) {
    throw new Error(`${generatedCheck} goto requires a static URL`);
  }
  if (/^(?:about|data|file):/i.test(navigationTarget.trim())) {
    throw new Error(`${generatedCheck} goto must target the planned HTTP(S) origin`);
  }
  return navigationTarget;
}

function directGotoMemberFromStatement(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return undefined;
  }
  const expression = statement.expression.expression;
  if (
    !ts.isCallExpression(expression) ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    !ts.isIdentifier(expression.expression.expression) ||
    expression.expression.expression.text !== 'page' ||
    expression.expression.name.text !== 'goto'
  ) {
    return undefined;
  }
  return expression.expression;
}

function directScreenshotMemberFromStatement(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
    return undefined;
  }
  const expression = statement.expression.expression;
  if (
    !ts.isCallExpression(expression) ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== 'screenshot'
  ) {
    return undefined;
  }
  return expression.expression;
}

function validateBindingName(bindingName, generatedCheck) {
  if (ts.isIdentifier(bindingName)) {
    if (bindingName.text.startsWith('_')) {
      throw new Error(`${generatedCheck} must not bind private runtime member ${bindingName.text}`);
    }
    if (
      bindingName.text === 'test' ||
      bindingName.text === 'expect' ||
      FORBIDDEN_IDENTIFIERS.has(bindingName.text) ||
      FORBIDDEN_PROPERTIES.has(bindingName.text)
    ) {
      throw new Error(`${generatedCheck} must not bind runtime capability ${bindingName.text}`);
    }
    return;
  }
  for (const element of bindingName.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }
    if (element.dotDotDotToken) {
      throw new Error(`${generatedCheck} must not use rest destructuring`);
    }
    const name = declaredPropertyName(element.propertyName);
    if (name === '<computed>') {
      throw new Error(`${generatedCheck} must not use computed destructuring properties`);
    }
    if (name?.startsWith('_')) {
      throw new Error(`${generatedCheck} must not bind private runtime member ${name}`);
    }
    if (name && FORBIDDEN_PROPERTIES.has(name)) {
      throw new Error(`${generatedCheck} uses forbidden binding property ${name}`);
    }
    validateBindingName(element.name, generatedCheck);
  }
}

function validateGeneratedCheck(generatedCheck) {
  const source = readFileSync(generatedCheck, 'utf8');
  const sourceFile = ts.createSourceFile(
    generatedCheck,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = sourceFile.parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    const detail = diagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
      .join('; ');
    throw new Error(`${generatedCheck} is not valid TypeScript: ${detail}`);
  }

  const expectedFixtureSpecifier = canonicalFixtureSpecifier(generatedCheck);
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  if (imports.length !== 1) {
    throw new Error(`${generatedCheck} must have exactly one static import`);
  }
  const fixtureImport = imports[0];
  if (
    !fixtureImport ||
    !ts.isStringLiteral(fixtureImport.moduleSpecifier) ||
    fixtureImport.moduleSpecifier.text !== expectedFixtureSpecifier
  ) {
    throw new Error(
      `${generatedCheck} must import the canonical fixture from ${expectedFixtureSpecifier}`,
    );
  }
  const namedBindings = fixtureImport.importClause?.namedBindings;
  if (
    fixtureImport.importClause?.isTypeOnly ||
    fixtureImport.importClause?.name ||
    !namedBindings ||
    !ts.isNamedImports(namedBindings)
  ) {
    throw new Error(`${generatedCheck} must use a named value import for expect and test`);
  }
  const importedNames = namedBindings.elements.map((element) => ({
    imported: element.propertyName?.text ?? element.name.text,
    local: element.name.text,
    typeOnly: element.isTypeOnly,
  }));
  if (
    importedNames.length !== 2 ||
    importedNames.some(({ imported, local, typeOnly }) => imported !== local || typeOnly) ||
    importedNames
      .map(({ imported }) => imported)
      .sort()
      .join(',') !== 'expect,test'
  ) {
    throw new Error(
      `${generatedCheck} must import exactly { expect, test } without aliases from the canonical fixture`,
    );
  }

  let directTestCalls = 0;
  const isFixtureImportIdentifier = (node) => {
    return ts.isImportSpecifier(node.parent) && namedBindings.elements.includes(node.parent);
  };
  const isAllowedTestIdentifier = (node) => {
    return (
      isFixtureImportIdentifier(node) ||
      (ts.isCallExpression(node.parent) && node.parent.expression === node)
    );
  };
  const isAllowedExpectIdentifier = (node) => {
    if (isFixtureImportIdentifier(node)) {
      return true;
    }
    if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
      return true;
    }
    if (
      ts.isPropertyAccessExpression(node.parent) &&
      node.parent.expression === node &&
      node.parent.name.text === 'poll' &&
      ts.isCallExpression(node.parent.parent) &&
      node.parent.parent.expression === node.parent
    ) {
      return true;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node !== fixtureImport) {
      throw new Error(`${generatedCheck} must not import helper or unrestricted modules`);
    }
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      throw new Error(`${generatedCheck} must not export or re-export runtime modules`);
    }
    if (ts.isSpreadAssignment(node) || ts.isSpreadElement(node)) {
      throw new Error(`${generatedCheck} must not use runtime rest or spread values`);
    }
    if (ts.isImportEqualsDeclaration(node) || node.kind === ts.SyntaxKind.ImportKeyword) {
      throw new Error(`${generatedCheck} must not use dynamic or import-equals loading`);
    }
    if (ts.isMetaProperty(node)) {
      throw new Error(`${generatedCheck} must not use import.meta or other runtime module access`);
    }
    if (ts.isBindingElement(node)) {
      if (node.dotDotDotToken) {
        throw new Error(`${generatedCheck} must not use rest destructuring`);
      }
      const name = declaredPropertyName(node.propertyName);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not use computed destructuring properties`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not bind private runtime member ${name}`);
      }
      if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} uses forbidden binding property ${name}`);
      }
      validateBindingName(node.name, generatedCheck);
    }
    if (ts.isParameter(node) && node.dotDotDotToken) {
      throw new Error(`${generatedCheck} must not use rest parameters`);
    }
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      validateBindingName(node.name, generatedCheck);
    }
    if (
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      const name = declaredPropertyName(node.name);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not declare computed runtime properties`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not declare private runtime property ${name}`);
      }
      if (name === 'path') {
        if (!ts.isPropertyAssignment(node) || !approvedScreenshotPathProperties.has(node)) {
          throw new Error(`${generatedCheck} path is allowed only in direct screenshot options`);
        }
      } else if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} declares forbidden runtime property ${name}`);
      }
    }
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      throw new Error(`${generatedCheck} uses forbidden runtime identifier ${node.text}`);
    }
    if (ts.isIdentifier(node) && node.text === 'test' && !isAllowedTestIdentifier(node)) {
      throw new Error(`${generatedCheck} may use test only as a direct test(...) callee`);
    }
    if (ts.isIdentifier(node) && node.text === 'expect' && !isAllowedExpectIdentifier(node)) {
      throw new Error(`${generatedCheck} may use expect only as expect(...) or expect.poll(...)`);
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const name = propertyName(node);
      if (name === '<computed>') {
        throw new Error(`${generatedCheck} must not use computed property access`);
      }
      if (name?.startsWith('_')) {
        throw new Error(`${generatedCheck} must not access private runtime member ${name}`);
      }
      if (name === 'screenshot') {
        validateScreenshotCall(node, generatedCheck);
        if (!approvedDirectScreenshotMembers.has(node)) {
          throw new Error(
            `${generatedCheck} screenshot is allowed only as a direct awaited test statement`,
          );
        }
      }
      if (name === 'goto') {
        validateGotoCall(node, generatedCheck);
        if (!approvedDirectGotoMembers.has(node)) {
          throw new Error(
            `${generatedCheck} goto is allowed only as the first direct statement in a test callback`,
          );
        }
      }
      if (name && FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`${generatedCheck} uses forbidden runtime property ${name}`);
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'test') {
        directTestCalls += 1;
        const testTitle = staticStringValue(node.arguments[0]);
        const callback = node.arguments[1];
        if (
          node.arguments.length !== 2 ||
          testTitle === undefined ||
          !callback ||
          !ts.isArrowFunction(callback)
        ) {
          throw new Error(
            `${generatedCheck} test calls require exactly a static title and an inline arrow callback`,
          );
        }
        const fixtures = callback.parameters[0]?.name;
        if (!fixtures || !ts.isObjectBindingPattern(fixtures)) {
          throw new Error(
            `${generatedCheck} test callbacks must destructure only the page fixture`,
          );
        }
        const fixtureNames = fixtures.elements.map((element) => {
          if (element.dotDotDotToken || element.propertyName || !ts.isIdentifier(element.name)) {
            return '<unsupported>';
          }
          return element.name.text;
        });
        if (
          callback.parameters.length !== 1 ||
          fixtureNames.length !== 1 ||
          fixtureNames[0] !== 'page'
        ) {
          throw new Error(`${generatedCheck} test callbacks may request only the page fixture`);
        }
        if (!ts.isBlock(callback.body)) {
          throw new Error(
            `${generatedCheck} each test callback must start with a direct static page.goto(...)`,
          );
        }
        const directGotoMember = directGotoMemberFromStatement(callback.body.statements[0]);
        if (!directGotoMember) {
          throw new Error(
            `${generatedCheck} each test callback must start with a direct static page.goto(...)`,
          );
        }
        const navigationTarget = validateGotoCall(directGotoMember, generatedCheck);
        approvedDirectGotoMembers.add(directGotoMember);
        for (const statement of callback.body.statements) {
          const directScreenshotMember = directScreenshotMemberFromStatement(statement);
          if (directScreenshotMember) {
            approvedDirectScreenshotMembers.add(directScreenshotMember);
          }
        }
        plannedNavigationTargets.push({ generatedCheck, navigationTarget, testTitle });
      } else if (
        (ts.isPropertyAccessExpression(node.expression) ||
          ts.isElementAccessExpression(node.expression)) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'test'
      ) {
        throw new Error(`${generatedCheck} must use direct test(...) declarations only`);
      }
    }
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      FORBIDDEN_IDENTIFIERS.has(node.expression.text)
    ) {
      throw new Error(`${generatedCheck} must not execute ${node.expression.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (directTestCalls === 0) {
    throw new Error(`${generatedCheck} must declare at least one direct test(...)`);
  }
}

function generatedSourceFingerprint(generatedChecks) {
  const fingerprint = createHash('sha256');
  for (const generatedCheck of [...generatedChecks].sort((left, right) => {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  })) {
    fingerprint.update(relative(generatedDir, generatedCheck).split(sep).join('/'));
    fingerprint.update('\0');
    fingerprint.update(readFileSync(generatedCheck));
    fingerprint.update('\0');
  }
  return `sha256:${fingerprint.digest('hex')}`;
}

function revisionsEqual(left, right) {
  return (
    left?.baseSha === right?.baseSha &&
    left?.headSha === right?.headSha &&
    left?.worktreeFingerprint === right?.worktreeFingerprint
  );
}

function runtimesEqual(left, right) {
  return (
    left?.baseUrl === right?.baseUrl &&
    left?.useAuthState === right?.useAuthState &&
    left?.browser === right?.browser &&
    left?.locale === right?.locale &&
    left?.timezone === right?.timezone &&
    left?.authStateHash === right?.authStateHash
  );
}

for (const generatedCheck of generatedChecks) {
  try {
    validateGeneratedCheck(generatedCheck);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const planPath = resolve(realRunDir, 'plan.json');
if (!existsSync(planPath) || !statSync(planPath).isFile()) {
  console.error('BROWSER_CHECK_RUN_DIR/plan.json must exist and be a regular file');
  process.exit(2);
}
const planSource = readFileSync(planPath, 'utf8');
let plan;
try {
  plan = JSON.parse(planSource);
} catch {
  console.error('BROWSER_CHECK_RUN_DIR/plan.json must contain valid JSON');
  process.exit(2);
}
const baseRef = plan?.change?.baseRef;
const planRevision = plan?.revision;
const planEnvironment = plan?.environment;
if (
  plan?.schemaVersion !== '1.0' ||
  typeof baseRef !== 'string' ||
  !SAFE_GIT_REF_PATTERN.test(baseRef) ||
  baseRef.includes('..') ||
  baseRef.includes('//') ||
  baseRef.includes('@{') ||
  !planRevision ||
  !SHA_PATTERN.test(planRevision.baseSha ?? '') ||
  !SHA_PATTERN.test(planRevision.headSha ?? '') ||
  !FINGERPRINT_PATTERN.test(planRevision.worktreeFingerprint ?? '')
) {
  console.error('plan.json must use schemaVersion 1.0 with a safe baseRef and Git revision');
  process.exit(2);
}
const appEnvironment = planEnvironment?.appEnvironment;
if (
  typeof appEnvironment !== 'string' ||
  appEnvironment.trim() === '' ||
  ['prod', 'production', 'live'].includes(appEnvironment.trim().toLowerCase()) ||
  planEnvironment?.browser !== 'chromium' ||
  planEnvironment?.locale !== 'ja-JP' ||
  planEnvironment?.timezone !== 'Asia/Tokyo'
) {
  console.error(
    'plan.environment must be non-production with browser=chromium, locale=ja-JP, and timezone=Asia/Tokyo',
  );
  process.exit(2);
}

let plannedBaseUrl;
let runtimeBaseUrl;
let useAuthState;
try {
  plannedBaseUrl = canonicalBaseUrl(plan?.environment?.baseUrl, 'plan.environment.baseUrl');
  runtimeBaseUrl = canonicalBaseUrl(
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000',
    'PLAYWRIGHT_BASE_URL',
  );
  if (plannedBaseUrl !== runtimeBaseUrl) {
    throw new Error('PLAYWRIGHT_BASE_URL must match plan.environment.baseUrl');
  }
  const plannedUseAuthState = plan?.environment?.useAuthState ?? false;
  if (typeof plannedUseAuthState !== 'boolean') {
    throw new Error('plan.environment.useAuthState must be boolean when provided');
  }
  const authStatePreference = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() ?? 'false';
  if (!['true', 'false'].includes(authStatePreference)) {
    throw new Error('BROWSER_CHECK_USE_AUTH_STATE must be true or false when provided');
  }
  useAuthState = authStatePreference === 'true';
  if (useAuthState !== plannedUseAuthState) {
    throw new Error('BROWSER_CHECK_USE_AUTH_STATE must match plan.environment.useAuthState');
  }
} catch (error) {
  console.error(`The browser-check runtime does not match its plan: ${error.message}`);
  process.exit(2);
}

const plannedOrigin = new URL(plannedBaseUrl).origin;
const plannedTemporaryCheckList = Array.isArray(plan?.checks)
  ? plan.checks.filter((check) => check?.driver === 'playwright-temporary')
  : [];
const plannedTemporaryChecks = new Map(
  plannedTemporaryCheckList
    .filter((check) => typeof check?.id === 'string')
    .map((check) => [check.id, check]),
);
if (plannedTemporaryChecks.size !== plannedTemporaryCheckList.length) {
  console.error('plan.checks must contain unique IDs for every playwright-temporary check');
  process.exit(2);
}
const generatedCheckCounts = new Map(
  [...plannedTemporaryChecks.keys()].map((checkId) => [checkId, 0]),
);
for (const { generatedCheck, navigationTarget, testTitle } of plannedNavigationTargets) {
  const mentionedCheckIds = new Set(
    testTitle.match(new RegExp(CHECK_ID_PATTERN_SOURCE, 'g')) ?? [],
  );
  if (mentionedCheckIds.size !== 1) {
    console.error(
      `${generatedCheck} test title must contain exactly one bounded planned playwright-temporary check ID`,
    );
    process.exit(2);
  }
  const [checkId] = mentionedCheckIds;
  const plannedCheck = plannedTemporaryChecks.get(checkId);
  if (!plannedCheck) {
    console.error(
      `${generatedCheck} test title references unplanned playwright-temporary check ${checkId}`,
    );
    process.exit(2);
  }
  let resolvedNavigation;
  let resolvedPlannedTarget;
  const plannedTarget = plannedCheck?.target?.url;
  if (typeof plannedTarget !== 'string' || plannedTarget.trim() === '') {
    console.error(`${generatedCheck} planned check ${checkId} requires a nonempty target.url`);
    process.exit(2);
  }
  try {
    resolvedNavigation = new URL(navigationTarget, plannedBaseUrl);
    resolvedPlannedTarget = new URL(plannedTarget, plannedBaseUrl);
  } catch {
    console.error(`${generatedCheck} and its planned check require valid target URLs`);
    process.exit(2);
  }
  if (
    !['http:', 'https:'].includes(resolvedNavigation.protocol) ||
    resolvedNavigation.origin !== plannedOrigin ||
    !['http:', 'https:'].includes(resolvedPlannedTarget.protocol) ||
    resolvedPlannedTarget.origin !== plannedOrigin
  ) {
    console.error(`${generatedCheck} goto must target the planned HTTP(S) origin`);
    process.exit(2);
  }
  if (resolvedNavigation.href !== resolvedPlannedTarget.href) {
    console.error(`${generatedCheck} goto must exactly match ${checkId} target.url`);
    process.exit(2);
  }
  generatedCheckCounts.set(checkId, (generatedCheckCounts.get(checkId) ?? 0) + 1);
}
for (const [checkId, count] of generatedCheckCounts) {
  if (count !== 1) {
    console.error(
      `plan check ${checkId} must have exactly one generated test with a bound page.goto`,
    );
    process.exit(2);
  }
}

const authStatePath = resolve(workspaceRoot, 'playwright/.auth/user.json');
let authStateHash;
if (useAuthState) {
  if (
    !existsSync(authStatePath) ||
    lstatSync(authStatePath).isSymbolicLink() ||
    !statSync(authStatePath).isFile() ||
    realpathSync(authStatePath) !== authStatePath
  ) {
    console.error('BROWSER_CHECK_USE_AUTH_STATE=true requires an immutable workspace auth file');
    process.exit(2);
  }
  authStateHash = `sha256:${createHash('sha256')
    .update(readFileSync(authStatePath))
    .digest('hex')}`;
}

const runtime = {
  baseUrl: runtimeBaseUrl,
  useAuthState,
  browser: 'chromium',
  locale: 'ja-JP',
  timezone: 'Asia/Tokyo',
  ...(authStateHash ? { authStateHash } : {}),
};

let preflightRevision;
try {
  preflightRevision = revisionSnapshot(baseRef, workspaceRoot);
} catch (error) {
  console.error(`The browser-check Git revision could not be resolved: ${error.message}`);
  process.exit(2);
}
if (!revisionsEqual(planRevision, preflightRevision)) {
  console.error('plan.json revision is stale; create a new run for the current Git worktree');
  process.exit(2);
}

const claimToken = randomUUID();
const claimTokenHash = createHash('sha256').update(claimToken).digest('hex');
const planHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
const generatedSourceHash = generatedSourceFingerprint(generatedChecks);
const claimRecord = {
  schemaVersion: '1.0',
  tokenHash: claimTokenHash,
  runDir: realRunDir,
  planHash,
  generatedSourceHash,
  planRevision,
  preflightRevision,
  runtime,
  claimedAt: new Date().toISOString(),
};
const claimSource = `${JSON.stringify(claimRecord, null, 2)}\n`;
let claimFileDescriptor;
try {
  claimFileDescriptor = openSync(claimPath, 'wx', 0o600);
  writeFileSync(claimFileDescriptor, claimSource, 'utf8');
  fsyncSync(claimFileDescriptor);
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('BROWSER_CHECK_RUN_DIR was already claimed; create a new run');
  } else {
    console.error(`BROWSER_CHECK_RUN_DIR could not be claimed atomically: ${error.message}`);
  }
  process.exit(2);
} finally {
  if (claimFileDescriptor !== undefined) {
    closeSync(claimFileDescriptor);
  }
}

function replaceClaimAtomically(completedClaim) {
  const temporaryClaimPath = resolve(realRunDir, `.browser-check-run.${randomUUID()}.tmp`);
  let temporaryClaimDescriptor;
  try {
    temporaryClaimDescriptor = openSync(temporaryClaimPath, 'wx', 0o600);
    writeFileSync(temporaryClaimDescriptor, `${JSON.stringify(completedClaim, null, 2)}\n`, 'utf8');
    fsyncSync(temporaryClaimDescriptor);
    closeSync(temporaryClaimDescriptor);
    temporaryClaimDescriptor = undefined;
    renameSync(temporaryClaimPath, claimPath);
  } finally {
    if (temporaryClaimDescriptor !== undefined) {
      closeSync(temporaryClaimDescriptor);
    }
    if (existsSync(temporaryClaimPath)) {
      unlinkSync(temporaryClaimPath);
    }
  }
}

const playwrightCli = resolve(workspaceRoot, 'node_modules/@playwright/test/cli.js');
if (!existsSync(playwrightCli)) {
  console.error('The repository Playwright CLI is not installed');
  process.exit(2);
}

const execution = spawnSync(
  process.execPath,
  [playwrightCli, 'test', '--config=playwright.browser-check.config.ts', ...passthroughArguments],
  {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      BROWSER_CHECK_RUN_DIR: realRunDir,
      BROWSER_CHECK_RUN_TOKEN: claimToken,
    },
    stdio: 'inherit',
  },
);

if (execution.error) {
  console.error(`Playwright could not start: ${execution.error.message}`);
  process.exit(1);
}
if (execution.signal) {
  console.error(`Playwright ended from signal ${execution.signal}`);
  process.exit(1);
}
const playwrightExitCode = execution.status ?? 1;
if (!Number.isInteger(playwrightExitCode) || playwrightExitCode < 0) {
  console.error('Playwright did not provide a valid exit code');
  process.exit(1);
}
try {
  if (
    !existsSync(claimPath) ||
    lstatSync(claimPath).isSymbolicLink() ||
    !statSync(claimPath).isFile() ||
    readFileSync(claimPath, 'utf8') !== claimSource
  ) {
    throw new Error('the preflight claim changed during browser execution');
  }
  const postflightPlanSource = readFileSync(planPath, 'utf8');
  const postflightPlanHash = `sha256:${createHash('sha256')
    .update(postflightPlanSource)
    .digest('hex')}`;
  const postflightGeneratedSourceHash = generatedSourceFingerprint(
    collectGeneratedChecks(generatedDir),
  );
  const postflightRevision = revisionSnapshot(baseRef, workspaceRoot);
  const postflightRuntimeBaseUrl = canonicalBaseUrl(
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000',
    'PLAYWRIGHT_BASE_URL',
  );
  const postflightAuthStatePreference = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() ?? 'false';
  const postflightUseAuthState = postflightAuthStatePreference === 'true';
  let postflightAuthStateHash;
  if (postflightUseAuthState) {
    if (
      !existsSync(authStatePath) ||
      lstatSync(authStatePath).isSymbolicLink() ||
      !statSync(authStatePath).isFile() ||
      realpathSync(authStatePath) !== authStatePath
    ) {
      throw new Error('the stored authentication file is missing or redirected');
    }
    postflightAuthStateHash = `sha256:${createHash('sha256')
      .update(readFileSync(authStatePath))
      .digest('hex')}`;
  }
  const postflightRuntime = {
    baseUrl: postflightRuntimeBaseUrl,
    useAuthState: postflightUseAuthState,
    browser: 'chromium',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    ...(postflightAuthStateHash ? { authStateHash: postflightAuthStateHash } : {}),
  };
  if (
    !['true', 'false'].includes(postflightAuthStatePreference) ||
    postflightPlanHash !== planHash ||
    postflightGeneratedSourceHash !== generatedSourceHash ||
    !revisionsEqual(postflightRevision, planRevision) ||
    !runtimesEqual(postflightRuntime, runtime)
  ) {
    throw new Error('the plan, generated source, runtime, or Git revision changed');
  }
  replaceClaimAtomically({
    ...claimRecord,
    postflight: {
      completedAt: new Date().toISOString(),
      planHash: postflightPlanHash,
      generatedSourceHash: postflightGeneratedSourceHash,
      revision: postflightRevision,
      runtime: postflightRuntime,
      playwrightExitCode,
    },
  });
} catch (error) {
  console.error(
    `The browser-check postflight could not be completed; this run is not valid evidence: ${error.message}`,
  );
  process.exit(1);
}
process.exit(playwrightExitCode);
