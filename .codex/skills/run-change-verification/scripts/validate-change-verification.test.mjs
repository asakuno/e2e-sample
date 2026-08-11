import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  access,
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { basename, delimiter, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  frontendAssetsContentFingerprint,
  frontendAssetsFingerprint,
} from './browser-check-assets.mjs';
import { revisionGitEnvironment, revisionSnapshot } from './revision-fingerprint.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '../../../..');
const validatorPath = resolve(scriptDirectory, 'validate-change-verification.mjs');
const wrapperPath = resolve(scriptDirectory, 'run-browser-check.mjs');
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const executionArtifactRootDirectories = [
  'artifacts',
  'playwright-report',
  'evidence/console',
  'evidence/network',
  'evidence/screenshots',
  'videos',
];
const fixtureBaseRef = process.env.CHANGE_VERIFICATION_TEST_BASE_REF?.trim() || 'develop';
const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const trustedDependenciesFingerprint = `sha256:${'d'.repeat(64)}`;
const wrapperFixtureRevision = revisionSnapshot(fixtureBaseRef, workspaceRoot);
const validatorFixtureRevision = structuredClone(wrapperFixtureRevision);
const validatorTrackedDiff = spawnSync('git', ['diff', '--binary', '--no-ext-diff', 'HEAD', '--'], {
  cwd: workspaceRoot,
  encoding: null,
  env: revisionGitEnvironment(),
  maxBuffer: 50 * 1024 * 1024,
});
const validatorStatus = spawnSync(
  'git',
  ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
  {
    cwd: workspaceRoot,
    encoding: null,
    env: revisionGitEnvironment(),
    maxBuffer: 50 * 1024 * 1024,
  },
);
const validatorIndex = spawnSync('git', ['ls-files', '-v', '-z'], {
  cwd: workspaceRoot,
  encoding: null,
  env: revisionGitEnvironment(),
  maxBuffer: 50 * 1024 * 1024,
});
assert.equal(validatorTrackedDiff.status, 0, validatorTrackedDiff.stderr?.toString('utf8'));
assert.equal(validatorStatus.status, 0, validatorStatus.stderr?.toString('utf8'));
assert.equal(validatorIndex.status, 0, validatorIndex.stderr?.toString('utf8'));
const validatorTrackedDiffBase64 = validatorTrackedDiff.stdout.toString('base64');
const validatorStatusBase64 = validatorStatus.stdout.toString('base64');
const validatorIndexBase64 = validatorIndex.stdout.toString('base64');
let validatorGitDirectory;

function currentFixtureRevision() {
  return structuredClone(validatorFixtureRevision);
}

function currentWrapperFixtureRevision() {
  return structuredClone(wrapperFixtureRevision);
}

function checkIdFor(changeId) {
  return `BC-${changeId.replaceAll('-', '')}-001`;
}

function makeNotRequiredFixture(changeId, runId, revision) {
  const checkId = checkIdFor(changeId);

  return {
    plan: {
      schemaVersion: '1.0',
      change: {
        id: changeId,
        title: 'Validator explicit not-required fixture',
        source: 'validator-contract-test',
        baseRef: fixtureBaseRef,
        headRef: 'codex/change-verification-skills',
        summary: 'No additional execution is required for this fixture.',
      },
      revision,
      environment: {
        baseUrl: 'http://localhost:8000',
        appEnvironment: 'testing',
        browser: 'chromium',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
      },
      scope: {
        affectedFiles: ['docs/validator-contract.md'],
        routes: [],
      },
      existingTestCommands: [],
      delegatedWorkItems: [],
      unnecessaryChecks: ['Additional browser execution would duplicate lower-level coverage.'],
      assumptions: ['The fixture represents analysis-only verification.'],
      specificationGaps: [],
      checks: [
        {
          id: checkId,
          title: 'Record the explicit no-execution decision',
          risk: 'An unnecessary browser check could be mistaken for required work.',
          priority: 'P3',
          responsibility: 'component',
          lifecycle: 'change-only',
          driver: 'not-required',
          evaluationMode: 'not-required',
          target: {
            files: ['docs/validator-contract.md'],
          },
          preconditions: [],
          steps: ['Review the affected scope and existing coverage.'],
          expectedResults: [],
          evidence: [],
          promotionCandidate: false,
          status: 'planned',
        },
      ],
    },
    result: {
      schemaVersion: '1.0',
      changeId,
      runId,
      startedAt: '2026-08-01T23:00:00+09:00',
      completedAt: '2026-08-01T23:00:01+09:00',
      summary: {
        pass: 0,
        fail: 0,
        blocked: 0,
        notRun: 0,
        observation: 0,
        notRequired: 1,
      },
      issueRecords: [],
      revision,
      results: [
        {
          checkId,
          driver: 'not-required',
          status: 'not_required',
          actualResult: 'Scope analysis selected no additional execution.',
          evidence: [],
          issues: [],
          executionNotes: ['The decision is explicit rather than represented by an empty plan.'],
        },
      ],
    },
    verdict: 'pass',
    files: {},
  };
}

function makeHumanNotRunFixture(changeId, runId, revision) {
  const checkId = checkIdFor(changeId);

  return {
    plan: {
      schemaVersion: '1.0',
      change: {
        id: changeId,
        title: 'Validator human not-run fixture',
        source: 'validator-contract-test',
        baseRef: fixtureBaseRef,
        headRef: 'codex/change-verification-skills',
        summary: 'A human-only browser check remains to be executed.',
      },
      revision,
      environment: {
        baseUrl: 'http://localhost:8000',
        appEnvironment: 'testing',
        browser: 'chromium',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
      },
      scope: {
        affectedFiles: ['resources/js/pages/Example.tsx'],
        routes: ['/manual-review'],
      },
      existingTestCommands: [],
      delegatedWorkItems: [],
      unnecessaryChecks: [],
      assumptions: ['A reviewer can access the local application later.'],
      specificationGaps: [],
      checks: [
        {
          id: checkId,
          title: 'Complete the human visual review',
          risk: 'A subjective visual regression may remain unseen.',
          priority: 'P2',
          responsibility: 'browser',
          lifecycle: 'human-only',
          driver: 'human',
          evaluationMode: 'objective',
          target: {
            url: '/manual-review',
            files: ['resources/js/pages/Example.tsx'],
          },
          preconditions: ['Open the local application in a desktop browser.'],
          steps: ['Inspect the page at desktop width.'],
          expectedResults: ['The page has no visible clipping or overlap.'],
          evidence: ['Reviewer screenshot or an explicitly approved waiver.'],
          promotionCandidate: false,
          status: 'planned',
        },
      ],
    },
    result: {
      schemaVersion: '1.0',
      changeId,
      runId,
      startedAt: '2026-08-01T23:01:00+09:00',
      completedAt: '2026-08-01T23:01:01+09:00',
      summary: {
        pass: 0,
        fail: 0,
        blocked: 0,
        notRun: 1,
        observation: 0,
        notRequired: 0,
      },
      issueRecords: [],
      revision,
      results: [
        {
          checkId,
          driver: 'human',
          status: 'not_run',
          actualResult: 'The human-only review has not been performed.',
          evidence: [],
          issues: [],
          executionNotes: ['No human execution metadata was fabricated.'],
          blocker: {
            reason: 'A human reviewer is not available during this run.',
            nextAction: 'Ask a reviewer to perform the documented visual check.',
          },
        },
      ],
    },
    verdict: 'conditional-pass',
    files: {},
  };
}

function passingPlaywrightReport(checkId) {
  return {
    suites: [
      {
        title: 'validator fixture',
        specs: [
          {
            title: `${checkId} planned browser check`,
            ok: true,
            tests: [
              {
                expectedStatus: 'passed',
                status: 'expected',
                results: [{ status: 'passed', errors: [] }],
              },
            ],
          },
        ],
      },
    ],
    errors: [],
    stats: {
      expected: 1,
      unexpected: 0,
      flaky: 0,
      skipped: 0,
    },
  };
}

function configurePassingPlaywrightFixture(fixture) {
  const check = fixture.plan.checks[0];
  const checkResult = fixture.result.results[0];
  const screenshotPath = `evidence/screenshots/${check.id}-planned.png`;
  check.lifecycle = 'change-only';
  check.driver = 'playwright-temporary';
  check.evidence = ['Playwright JSON', 'screenshot'];
  checkResult.driver = 'playwright-temporary';
  checkResult.status = 'pass';
  checkResult.actualResult = 'The planned temporary browser check passed.';
  checkResult.environment = {
    browser: 'chromium',
    viewport: '1280x720',
    baseUrl: 'http://localhost:8000',
  };
  checkResult.evidence = ['playwright-results.json', screenshotPath];
  delete checkResult.blocker;
  fixture.result.summary.notRun = 0;
  fixture.result.summary.pass = 1;
  fixture.verdict = 'pass';
  fixture.files[screenshotPath] = validPng;
  fixture.files['playwright-results.json'] = `${JSON.stringify(
    passingPlaywrightReport(check.id),
    null,
    2,
  )}\n`;
  fixture.files['generated/contract.check.spec.ts'] = `test('${check.id}', async () => {});\n`;
  fixture.browserClaim = { postflightExitCode: 0 };
}

function configureFailingPlaywrightFixture(fixture) {
  configurePassingPlaywrightFixture(fixture);
  const check = fixture.plan.checks[0];
  const checkResult = fixture.result.results[0];
  const issueId = `CVI-${fixture.result.runId}-001`;
  checkResult.status = 'fail';
  checkResult.actualResult = 'The planned temporary browser assertion failed.';
  checkResult.issues = [issueId];
  fixture.result.summary.pass = 0;
  fixture.result.summary.fail = 1;
  fixture.result.issueRecords = [
    {
      id: issueId,
      checkId: check.id,
      classification: 'product-defect',
      priority: 'P2',
      expected: 'The planned temporary browser assertion passes.',
      actual: 'The planned assertion failed.',
      reproduction: ['Run the isolated temporary browser check.'],
      evidence: ['playwright-results.json'],
      disposition: 'Investigate the product behavior before accepting the change.',
    },
  ];
  fixture.verdict = 'fail';
  fixture.browserClaim.postflightExitCode = 1;
  const report = passingPlaywrightReport(check.id);
  const spec = report.suites[0].specs[0];
  spec.ok = false;
  spec.tests[0].status = 'unexpected';
  spec.tests[0].results = [
    {
      status: 'failed',
      errors: [{ message: 'The planned assertion failed.' }],
    },
  ];
  report.stats.expected = 0;
  report.stats.unexpected = 1;
  fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
}

function configureBlockedPlaywrightRootErrorFixture(fixture, rootErrorMessage) {
  const check = fixture.plan.checks[0];
  const checkResult = fixture.result.results[0];
  check.lifecycle = 'change-only';
  check.driver = 'playwright-temporary';
  check.evidence = ['Playwright JSON root error'];
  checkResult.driver = 'playwright-temporary';
  checkResult.status = 'blocked';
  checkResult.actualResult = 'Playwright stopped before the planned check produced a leaf result.';
  checkResult.evidence = ['playwright-results.json'];
  checkResult.blocker = {
    reason: 'A Playwright root error prevented leaf execution.',
    nextAction: 'Correct the execution environment and create a new append-only run.',
  };
  fixture.result.summary.notRun = 0;
  fixture.result.summary.blocked = 1;
  fixture.verdict = 'incomplete';
  fixture.files['playwright-results.json'] = `${JSON.stringify(
    {
      suites: [],
      errors: [{ message: rootErrorMessage }],
      stats: {
        expected: 0,
        unexpected: 0,
        flaky: 0,
        skipped: 0,
      },
    },
    null,
    2,
  )}\n`;
  fixture.files['generated/contract.check.spec.ts'] = `test('${check.id}', async () => {});\n`;
  fixture.browserClaim = { postflightExitCode: 1 };
}

function configureNotRunPlaywrightFixture(fixture) {
  fixture.plan.checks[0].lifecycle = 'change-only';
  fixture.plan.checks[0].driver = 'playwright-temporary';
  fixture.plan.checks[0].evidence = ['Playwright JSON when execution occurs'];
  fixture.result.results[0].driver = 'playwright-temporary';
}

function configureGlobalExecutionErrorFixture(fixture) {
  const check = fixture.plan.checks[0];
  const checkResult = fixture.result.results[0];
  check.lifecycle = 'change-only';
  check.driver = 'playwright-temporary';
  check.evidence = ['Wrapper global execution-error record'];
  checkResult.driver = 'playwright-temporary';
  checkResult.status = 'blocked';
  checkResult.actualResult = 'The browser wrapper failed before a Playwright report was available.';
  checkResult.evidence = ['.browser-check-execution-error.json'];
  checkResult.blocker = {
    reason: 'A global pre-report wrapper failure prevented every temporary browser check.',
    nextAction: 'Correct the wrapper environment and create a new append-only run.',
  };
  fixture.result.summary.notRun = 0;
  fixture.result.summary.blocked = 1;
  fixture.verdict = 'incomplete';
  fixture.files['generated/contract.check.spec.ts'] = `test('${check.id}', async () => {});\n`;
  fixture.files['.browser-check-execution-error.json'] = `${JSON.stringify(
    {
      schemaVersion: '1.0',
      phase: 'pre-report',
      scope: 'global',
      affectedCheckIds: [check.id],
      classification: 'environment-defect',
      message: 'The Playwright process did not produce a report.',
      occurredAt: '2026-08-01T15:00:01.000Z',
    },
    null,
    2,
  )}\n`;
  fixture.browserClaim = {};
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function scalarValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap(scalarValues);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(scalarValues);
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return [String(value)];
  }

  return [];
}

function escapeTableCell(value) {
  return String(value).replaceAll('|', '\\|');
}

function tableRow(values) {
  return `| ${values.map(escapeTableCell).join(' | ')} |`;
}

function listSection(heading, values) {
  const items = arrayValues(values);
  const body = items.length > 0 ? items.map((value) => `- ${value}`).join('\n') : '- None';

  return `${heading}\n\n${body}`;
}

function renderDelegatedWork(items) {
  const delegatedWorkItems = arrayValues(items);
  const rows = delegatedWorkItems
    .map((item) =>
      tableRow([
        item.id,
        item.type,
        item.priority,
        item.requiredForVerdict,
        item.status,
        item.target,
        item.reason,
      ]),
    )
    .join('\n');
  const details = delegatedWorkItems
    .map((item) => {
      const evidence = arrayValues(item.evidence);
      const body =
        evidence.length > 0
          ? evidence.map((value) => `- Evidence: ${value}`).join('\n')
          : '- Evidence: None';

      return `### \`${item.id}\`\n\n${body}`;
    })
    .join('\n\n');

  return `## Delegated Work

| Delegated Work ID | Type | Priority | Required For Verdict | Status | Target | Reason |
|---|---|---|---|---|---|---|
${rows}

${details || 'No delegated work.'}`;
}

function renderPlan(plan) {
  const checks = arrayValues(plan.checks);
  const metadata = [
    ...Object.entries(plan.change ?? {}).map(([key, value]) => `- ${key}: ${value}`),
    ...Object.entries(plan.revision ?? {}).map(([key, value]) => `- ${key}: ${value}`),
    ...Object.entries(plan.environment ?? {}).map(([key, value]) => `- ${key}: ${value}`),
    ...arrayValues(plan.scope?.affectedFiles).map((value) => `- affected file: ${value}`),
    ...arrayValues(plan.scope?.routes).map((value) => `- route: ${value}`),
    ...arrayValues(plan.existingTestCommands).map((value) => `- existing test: ${value}`),
  ].join('\n');
  const rows = checks
    .map((check) =>
      tableRow([
        check.id,
        check.title,
        check.priority,
        check.responsibility,
        check.lifecycle,
        check.driver,
        check.evaluationMode,
        check.risk,
        check.promotionCandidate,
        check.status,
      ]),
    )
    .join('\n');
  const details = checks
    .map((check) => {
      const values = [
        ...scalarValues(check.target),
        ...arrayValues(check.preconditions),
        ...arrayValues(check.steps),
        ...arrayValues(check.expectedResults),
        ...arrayValues(check.evidence),
        ...(check.evidenceWaiverReason ? [check.evidenceWaiverReason] : []),
      ];
      const body = values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';

      return `### \`${check.id}\`\n\n${body}`;
    })
    .join('\n\n');

  return `# Change Verification Plan

${metadata}

| Check ID | Title | Priority | Responsibility | Lifecycle | Driver | Evaluation Mode | Risk | Promotion Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
${rows}

${details}

${renderDelegatedWork(plan.delegatedWorkItems)}

${listSection('## Unnecessary Checks', plan.unnecessaryChecks)}

${listSection('## Assumptions', plan.assumptions)}

${listSection('## Specification Gaps', plan.specificationGaps)}
`;
}

function renderResult(result) {
  const results = arrayValues(result.results);
  const rows = results
    .map((checkResult) =>
      tableRow([
        checkResult.checkId,
        checkResult.driver,
        checkResult.status,
        checkResult.actualResult,
      ]),
    )
    .join('\n');
  const details = results
    .map((checkResult) => {
      const values = [
        ...scalarValues(checkResult.environment),
        ...arrayValues(checkResult.evidence),
        ...arrayValues(checkResult.issues),
        ...arrayValues(checkResult.executionNotes),
        ...scalarValues(checkResult.testExecution),
        ...scalarValues(checkResult.humanExecution),
        ...scalarValues(checkResult.blocker),
      ];
      const body = values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';

      return `### \`${checkResult.checkId}\`\n\n${body}`;
    })
    .join('\n\n');
  const summary = result.summary;

  return `# Change Verification Result

- Change ID: ${result.changeId}
- Run ID: ${result.runId}
${Object.entries(result.revision ?? {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

| Check ID | Driver | Status | Actual Result |
|---|---|---|---|
${rows}

${details}

Summary counts: pass=${summary.pass}; fail=${summary.fail}; blocked=${summary.blocked}; notRun=${summary.notRun}; observation=${summary.observation}; notRequired=${summary.notRequired}
`;
}

function renderReview(plan, result, verdict) {
  const reviewedIds = [
    ...arrayValues(plan.checks).map((check) => check.id),
    ...arrayValues(plan.delegatedWorkItems).map((item) => item.id),
  ]
    .map((id) => `- ${id}`)
    .join('\n');
  const summary = result.summary;

  return `# Change Verification Review

${reviewedIds || '- No planned checks'}

Corrected summary counts: pass=${summary.pass}; fail=${summary.fail}; blocked=${summary.blocked}; notRun=${summary.notRun}; observation=${summary.observation}; notRequired=${summary.notRequired}

## Verdict

\`${verdict}\`
`;
}

function renderPromotion(plan) {
  const rows = arrayValues(plan.checks)
    .filter((check) => check.responsibility === 'browser' && check.lifecycle !== 'regression')
    .map((check) =>
      tableRow([
        check.id,
        'do-not-automate',
        'The fixture verifies validator behavior only.',
        'not applicable',
        'not applicable',
        'Deterministic validator fixture',
        'not applicable',
        'No production maintenance surface.',
      ]),
    )
    .join('\n');

  return `# Promotion Review

| Check ID | Recommendation | Rationale | Target E2E Specification | Target Playwright Test | Test Data | Lower-Level Dependencies | Runtime, Flakiness, and Maintenance Risk |
|---|---|---|---|---|---|---|---|
${rows}

${rows ? '' : 'No browser promotion decisions.'}
`;
}

function renderIssues(result) {
  const issueRecords = arrayValues(result.issueRecords);
  if (issueRecords.length === 0) {
    return '# Issues\n\nNo issues recorded.\n';
  }

  const sections = issueRecords.map((issue) => {
    const values = Object.entries(issue)
      .flatMap(([key, value]) => scalarValues(value).map((item) => `- ${key}: ${item}`))
      .join('\n');

    return `## ${issue.id}\n\n${values}`;
  });

  return `# Issues\n\n${sections.join('\n\n')}\n`;
}

function registerRunDirectory(testOwnedChangeDirectories, caseName, runId) {
  const normalizedCaseName = caseName.toUpperCase().replaceAll(/[^A-Z0-9]+/g, '-');
  const changeId = `VALIDATOR-TEST-${normalizedCaseName}-${process.pid}`;
  const changeDirectory = resolve(verificationRoot, changeId);
  const runDirectory = resolve(changeDirectory, runId);
  assert.equal(dirname(changeDirectory), verificationRoot);
  assert.match(changeId, /^VALIDATOR-TEST-[A-Z0-9-]+-\d+$/);
  testOwnedChangeDirectories.add(changeDirectory);

  return { changeId, runDirectory };
}

async function writeFixture(testOwnedChangeDirectories, caseName, runId, fixtureFactory, mutate) {
  const { changeId, runDirectory } = registerRunDirectory(
    testOwnedChangeDirectories,
    caseName,
    runId,
  );

  const fixture = fixtureFactory(changeId, runId, currentFixtureRevision());
  mutate?.(fixture);

  await mkdir(runDirectory, { recursive: true });
  const artifacts = {
    'plan.json': `${JSON.stringify(fixture.plan, null, 2)}\n`,
    'result.json': `${JSON.stringify(fixture.result, null, 2)}\n`,
    'plan.md': renderPlan(fixture.plan),
    'result.md': renderResult(fixture.result),
    'review.md': renderReview(fixture.plan, fixture.result, fixture.verdict),
    'promotion.md': renderPromotion(fixture.plan),
    'issues.md': renderIssues(fixture.result),
  };
  for (const [filename, transform] of Object.entries(fixture.artifactTransforms ?? {})) {
    assert.equal(typeof transform, 'function');
    assert.equal(typeof artifacts[filename], 'string');
    artifacts[filename] = transform(artifacts[filename]);
  }
  for (const filename of fixture.fencedArtifacts ?? []) {
    artifacts[filename] = `\`\`\`markdown\n${artifacts[filename]}\`\`\`\n`;
  }
  await Promise.all(
    Object.entries(artifacts).map(([filename, contents]) =>
      writeFile(resolve(runDirectory, filename), contents),
    ),
  );

  if (fixture.plan.environment?.useAuthState && fixture.files['auth/user.json'] === undefined) {
    fixture.files['auth/user.json'] = '{"authenticated":true}\n';
  }
  for (const [relativePath, contents] of Object.entries(fixture.files)) {
    const targetPath = resolve(runDirectory, relativePath);
    assert.equal(relative(runDirectory, targetPath).startsWith('..'), false);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents);
  }

  if (
    fixture.browserClaim?.postflightExitCode !== undefined &&
    fixture.browserManifest?.omit !== true
  ) {
    await writeExecutionArtifactManifest(runDirectory, fixture.browserManifest?.mutate);
  }

  if (fixture.browserClaim) {
    await writeRunClaim(
      runDirectory,
      'validator-contract-fixture-token',
      fixture.browserClaim.mutate,
      { postflightExitCode: fixture.browserClaim.postflightExitCode },
    );
  }

  return runDirectory;
}

async function writeWrapperFixture(testOwnedChangeDirectories, caseName, runId, files) {
  const { runDirectory } = registerRunDirectory(testOwnedChangeDirectories, caseName, runId);
  const wrapperCheckId = 'BC-WRAPPER-001';
  const defaultFiles = {
    'plan.json': `${JSON.stringify(
      {
        schemaVersion: '1.0',
        change: { baseRef: fixtureBaseRef, source: 'continuous-integration' },
        revision: currentWrapperFixtureRevision(),
        environment: {
          baseUrl: 'http://localhost:8000',
          appEnvironment: 'testing',
          browser: 'chromium',
          locale: 'ja-JP',
          timezone: 'Asia/Tokyo',
          useAuthState: false,
        },
        checks: [
          {
            id: wrapperCheckId,
            driver: 'playwright-temporary',
            target: { url: '/manual-review' },
          },
        ],
      },
      null,
      2,
    )}\n`,
    'generated/preflight.check.spec.ts':
      "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 preflight only', async ({ page }) => {\n  await page.goto('/manual-review');\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n",
  };

  for (const [relativePath, contents] of Object.entries({ ...defaultFiles, ...files })) {
    const targetPath = resolve(runDirectory, relativePath);
    assert.equal(relative(runDirectory, targetPath).startsWith('..'), false);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents);
  }
  await mkdir(resolve(runDirectory, 'evidence/screenshots'), { recursive: true });

  return runDirectory;
}

async function prepareValidatorGit() {
  await mkdir(verificationRoot, { recursive: true });
  const fakeGitDirectory = await mkdtemp(resolve(verificationRoot, 'VALIDATOR-GIT-'));
  const fakeGitPath = resolve(fakeGitDirectory, 'git');
  const fakeGitSource = `#!/usr/bin/env node
const arguments_ = process.argv.slice(2);
if (arguments_[0] === 'rev-parse' && arguments_[1] === '--verify') {
  if (arguments_[2] === 'HEAD^{commit}') {
    process.stdout.write(${JSON.stringify(`${validatorFixtureRevision.headSha}\n`)});
    process.exit(0);
  }
  if (arguments_[2] === ${JSON.stringify(`${fixtureBaseRef}^{commit}`)}) {
    process.stdout.write(${JSON.stringify(`${validatorFixtureRevision.baseSha}\n`)});
    process.exit(0);
  }
}
if (arguments_[0] === 'diff') {
  process.stdout.write(Buffer.from(${JSON.stringify(validatorTrackedDiffBase64)}, 'base64'));
  process.exit(0);
}
if (arguments_[0] === 'status') {
  process.stdout.write(Buffer.from(${JSON.stringify(validatorStatusBase64)}, 'base64'));
  process.exit(0);
}
if (arguments_[0] === 'ls-files' && arguments_[1] === '-v' && arguments_[2] === '-z') {
  process.stdout.write(Buffer.from(${JSON.stringify(validatorIndexBase64)}, 'base64'));
  process.exit(0);
}
process.stderr.write('Unsupported validator-contract Git invocation: ' + JSON.stringify(arguments_) + '\\n');
process.exit(2);
`;
  await writeFile(fakeGitPath, fakeGitSource, { mode: 0o755 });

  return fakeGitDirectory;
}

function runValidator(runDirectory) {
  assert.equal(typeof validatorGitDirectory, 'string');
  return spawnSync(process.execPath, [validatorPath, relative(workspaceRoot, runDirectory)], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: process.env.PATH
        ? `${validatorGitDirectory}${delimiter}${process.env.PATH}`
        : validatorGitDirectory,
    },
    timeout: 60_000,
  });
}

function runWrapper(args, runDirectory) {
  const runDirectoryRelative = runDirectory
    ? relative(workspaceRoot, runDirectory).split(sep).join('/')
    : '';
  return spawnSync(process.execPath, [wrapperPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BROWSER_CHECK_TRUSTED_HOST_SMOKE: 'true',
      ...(runDirectory
        ? {
            BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
            BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runDirectoryRelative}/runtime/browser-check.sqlite`,
            BROWSER_CHECK_RUN_DIR: runDirectoryRelative,
            BROWSER_CHECK_USE_AUTH_STATE: 'false',
            PLAYWRIGHT_BASE_URL: 'http://localhost:8000',
          }
        : {}),
    },
    timeout: 120_000,
  });
}

async function collectGeneratedSources(generatedDirectory, sources = []) {
  for (const entry of await readdir(generatedDirectory, { withFileTypes: true })) {
    const entryPath = resolve(generatedDirectory, entry.name);
    if (entry.isDirectory()) {
      await collectGeneratedSources(entryPath, sources);
    } else if (entry.isFile() && entry.name.endsWith('.check.spec.ts')) {
      sources.push(entryPath);
    }
  }

  return sources;
}

async function generatedSourceHash(runDirectory) {
  const generatedDirectory = resolve(runDirectory, 'generated');
  const generatedSources = (await collectGeneratedSources(generatedDirectory)).sort(
    (left, right) => {
      if (left === right) {
        return 0;
      }
      return left < right ? -1 : 1;
    },
  );
  const generatedFingerprint = createHash('sha256');
  for (const sourcePath of generatedSources) {
    generatedFingerprint.update(relative(generatedDirectory, sourcePath).split(sep).join('/'));
    generatedFingerprint.update('\0');
    generatedFingerprint.update(await readFile(sourcePath));
    generatedFingerprint.update('\0');
  }

  return `sha256:${generatedFingerprint.digest('hex')}`;
}

async function collectExecutionArtifactFiles(runDirectory) {
  const files = [];

  async function collectDirectory(relativeDirectory) {
    const absoluteDirectory = resolve(runDirectory, relativeDirectory);
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        await collectDirectory(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  try {
    await access(resolve(runDirectory, 'playwright-results.json'));
    files.push('playwright-results.json');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  for (const root of executionArtifactRootDirectories) {
    await collectDirectory(root);
  }

  return files.sort();
}

async function writeExecutionArtifactManifest(runDirectory, mutate) {
  const files = [];
  for (const path of await collectExecutionArtifactFiles(runDirectory)) {
    const contents = await readFile(resolve(runDirectory, path));
    files.push({
      path,
      size: contents.byteLength,
      sha256: `sha256:${createHash('sha256').update(contents).digest('hex')}`,
    });
  }
  const manifest = { schemaVersion: '1.0', files };
  mutate?.(manifest);
  await writeFile(
    resolve(runDirectory, '.browser-check-artifacts.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

async function prepareDockerAssetWorkspace(runDirectory, planRevision) {
  const assetWorkspace = resolve(runDirectory, 'runtime/assets');
  await rm(assetWorkspace, { recursive: true, force: true });
  await mkdir(resolve(assetWorkspace, 'public'), { recursive: true });
  await cp(resolve(workspaceRoot, 'public/build'), resolve(assetWorkspace, 'public/build'), {
    recursive: true,
  });
  await mkdir(resolve(assetWorkspace, 'storage/framework'), { recursive: true });
  const assetsHash = frontendAssetsContentFingerprint(assetWorkspace);
  await writeFile(
    resolve(assetWorkspace, 'storage/framework/browser-check-assets.json'),
    `${JSON.stringify({
      schemaVersion: '1.0',
      revision: {
        headSha: planRevision.headSha,
        worktreeFingerprint: planRevision.worktreeFingerprint,
      },
      assetsHash,
      dependenciesFingerprint: trustedDependenciesFingerprint,
    })}\n`,
  );
  return assetWorkspace;
}

async function writeRunClaim(runDirectory, token, mutate, options = {}) {
  const planSource = await readFile(resolve(runDirectory, 'plan.json'));
  const plan = JSON.parse(planSource.toString('utf8'));
  const planHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
  const generatedFingerprint = await generatedSourceHash(runDirectory);
  const plannedBaseUrl = new URL(plan.environment.baseUrl);
  const planUsesDocker = plannedBaseUrl.hostname === 'nginx-browser-check';
  const assetWorkspace = planUsesDocker
    ? await prepareDockerAssetWorkspace(runDirectory, plan.revision)
    : workspaceRoot;
  const frontendAssetsHash = frontendAssetsFingerprint(
    assetWorkspace,
    plan.revision,
    undefined,
    planUsesDocker ? trustedDependenciesFingerprint : undefined,
  );
  const databaseConnection = planUsesDocker ? 'mysql' : 'sqlite';
  const databaseIdentity = planUsesDocker
    ? 'mysql:mysql-browser-check/browser_check'
    : `sqlite:${relative(workspaceRoot, runDirectory).split(sep).join('/')}/runtime/browser-check.sqlite`;
  if (planUsesDocker) {
    plannedBaseUrl.hostname = 'localhost';
  }
  const authStateHash = plan.environment.useAuthState
    ? `sha256:${createHash('sha256')
        .update(await readFile(resolve(runDirectory, 'auth/user.json')))
        .digest('hex')}`
    : undefined;
  const runtime = {
    baseUrl: plannedBaseUrl.toString(),
    useAuthState: plan.environment.useAuthState ?? false,
    appEnvironment: 'testing',
    databaseConnection,
    databaseIdentifierHash: `sha256:${createHash('sha256').update(databaseIdentity).digest('hex')}`,
    ...(planUsesDocker ? { dependenciesFingerprint: trustedDependenciesFingerprint } : {}),
    browser: plan.environment.browser,
    locale: plan.environment.locale,
    timezone: plan.environment.timezone,
    ...(authStateHash ? { authStateHash } : {}),
  };
  const claim = {
    schemaVersion: '1.0',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    runDir: runDirectory,
    planHash,
    generatedSourceHash: generatedFingerprint,
    frontendAssetsHash,
    planRevision: structuredClone(plan.revision),
    preflightRevision: structuredClone(plan.revision),
    runtime,
    claimedAt: '2026-08-01T15:00:00.000Z',
  };
  if (options.postflightExitCode !== undefined) {
    const manifestSource = await readFile(resolve(runDirectory, '.browser-check-artifacts.json'));
    claim.postflight = {
      completedAt: '2026-08-01T15:00:01.000Z',
      planHash,
      generatedSourceHash: generatedFingerprint,
      frontendAssetsHash,
      revision: structuredClone(plan.revision),
      runtime: structuredClone(runtime),
      playwrightExitCode: options.postflightExitCode,
      executionArtifactManifestHash: `sha256:${createHash('sha256')
        .update(manifestSource)
        .digest('hex')}`,
    };
  }
  mutate?.(claim);
  await writeFile(
    resolve(runDirectory, '.browser-check-run.json'),
    `${JSON.stringify(claim, null, 2)}\n`,
  );
}

function runPlaywrightConfig(runDirectory, token, environmentOverrides = {}) {
  const playwrightCli = resolve(workspaceRoot, 'node_modules/@playwright/test/cli.js');
  const plan = JSON.parse(readFileSync(resolve(runDirectory, 'plan.json'), 'utf8'));
  const planBaseUrl = new URL(plan.environment.baseUrl);
  const isDocker = planBaseUrl.hostname === 'nginx-browser-check';
  const databaseIdentifier = isDocker
    ? 'mysql:mysql-browser-check/browser_check'
    : `sqlite:${relative(workspaceRoot, runDirectory).split(sep).join('/')}/runtime/browser-check.sqlite`;

  const environment = {
    ...process.env,
    BROWSER_CHECK_RUN_DIR: relative(workspaceRoot, runDirectory),
    BROWSER_CHECK_RUN_TOKEN: token,
    PLAYWRIGHT_BASE_URL: plan.environment.baseUrl,
    BROWSER_CHECK_USE_AUTH_STATE: String(plan.environment.useAuthState ?? false),
    BROWSER_CHECK_DATABASE_CONNECTION: isDocker ? 'mysql' : 'sqlite',
    BROWSER_CHECK_DATABASE_IDENTIFIER: databaseIdentifier,
    ...(isDocker
      ? {
          BROWSER_CHECK_ASSET_WORKSPACE: `${relative(workspaceRoot, runDirectory).split(sep).join('/')}/runtime/assets`,
          BROWSER_CHECK_TRUSTED_BASE_SHA: plan.revision.baseSha,
          BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT: trustedDependenciesFingerprint,
          BROWSER_CHECK_TRUSTED_HEAD_SHA: plan.revision.headSha,
          BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT: plan.revision.worktreeFingerprint,
        }
      : {}),
  };
  for (const name of [
    'BROWSER_CHECK_TRUSTED_BASE_SHA',
    'BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT',
    'BROWSER_CHECK_TRUSTED_HEAD_SHA',
    'BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT',
  ]) {
    if (!isDocker) {
      delete environment[name];
    }
  }
  Object.assign(environment, environmentOverrides);
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete environment[name];
    }
  }

  return spawnSync(
    process.execPath,
    [playwrightCli, 'test', '--config=playwright.browser-check.config.ts', '--list'],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: environment,
      timeout: 60_000,
    },
  );
}

function diagnosticOutput(validation) {
  return `${validation.stdout}\n${validation.stderr}`;
}

function assertValid(validation) {
  assert.equal(validation.signal, null, diagnosticOutput(validation));
  assert.equal(validation.status, 0, diagnosticOutput(validation));
  assert.match(validation.stdout, /Change-verification artifacts are valid:/);
}

function assertInvalid(validation, expectedDiagnostic) {
  assert.equal(validation.signal, null, diagnosticOutput(validation));
  assert.equal(validation.status, 1, diagnosticOutput(validation));
  assert.match(validation.stderr, /Change-verification artifacts are invalid \(\d+ error\(s\)\):/);
  assert.match(validation.stderr, expectedDiagnostic);
}

function assertInvalidWrapper(execution, expectedDiagnostic) {
  assert.equal(execution.signal, null, diagnosticOutput(execution));
  assert.equal(execution.status, 2, diagnosticOutput(execution));
  assert.match(execution.stderr, expectedDiagnostic);
}

await test('change-verification validator contract matrix', async (t) => {
  const testOwnedChangeDirectories = new Set();
  const fixtureRevision = currentWrapperFixtureRevision();

  try {
    validatorGitDirectory = await prepareValidatorGit();
    await t.test('accepts an explicit not-required run', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'valid-not-required',
        '20260801231001',
        makeNotRequiredFixture,
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('accepts a human not_run result with a blocker', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'valid-human-not-run',
        '20260801231002',
        makeHumanNotRunFixture,
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('rejects fabricated agent-browser image and DOM evidence', async () => {
      const configureAgentBrowserPass = (fixture, evidencePath, evidenceContents) => {
        const check = fixture.plan.checks[0];
        const checkResult = fixture.result.results[0];
        check.lifecycle = 'change-only';
        check.driver = 'agent-browser';
        check.evidence = ['Focused browser evidence'];
        checkResult.driver = 'agent-browser';
        checkResult.status = 'pass';
        checkResult.actualResult = 'The agent-browser check was reported as passing.';
        checkResult.environment = {
          browser: 'chromium',
          viewport: '1280x720',
          baseUrl: 'http://localhost:8000',
        };
        checkResult.evidence = [evidencePath];
        delete checkResult.blocker;
        fixture.result.summary.notRun = 0;
        fixture.result.summary.pass = 1;
        fixture.verdict = 'pass';
        fixture.files[evidencePath] = evidenceContents;
      };
      const imageRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'agent-browser-fake-image',
        '20260801231249',
        makeHumanNotRunFixture,
        (fixture) => {
          configureAgentBrowserPass(
            fixture,
            'evidence/screenshots/fabricated.png',
            'not an image\n',
          );
        },
      );
      const domRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'agent-browser-empty-dom',
        '20260801231250',
        makeHumanNotRunFixture,
        (fixture) => {
          const domPath = `evidence/dom/${fixture.plan.checks[0].id}.json`;
          configureAgentBrowserPass(
            fixture,
            domPath,
            `${JSON.stringify(
              {
                schemaVersion: '1.0',
                checkId: fixture.plan.checks[0].id,
                url: 'http://localhost:8000/manual-review',
                capturedAt: '2026-08-01T15:00:00.000Z',
                content: '   ',
              },
              null,
              2,
            )}\n`,
          );
        },
      );

      assertInvalid(runValidator(imageRunDirectory), /must contain a structurally valid PNG image/);
      assertInvalid(runValidator(domRunDirectory), /content: must be a non-empty string/);
    });

    await t.test('rejects agent-browser DOM evidence from an unplanned URL', async () => {
      const configureAgentBrowserDomPass = (fixture, url) => {
        const check = fixture.plan.checks[0];
        const checkResult = fixture.result.results[0];
        const evidencePath = `evidence/dom/${check.id}.json`;
        check.lifecycle = 'change-only';
        check.driver = 'agent-browser';
        check.evidence = ['Focused browser DOM evidence'];
        checkResult.driver = 'agent-browser';
        checkResult.status = 'pass';
        checkResult.actualResult = 'The agent-browser check was reported as passing.';
        checkResult.environment = {
          browser: 'chromium',
          viewport: '1280x720',
          baseUrl: 'http://localhost:8000',
        };
        checkResult.evidence = [evidencePath];
        delete checkResult.blocker;
        fixture.result.summary.notRun = 0;
        fixture.result.summary.pass = 1;
        fixture.verdict = 'pass';
        fixture.files[evidencePath] = `${JSON.stringify(
          {
            schemaVersion: '1.0',
            checkId: check.id,
            url,
            capturedAt: '2026-08-01T15:00:00.000Z',
            content: '<main>Observed browser content</main>',
          },
          null,
          2,
        )}\n`;
      };
      const foreignOriginRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'agent-dom-foreign-origin',
        '20260801231312',
        makeHumanNotRunFixture,
        (fixture) => configureAgentBrowserDomPass(fixture, 'https://example.test/manual-review'),
      );
      const differentPathRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'agent-dom-different-path',
        '20260801231313',
        makeHumanNotRunFixture,
        (fixture) => configureAgentBrowserDomPass(fixture, 'http://localhost:8000/other-review'),
      );

      assertInvalid(
        runValidator(foreignOriginRunDirectory),
        /must equal the planned target URL http:\/\/localhost:8000\/manual-review/,
      );
      assertInvalid(
        runValidator(differentPathRunDirectory),
        /must equal the planned target URL http:\/\/localhost:8000\/manual-review/,
      );
    });

    await t.test('accepts structured completed and advisory delegated work', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'valid-delegated-work',
        '20260801231230',
        makeNotRequiredFixture,
        (fixture) => {
          const normalizedChangeId = fixture.plan.change.id.replaceAll('-', '');
          const delegatedWorkId = `DW-${normalizedChangeId}-001`;
          const evidencePath = `evidence/delegated/${delegatedWorkId}.json`;
          fixture.plan.delegatedWorkItems = [
            {
              id: delegatedWorkId,
              type: 'feature-test',
              priority: 'P1',
              requiredForVerdict: true,
              status: 'completed',
              target: 'tests/Feature/ExampleTest.php',
              reason: 'The deterministic server contract belongs in a feature test.',
              evidence: [evidencePath],
            },
            {
              id: `DW-${normalizedChangeId}-002`,
              type: 'permanent-e2e',
              priority: 'P3',
              requiredForVerdict: false,
              status: 'not_required',
              target: 'tests/e2e/tests/example/example.spec.ts',
              reason: 'Reconsider only if this change-only scenario recurs.',
              evidence: [],
            },
          ];
          fixture.files[evidencePath] = `${JSON.stringify(
            {
              schemaVersion: '1.0',
              delegatedWorkId,
              type: 'feature-test',
              target: 'tests/Feature/ExampleTest.php',
              revision: fixture.plan.revision,
              command: 'php artisan test tests/Feature/ExampleTest.php',
              workingDirectory: '.',
              selectedTargets: ['tests/Feature/ExampleTest.php'],
              exitCode: 0,
              summary: 'The delegated feature test passed.',
            },
            null,
            2,
          )}\n`;
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('requires evidence for completed required delegated work', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-evidence',
        '20260801231231',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.delegatedWorkItems = [
            {
              id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
              type: 'component-test',
              priority: 'P2',
              requiredForVerdict: true,
              status: 'completed',
              target: 'resources/js/components/Example.test.tsx',
              reason: 'Component behavior needs durable regression coverage.',
              evidence: [],
            },
          ];
        },
      );
      const genericEvidenceRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-generic-evidence',
        '20260801231235',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.delegatedWorkItems = [
            {
              id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
              type: 'component-test',
              priority: 'P2',
              requiredForVerdict: true,
              status: 'completed',
              target: 'resources/js/components/Example.test.tsx',
              reason: 'Component behavior needs durable regression coverage.',
              evidence: ['evidence/notes/self-authored.txt'],
            },
          ];
          fixture.files['evidence/notes/self-authored.txt'] = 'Looks good.\n';
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /delegatedWorkItems\[0\]\.evidence: completed required delegated work must include evidence/,
      );
      assertInvalid(
        runValidator(genericEvidenceRunDirectory),
        /completed required delegated work must include evidence\/delegated\/DW-.*\.json/,
      );
    });

    await t.test(
      'requires incomplete verdict for unresolved required P0-P2 delegated work',
      async () => {
        const invalidRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'delegated-work-verdict-invalid',
          '20260801231232',
          makeNotRequiredFixture,
          (fixture) => {
            fixture.plan.delegatedWorkItems = [
              {
                id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
                type: 'unit-test',
                priority: 'P2',
                requiredForVerdict: true,
                status: 'not_run',
                target: 'tests/Unit/ExampleTest.php',
                reason: 'The required boundary matrix has not been executed.',
                evidence: [],
              },
            ];
            fixture.verdict = 'conditional-pass';
          },
        );
        const validRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'delegated-work-verdict-valid',
          '20260801231233',
          makeNotRequiredFixture,
          (fixture) => {
            fixture.plan.delegatedWorkItems = [
              {
                id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
                type: 'unit-test',
                priority: 'P2',
                requiredForVerdict: true,
                status: 'blocked',
                target: 'tests/Unit/ExampleTest.php',
                reason: 'The required boundary matrix is blocked by missing fixture data.',
                evidence: [],
              },
            ];
            fixture.verdict = 'incomplete';
          },
        );
        const failedCheckRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'delegated-work-verdict-failed-check',
          '20260801231234',
          makeHumanNotRunFixture,
          (fixture) => {
            configureFailingPlaywrightFixture(fixture);
            fixture.plan.delegatedWorkItems = [
              {
                id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
                type: 'unit-test',
                priority: 'P1',
                requiredForVerdict: true,
                status: 'not_run',
                target: 'tests/Unit/ExampleTest.php',
                reason: 'A required security regression remains unexecuted.',
                evidence: [],
              },
            ];
            fixture.verdict = 'incomplete';
          },
        );

        assertInvalid(
          runValidator(invalidRunDirectory),
          /verdict must be incomplete while required P0-P2 delegated work is not completed/,
        );
        assertValid(runValidator(validRunDirectory));
        assertValid(runValidator(failedCheckRunDirectory));
      },
    );

    await t.test('rejects legacy delegated work and noncanonical delegated Markdown', async () => {
      const legacyRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'legacy-delegated-work',
        '20260801231234',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.delegatedWork = [];
          delete fixture.plan.delegatedWorkItems;
        },
      );
      const projectionRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-projection',
        '20260801231235',
        makeNotRequiredFixture,
        (fixture) => {
          const reason = 'This recommendation is deliberately projected canonically.';
          fixture.plan.delegatedWorkItems = [
            {
              id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
              type: 'other',
              priority: 'P3',
              requiredForVerdict: false,
              status: 'not_required',
              target: 'Manual follow-up',
              reason,
              evidence: [],
            },
          ];
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              source.replace(`| ${reason} |`, `| ${reason} | unexpected column |`),
          };
        },
      );

      assertInvalid(
        runValidator(legacyRunDirectory),
        /plan\.json\.delegatedWork: is obsolete; use delegatedWorkItems/,
      );
      assertInvalid(
        runValidator(projectionRunDirectory),
        /plan\.md: must contain one exact delegated-work row/,
      );
    });

    await t.test('rejects extra, missing, and duplicate delegated-work fields', async () => {
      const delegatedItem = (fixture) => ({
        id: `DW-${fixture.plan.change.id.replaceAll('-', '')}-001`,
        type: 'other',
        priority: 'P3',
        requiredForVerdict: false,
        status: 'not_required',
        target: 'Follow-up recommendation',
        reason: 'No verdict dependency.',
        evidence: [],
      });
      const extraRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-extra-key',
        '20260801231254',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.delegatedWorkItems = [{ ...delegatedItem(fixture), extra: true }];
        },
      );
      const missingRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-missing-key',
        '20260801231255',
        makeNotRequiredFixture,
        (fixture) => {
          const item = delegatedItem(fixture);
          delete item.reason;
          fixture.plan.delegatedWorkItems = [item];
        },
      );
      const duplicateRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'delegated-work-duplicate-id',
        '20260801231256',
        makeNotRequiredFixture,
        (fixture) => {
          const item = delegatedItem(fixture);
          fixture.plan.delegatedWorkItems = [item, structuredClone(item)];
        },
      );

      assertInvalid(
        runValidator(extraRunDirectory),
        /delegatedWorkItems\[0\]\.extra: is not an allowed key/,
      );
      assertInvalid(
        runValidator(missingRunDirectory),
        /delegatedWorkItems\[0\]\.reason: must be a non-empty string/,
      );
      assertInvalid(runValidator(duplicateRunDirectory), /duplicates delegated work ID/);
    });

    await t.test('rejects an empty plan', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'empty-plan',
        '20260801231003',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.checks = [];
          fixture.result.results = [];
          fixture.result.summary.notRequired = 0;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /plan\.json\.checks: must contain at least one check/,
      );
    });

    await t.test('rejects a cross-origin browser target', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'cross-origin',
        '20260801231004',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.plan.checks[0].target.url = 'https://example.test/manual-review';
        },
      );

      assertInvalid(runValidator(runDirectory), /target\.url: must stay on the planned origin/);
    });

    await t.test('requires the fixed temporary-browser locale and browser', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'temporary-runtime-tuple',
        '20260801231126',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.plan.environment.browser = 'firefox';
          fixture.plan.environment.locale = 'en-US';
          fixture.plan.checks[0].lifecycle = 'change-only';
          fixture.plan.checks[0].driver = 'playwright-temporary';
          fixture.result.results[0].driver = 'playwright-temporary';
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(
        validation,
        /plan\.json\.environment\.browser: playwright-temporary checks require the chromium browser/,
      );
      assert.match(
        validation.stderr,
        /plan\.json\.environment\.locale: playwright-temporary checks require the ja-JP locale/,
      );
    });

    await t.test('rejects a product defect attached to a non-fail result', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'product-defect-non-fail',
        '20260801231005',
        makeHumanNotRunFixture,
        (fixture) => {
          const checkResult = fixture.result.results[0];
          const issueId = `CVI-${fixture.result.runId}-001`;
          const evidencePath = 'evidence/product-defect.txt';
          checkResult.status = 'blocked';
          checkResult.actualResult =
            'The manual flow stopped before acceptance could be established.';
          checkResult.evidence = [evidencePath];
          checkResult.issues = [issueId];
          checkResult.humanExecution = {
            executor: 'Validator test operator',
            executedAt: '2026-08-01T23:01:00+09:00',
            device: 'Desktop test browser',
          };
          checkResult.blocker = {
            reason: 'The intentionally invalid issue classification blocked completion.',
            nextAction: 'Classify the blocker conservatively or record a failing objective result.',
          };
          fixture.result.summary.notRun = 0;
          fixture.result.summary.blocked = 1;
          fixture.result.issueRecords = [
            {
              id: issueId,
              checkId: checkResult.checkId,
              classification: 'product-defect',
              priority: 'P2',
              expected: 'The manual flow reaches its acceptance state.',
              actual: 'The flow stopped before acceptance was established.',
              reproduction: ['Open the human-only review target.'],
              evidence: [evidencePath],
              disposition: 'Reclassify the blocker unless objective failure evidence is obtained.',
            },
          ];
          fixture.verdict = 'incomplete';
          fixture.files[evidencePath] = 'Intentionally invalid product-defect fixture evidence.\n';
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /a product-defect issue requires the owning objective check to have fail status/,
      );
    });

    await t.test(
      'rejects a passing objective result with an unresolved non-product issue',
      async () => {
        const runDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'pass-with-environment-issue',
          '20260801231315',
          makeHumanNotRunFixture,
          (fixture) => {
            const check = fixture.plan.checks[0];
            const checkResult = fixture.result.results[0];
            const issueId = `CVI-${fixture.result.runId}-001`;
            const domEvidencePath = `evidence/dom/${check.id}.json`;
            const evidencePath = 'evidence/environment-defect.txt';
            check.lifecycle = 'change-only';
            check.driver = 'agent-browser';
            check.evidence = ['Focused browser DOM evidence'];
            checkResult.driver = 'agent-browser';
            checkResult.status = 'pass';
            checkResult.actualResult = 'The agent-browser check was reported as passing.';
            checkResult.environment = {
              browser: 'chromium',
              viewport: '1280x720',
              baseUrl: 'http://localhost:8000',
            };
            checkResult.evidence = [domEvidencePath];
            checkResult.issues = [issueId];
            delete checkResult.blocker;
            fixture.result.summary.notRun = 0;
            fixture.result.summary.pass = 1;
            fixture.result.issueRecords = [
              {
                id: issueId,
                checkId: checkResult.checkId,
                classification: 'environment-defect',
                priority: 'P2',
                expected: 'The isolated browser environment remains available.',
                actual: 'The environment has an unresolved startup defect.',
                reproduction: ['Start the isolated browser-check environment.'],
                evidence: [evidencePath],
                disposition: 'Repair the environment before reporting an objective pass.',
              },
            ];
            fixture.verdict = 'pass';
            fixture.files[domEvidencePath] = `${JSON.stringify(
              {
                schemaVersion: '1.0',
                checkId: check.id,
                url: 'http://localhost:8000/manual-review',
                capturedAt: '2026-08-01T15:00:00.000Z',
                content: '<main>Observed browser content</main>',
              },
              null,
              2,
            )}\n`;
            fixture.files[evidencePath] = 'Environment startup remained unresolved.\n';
          },
        );

        assertInvalid(
          runValidator(runDirectory),
          /an unresolved tooling, data, environment, or specification issue requires blocked or not_run status/,
        );
      },
    );

    await t.test('rejects PNG issue evidence owned by another check ID', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'foreign-issue-png',
        '20260801231055',
        makeHumanNotRunFixture,
        (fixture) => {
          configureFailingPlaywrightFixture(fixture);
          const foreignEvidencePath = 'evidence/screenshots/BC-FOREIGNCHECK-002-observed.png';
          fixture.result.issueRecords[0].evidence = [foreignEvidencePath];
          fixture.files[foreignEvidencePath] = validPng;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /PNG evidence must contain exactly one bounded owning check ID BC-VALIDATORTESTFOREIGNISSUEPNG\d+-001/,
      );
    });

    await t.test(
      'rejects PNG result and issue evidence that mixes owning and foreign check IDs',
      async () => {
        const resultRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'mixed-owner-result-png',
          '20260801231310',
          makeHumanNotRunFixture,
          (fixture) => {
            const checkId = fixture.plan.checks[0].id;
            const mixedEvidencePath = `evidence/screenshots/${checkId}-BC-FOREIGNCHECK-002-observed.png`;
            fixture.result.results[0].evidence = [mixedEvidencePath];
            fixture.files[mixedEvidencePath] = validPng;
          },
        );
        const issueRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'mixed-owner-issue-png',
          '20260801231311',
          makeHumanNotRunFixture,
          (fixture) => {
            const checkResult = fixture.result.results[0];
            const checkId = checkResult.checkId;
            const issueId = `CVI-${fixture.result.runId}-001`;
            const mixedEvidencePath = `evidence/screenshots/${checkId}-BC-FOREIGNCHECK-002-observed.png`;
            checkResult.issues = [issueId];
            fixture.result.issueRecords = [
              {
                id: issueId,
                checkId,
                classification: 'environment-defect',
                priority: 'P2',
                expected: 'The human browser environment is available.',
                actual: 'The environment is unavailable.',
                reproduction: ['Open the planned human browser target.'],
                evidence: [mixedEvidencePath],
                disposition: 'Restore the environment before executing the check.',
              },
            ];
            fixture.files[mixedEvidencePath] = validPng;
          },
        );

        assertInvalid(
          runValidator(resultRunDirectory),
          /PNG evidence must contain exactly one bounded owning check ID BC-VALIDATORTESTMIXEDOWNERRESULTPNG\d+-001/,
        );
        assertInvalid(
          runValidator(issueRunDirectory),
          /PNG evidence must contain exactly one bounded owning check ID BC-VALIDATORTESTMIXEDOWNERISSUEPNG\d+-001/,
        );
      },
    );

    await t.test('rejects a named but unstructured assertion record as pass evidence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'empty-assertion-record',
        '20260801231056',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const checkResult = fixture.result.results[0];
          const assertionPath = `evidence/console/${checkResult.checkId}-assertion.json`;
          checkResult.evidence = ['playwright-results.json', assertionPath];
          fixture.files[assertionPath] = '{}\n';
          for (const path of Object.keys(fixture.files)) {
            if (path.endsWith('.png')) {
              delete fixture.files[path];
            }
          }
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-temporary pass requires an owner-bound focused PNG screenshot/,
      );
    });

    await t.test('rejects a verdict that contradicts completed results', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'verdict-mismatch',
        '20260801231006',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.verdict = 'fail';
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /verdict must be pass when no failed or unresolved work remains/,
      );
    });

    await t.test('rejects canonical structure that exists only inside code fences', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'fenced-structure',
        '20260801231008',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.fencedArtifacts = ['plan.md', 'result.md', 'review.md'];
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /plan\.md: must contain one exact classification row/);
      assert.match(
        validation.stderr,
        /review\.md: must contain exactly one ## Verdict section followed by one backticked allowed verdict/,
      );
    });

    await t.test('rejects a scalar projection that exists only inside a code fence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'fenced-scalar',
        '20260801231012',
        makeNotRequiredFixture,
        (fixture) => {
          const scalar = fixture.plan.change.summary;
          const visibleLine = `- summary: ${scalar}\n`;
          fixture.artifactTransforms = {
            'plan.md': (source) => {
              assert.equal(source.split(visibleLine).length, 2);
              return `${source.replace(visibleLine, '')}\n\`\`\`text\n${scalar}\n\`\`\`\n`;
            },
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /plan\.md: must project change\.summary/);
    });

    await t.test('rejects summary counts that exist only inside a code fence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'fenced-summary',
        '20260801231013',
        makeNotRequiredFixture,
        (fixture) => {
          const summaryLine =
            'Summary counts: pass=0; fail=0; blocked=0; notRun=0; observation=0; notRequired=1';
          fixture.artifactTransforms = {
            'result.md': (source) => {
              assert.equal(source.split(summaryLine).length, 2);
              return `${source.replace(summaryLine, '')}\n\`\`\`text\n${summaryLine}\n\`\`\`\n`;
            },
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /result\.md: must project summary counts/);
    });

    await t.test('rejects projections hidden in CommonMark container fences', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'container-fenced-projections',
        '20260801231101',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          const resultSummary =
            'Summary counts: pass=0; fail=0; blocked=0; notRun=0; observation=0; notRequired=1';
          fixture.artifactTransforms = {
            'plan.md': (source) => {
              assert.equal(source.split(planLine).length, 2);
              return `${source.replace(planLine, '')}\n> \`\`\`text\n> ${planSummary}\n> \`\`\`\n`;
            },
            'result.md': (source) => {
              assert.equal(source.split(resultSummary).length, 2);
              return `${source.replace(resultSummary, '')}\n- \`\`\`text\n  ${resultSummary}\n  \`\`\`\n`;
            },
          };
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /plan\.md: must project change\.summary/);
      assert.match(validation.stderr, /result\.md: must project summary counts/);
    });

    await t.test('does not treat container-like fence content as a top-level closer', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'container-like-fake-closer',
        '20260801231215',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          const resultSummary =
            'Summary counts: pass=0; fail=0; blocked=0; notRun=0; observation=0; notRequired=1';
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n\`\`\`text\n> \`\`\`\n\t\`\`\`\n${planSummary}\n\`\`\`\n`,
            'result.md': (source) =>
              `${source.replace(resultSummary, '')}\n\`\`\`text\n- \`\`\`\n${resultSummary}\n\`\`\`\n`,
          };
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /plan\.md: must project change\.summary/);
      assert.match(validation.stderr, /result\.md: must project summary counts/);
    });

    await t.test('accepts a closed fence in a deeply indented ordered-list container', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'deep-list-container-fence',
        '20260801231216',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `   123456789. \`\`\`text\n              harmless example\n              \`\`\`\n\n${source}`,
          };
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('rejects projections in multiline nested-list continuation fences', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'multiline-list-container-fence',
        '20260801231220',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          const resultSummary =
            'Summary counts: pass=0; fail=0; blocked=0; notRun=0; observation=0; notRequired=1';
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n- outer\n  - inner\n\n    \`\`\`text\n    ${planSummary}\n    \`\`\`\n`,
            'result.md': (source) =>
              `${source.replace(resultSummary, '')}\n123456789. outer\n\n           \`\`\`text\n           ${resultSummary}\n           \`\`\`\n`,
          };
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /plan\.md: must project change\.summary/);
      assert.match(validation.stderr, /result\.md: must project summary counts/);
    });

    await t.test('does not let indented code desynchronize a later list fence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'indented-code-before-list-fence',
        '20260801231221',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n    \`\`\`\n- outer\n\n    \`\`\`\n    ${planSummary}\n    \`\`\`\n`,
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /plan\.md: must project change\.summary/);
    });

    await t.test('does not let ambiguous list padding expose fenced content', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'ambiguous-list-padding-fence',
        '20260801231222',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n-     \`\`\`\n     \`\`\`\n  ${planSummary}\n     \`\`\`\n`,
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /plan\.md: must project change\.summary/);
    });

    await t.test('rejects less-indented content inside a list fence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'less-indented-list-fence-content',
        '20260801231223',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n- outer\n    \`\`\`\n  ${planSummary}\n    \`\`\`\n`,
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /plan\.md: must project change\.summary/);
    });

    await t.test('does not carry an unterminated container fence into later content', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'unterminated-container-fence',
        '20260801231224',
        makeNotRequiredFixture,
        (fixture) => {
          const planSummary = fixture.plan.change.summary;
          const planLine = `- summary: ${planSummary}\n`;
          fixture.artifactTransforms = {
            'plan.md': (source) =>
              `${source.replace(planLine, '')}\n> \`\`\`\noutside\n\n> \`\`\`\n> ${planSummary}\n> \`\`\`\n`,
          };
        },
      );

      assertInvalid(runValidator(runDirectory), /plan\.md: must project change\.summary/);
    });

    await t.test('rejects an issue field that exists only inside a code fence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'fenced-issue',
        '20260801231014',
        makeHumanNotRunFixture,
        (fixture) => {
          const checkResult = fixture.result.results[0];
          const issueId = `CVI-${fixture.result.runId}-001`;
          const evidencePath = 'evidence/environment-defect.txt';
          const disposition = 'UNIQUE-DISPOSITION-FENCED-ONLY';
          checkResult.status = 'blocked';
          checkResult.issues = [issueId];
          checkResult.evidence = [evidencePath];
          checkResult.humanExecution = {
            executor: 'Validator test operator',
            executedAt: '2026-08-01T23:01:00+09:00',
            device: 'Desktop test browser',
          };
          fixture.result.summary.notRun = 0;
          fixture.result.summary.blocked = 1;
          fixture.result.issueRecords = [
            {
              id: issueId,
              checkId: checkResult.checkId,
              classification: 'environment-defect',
              priority: 'P2',
              expected: 'The human review environment is available.',
              actual: 'The review environment was unavailable.',
              reproduction: ['Open the documented human review target.'],
              evidence: [evidencePath],
              disposition,
            },
          ];
          fixture.verdict = 'incomplete';
          fixture.files[evidencePath] = 'Environment failure evidence.\n';
          fixture.artifactTransforms = {
            'issues.md': (source) => {
              const visibleLine = `- disposition: ${disposition}\n`;
              assert.equal(source.split(visibleLine).length, 2);
              return `${source.replace(visibleLine, '')}\n\`\`\`text\n${disposition}\n\`\`\`\n`;
            },
          };
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /issues\.md: must project issue .* disposition: UNIQUE-DISPOSITION-FENCED-ONLY/,
      );
    });

    await t.test('rejects a base SHA that does not resolve from the planned base ref', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'base-sha-mismatch',
        '20260801231015',
        makeNotRequiredFixture,
        (fixture) => {
          const mismatchedSha = '0'.repeat(40);
          fixture.plan.revision.baseSha = mismatchedSha;
          fixture.result.revision.baseSha = mismatchedSha;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /plan\.json\.revision\.baseSha: base ref .* resolves to [0-9a-f]{40}/,
      );
    });

    await t.test('accepts a fully reconciled Playwright report', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'valid-playwright-report',
        '20260801231016',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const consolePath = 'evidence/console/planned.json';
          const networkPath = 'evidence/network/planned.json';
          fixture.result.results[0].evidence.push(consolePath, networkPath);
          fixture.files[consolePath] = '{"errors":[]}\n';
          fixture.files[networkPath] = '{"failedRequests":[]}\n';
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test(
      'accepts an exact global pre-report execution error without report or postflight',
      async () => {
        const runDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'valid-global-execution-error',
          '20260801231236',
          makeHumanNotRunFixture,
          configureGlobalExecutionErrorFixture,
        );

        assertValid(runValidator(runDirectory));
      },
    );

    await t.test(
      'rejects contradictory report and postflight artifacts for a global error',
      async () => {
        const reportRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'global-error-with-report',
          '20260801231237',
          makeHumanNotRunFixture,
          configureGlobalExecutionErrorFixture,
        );
        const checkId = checkIdFor(basename(dirname(reportRunDirectory)));
        await writeFile(
          resolve(reportRunDirectory, 'playwright-results.json'),
          `${JSON.stringify(passingPlaywrightReport(checkId), null, 2)}\n`,
        );
        const postflightRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'global-error-with-postflight',
          '20260801231238',
          makeHumanNotRunFixture,
          (fixture) => {
            configureGlobalExecutionErrorFixture(fixture);
            fixture.browserClaim.postflightExitCode = 1;
          },
        );

        assertInvalid(
          runValidator(reportRunDirectory),
          /\.browser-check-execution-error\.json: must not coexist with playwright-results\.json/,
        );
        assertInvalid(
          runValidator(postflightRunDirectory),
          /\.browser-check-run\.json\.postflight: must be omitted when a global pre-report execution error exists/,
        );
      },
    );

    await t.test(
      'rejects malformed global error attribution and a non-incomplete verdict',
      async () => {
        const schemaRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'global-error-invalid-schema',
          '20260801231239',
          makeHumanNotRunFixture,
          (fixture) => {
            configureGlobalExecutionErrorFixture(fixture);
            const executionError = JSON.parse(fixture.files['.browser-check-execution-error.json']);
            executionError.phase = 'spawn';
            executionError.classification = 'product-defect';
            executionError.affectedCheckIds = [];
            executionError.extra = true;
            fixture.files['.browser-check-execution-error.json'] = `${JSON.stringify(
              executionError,
              null,
              2,
            )}\n`;
          },
        );
        const verdictRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'global-error-conditional-verdict',
          '20260801231240',
          makeHumanNotRunFixture,
          (fixture) => {
            configureGlobalExecutionErrorFixture(fixture);
            fixture.plan.checks[0].priority = 'P3';
            fixture.verdict = 'conditional-pass';
          },
        );
        const schemaValidation = runValidator(schemaRunDirectory);

        assertInvalid(
          schemaValidation,
          /\.browser-check-execution-error\.json\.extra: is not an allowed key/,
        );
        assert.match(schemaValidation.stderr, /phase: must equal pre-report/);
        assert.match(
          schemaValidation.stderr,
          /classification: must be one of: environment-defect, check-script-defect/,
        );
        assert.match(
          schemaValidation.stderr,
          /affectedCheckIds: must equal every planned playwright-temporary check ID/,
        );
        assertInvalid(
          runValidator(verdictRunDirectory),
          /verdict must be incomplete when a global pre-report browser execution error exists/,
        );
      },
    );

    await t.test(
      'rejects missing, stale, and incomplete execution artifact manifests',
      async () => {
        const missingRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-missing',
          '20260801231241',
          makeHumanNotRunFixture,
          configurePassingPlaywrightFixture,
        );
        await rm(resolve(missingRunDirectory, '.browser-check-artifacts.json'));

        const staleRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-stale-file',
          '20260801231242',
          makeHumanNotRunFixture,
          configurePassingPlaywrightFixture,
        );
        await writeFile(
          resolve(
            staleRunDirectory,
            `evidence/screenshots/${checkIdFor(basename(dirname(staleRunDirectory)))}-planned.png`,
          ),
          'tampered screenshot\n',
        );

        const incompleteRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-unlisted-output',
          '20260801231243',
          makeHumanNotRunFixture,
          configurePassingPlaywrightFixture,
        );
        await mkdir(resolve(incompleteRunDirectory, 'artifacts/planned'), { recursive: true });
        await writeFile(
          resolve(incompleteRunDirectory, 'artifacts/planned/unlisted.txt'),
          'unlisted output\n',
        );

        assertInvalid(
          runValidator(missingRunDirectory),
          /\.browser-check-artifacts\.json: is required for Playwright reports and temporary-browser evidence/,
        );
        const staleValidation = runValidator(staleRunDirectory);
        assertInvalid(
          staleValidation,
          /must match the current file bytes|must equal \d+, the current file size/,
        );
        assertInvalid(
          runValidator(incompleteRunDirectory),
          /must list every browser execution output file: artifacts\/planned\/unlisted\.txt/,
        );
      },
    );

    await t.test(
      'rejects manifest schema drift, hash drift, and evidence outside the manifest',
      async () => {
        const schemaRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-schema-drift',
          '20260801231244',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.browserManifest = {
              mutate: (manifest) => {
                manifest.extra = true;
                manifest.files.reverse();
              },
            };
          },
        );
        const hashRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-claim-hash-drift',
          '20260801231245',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.browserClaim.mutate = (claim) => {
              claim.postflight.executionArtifactManifestHash = `sha256:${'0'.repeat(64)}`;
            };
          },
        );
        const citationRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'manifest-evidence-citation',
          '20260801231246',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            const assertionPath = 'evidence/notes/assertion.txt';
            fixture.result.results[0].evidence.push(assertionPath);
            fixture.files[assertionPath] = 'Assertion note created outside wrapper output roots.\n';
          },
        );

        const schemaValidation = runValidator(schemaRunDirectory);
        assertInvalid(
          schemaValidation,
          /\.browser-check-artifacts\.json\.extra: is not an allowed key/,
        );
        assert.match(schemaValidation.stderr, /manifest paths must be strictly sorted/);
        assertInvalid(
          runValidator(hashRunDirectory),
          /executionArtifactManifestHash: must match the exact raw \.browser-check-artifacts\.json bytes/,
        );
        assertInvalid(
          runValidator(citationRunDirectory),
          /must include temporary-browser evidence evidence\/notes\/assertion\.txt/,
        );
      },
    );

    await t.test('rejects symlinked browser execution output', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'manifest-symlink-output',
        '20260801231247',
        makeHumanNotRunFixture,
        configurePassingPlaywrightFixture,
      );
      const owningCheckId = checkIdFor(basename(dirname(runDirectory)));
      await symlink(
        `${owningCheckId}-planned.png`,
        resolve(runDirectory, `evidence/screenshots/${owningCheckId}-planned-link.png`),
      );

      assertInvalid(
        runValidator(runDirectory),
        /execution output must not be a symlink: evidence\/screenshots\/.*-planned-link\.png/,
      );
    });

    await t.test('rejects symlinked generic evidence', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'generic-evidence-symlink',
        '20260801231248',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.result.results[0].evidence = ['evidence/screenshot.png'];
        },
      );
      await mkdir(resolve(runDirectory, 'evidence'), { recursive: true });
      await symlink('../plan.json', resolve(runDirectory, 'evidence/screenshot.png'));

      assertInvalid(
        runValidator(runDirectory),
        /evidence\[0\]: must refer to a regular file with no symlink or hard-link aliases/,
      );
    });

    await t.test('rejects hard-linked evidence copied from another run', async () => {
      const sourceRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'hardlink-source',
        '20260801231252',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.files['evidence/prior.png'] = validPng;
        },
      );
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'hardlink-current',
        '20260801231253',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.result.results[0].evidence = ['evidence/current.png'];
        },
      );
      await mkdir(resolve(runDirectory, 'evidence'), { recursive: true });
      await link(
        resolve(sourceRunDirectory, 'evidence/prior.png'),
        resolve(runDirectory, 'evidence/current.png'),
      );

      assertInvalid(
        runValidator(runDirectory),
        /evidence\[0\]: must refer to a regular file with no symlink or hard-link aliases/,
      );
    });

    await t.test('rejects raw trace evidence outside temporary Playwright runs', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'generic-raw-trace',
        '20260801231251',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.result.results[0].evidence = ['artifacts/manual/trace.zip'];
          fixture.files['artifacts/manual/trace.zip'] = 'PK raw trace placeholder\n';
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /ZIP evidence is prohibited because trace archives can contain session data/,
      );
    });

    await t.test('rejects cited ZIP bytes hidden behind a non-ZIP extension', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'renamed-zip-evidence',
        '20260801231314',
        makeHumanNotRunFixture,
        (fixture) => {
          const evidencePath = 'evidence/renamed-archive.bin';
          fixture.result.results[0].evidence = [evidencePath];
          fixture.files[evidencePath] = Buffer.from([
            0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
          ]);
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /must not contain ZIP archive bytes under a renamed extension/,
      );
    });

    await t.test('bounds structural evidence while streaming large binary evidence', async () => {
      const oversizedTextPath = 'evidence/oversized-structure.txt';
      const oversizedTextRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'oversized-structured-evidence',
        '20260801231318',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.result.results[0].evidence = [oversizedTextPath];
          fixture.files[oversizedTextPath] = '';
        },
      );
      await truncate(resolve(oversizedTextRunDirectory, oversizedTextPath), 16 * 1024 * 1024 + 1);
      assertInvalid(runValidator(oversizedTextRunDirectory), /16777216-byte structural file limit/);

      const videoPath = 'videos/BC-LARGE-BINARY-evidence.webm';
      const databasePath = 'artifacts/browser-check.sqlite';
      const binaryRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'large-binary-streaming',
        '20260801231319',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.result.results[0].evidence.push(videoPath, databasePath);
          fixture.files[videoPath] = '';
          fixture.files[databasePath] = '';
        },
      );
      await Promise.all(
        [videoPath, databasePath].map((relativePath) =>
          truncate(resolve(binaryRunDirectory, relativePath), 16 * 1024 * 1024 + 1),
        ),
      );
      await writeExecutionArtifactManifest(binaryRunDirectory);
      await writeRunClaim(binaryRunDirectory, 'validator-contract-fixture-token', undefined, {
        postflightExitCode: 0,
      });

      assertValid(runValidator(binaryRunDirectory));
    });

    await t.test(
      'rejects unreferenced renamed ZIP bytes in the run root and auth directory',
      async () => {
        const rootRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'unreferenced-root-renamed-zip',
          '20260801231316',
          makeNotRequiredFixture,
          (fixture) => {
            fixture.files['renamed-root-archive.bin'] = Buffer.from([
              0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
            ]);
          },
        );
        const authRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'unreferenced-auth-renamed-zip',
          '20260801231317',
          makeNotRequiredFixture,
          (fixture) => {
            fixture.files['auth/renamed-auth-archive.bin'] = Buffer.from([
              0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
            ]);
          },
        );

        assertInvalid(
          runValidator(rootRunDirectory),
          /renamed-root-archive\.bin: ZIP evidence is prohibited because trace archives can contain session data/,
        );
        assertInvalid(
          runValidator(authRunDirectory),
          /auth\/renamed-auth-archive\.bin: ZIP evidence is prohibited because trace archives can contain session data/,
        );
      },
    );

    await t.test('rejects Playwright stats that contradict leaf outcomes', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-stats-mismatch',
        '20260801231017',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          report.stats.expected = 0;
          report.stats.flaky = 1;
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /playwright-results\.json\.stats\.expected: must equal 1/);
      assert.match(validation.stderr, /playwright-results\.json\.stats\.flaky: must equal 0/);
    });

    await t.test('rejects a Playwright outcome that contradicts its attempts', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-outcome-mismatch',
        '20260801231021',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          const spec = report.suites[0].specs[0];
          spec.ok = false;
          spec.tests[0].status = 'unexpected';
          report.stats.expected = 0;
          report.stats.unexpected = 1;
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-results\.json\.suites\[0\]\.specs\[0\]\.tests\[0\]\.status: unexpected outcome contradicts the recorded attempts/,
      );
    });

    await t.test('accepts Playwright 1.60 outcome aggregation semantics', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-outcome-matrix',
        '20260801231102',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const checkId = fixture.plan.checks[0].id;
          const checkResult = fixture.result.results[0];
          checkResult.status = 'blocked';
          checkResult.actualResult = 'The outcome matrix contains an intentional unexpected case.';
          checkResult.blocker = {
            reason: 'The matrix intentionally represents every Playwright outcome category.',
            nextAction: 'Use the matrix only as validator contract evidence.',
          };
          fixture.result.summary.pass = 0;
          fixture.result.summary.blocked = 1;
          fixture.verdict = 'incomplete';
          fixture.browserClaim.postflightExitCode = 1;
          fixture.files['playwright-results.json'] = `${JSON.stringify(
            {
              suites: [
                {
                  title: 'Playwright outcome contract',
                  specs: [
                    {
                      title: `${checkId} exact outcome matrix`,
                      ok: false,
                      tests: [
                        {
                          expectedStatus: 'failed',
                          status: 'unexpected',
                          results: [
                            {
                              status: 'timedOut',
                              errors: [{ message: 'Timeout is not an expected failure.' }],
                            },
                          ],
                        },
                        {
                          expectedStatus: 'passed',
                          status: 'expected',
                          results: [
                            { status: 'interrupted', errors: [] },
                            { status: 'passed', errors: [] },
                          ],
                        },
                        {
                          expectedStatus: 'passed',
                          status: 'skipped',
                          results: [{ status: 'interrupted', errors: [] }],
                        },
                        {
                          expectedStatus: 'failed',
                          status: 'expected',
                          results: [
                            {
                              status: 'failed',
                              errors: [{ message: 'This failure is expected.' }],
                            },
                          ],
                        },
                        {
                          expectedStatus: 'passed',
                          status: 'flaky',
                          results: [
                            {
                              status: 'failed',
                              errors: [{ message: 'The first attempt failed.' }],
                            },
                            { status: 'passed', errors: [] },
                          ],
                        },
                        {
                          expectedStatus: 'passed',
                          status: 'skipped',
                          results: [{ status: 'skipped', errors: [] }],
                        },
                      ],
                    },
                  ],
                },
              ],
              errors: [],
              stats: { expected: 2, unexpected: 1, flaky: 1, skipped: 2 },
            },
            null,
            2,
          )}\n`;
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('rejects timedOut as an expected failed outcome', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-timeout-not-failed',
        '20260801231103',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          const playwrightTest = report.suites[0].specs[0].tests[0];
          playwrightTest.expectedStatus = 'failed';
          playwrightTest.status = 'expected';
          playwrightTest.results = [
            {
              status: 'timedOut',
              errors: [{ message: 'Timeout must remain unexpected for expectedStatus failed.' }],
            },
          ];
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /expected outcome contradicts the recorded attempts; Playwright derives unexpected/,
      );
    });

    await t.test('rejects errors attached to a passed Playwright attempt', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-passed-attempt-error',
        '20260801231018',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          const attempt = report.suites[0].specs[0].tests[0].results[0];
          attempt.error = { message: 'Contradictory passed-attempt error.' };
          attempt.errors = [{ message: 'Contradictory passed-attempt error.' }];
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-results\.json\.suites\[0\]\.specs\[0\].*passed attempts must not report errors/,
      );
    });

    await t.test('accepts a root error attributed to its blocked Playwright result', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'valid-attributed-root-error',
        '20260801231019',
        makeHumanNotRunFixture,
        (fixture) => {
          const checkId = fixture.plan.checks[0].id;
          configureBlockedPlaywrightRootErrorFixture(
            fixture,
            `${checkId}: the browser process could not start.`,
          );
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('rejects exit zero when a blocked report contains a root error', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'root-error-zero-exit',
        '20260801231217',
        makeHumanNotRunFixture,
        (fixture) => {
          const checkId = fixture.plan.checks[0].id;
          configureBlockedPlaywrightRootErrorFixture(
            fixture,
            `${checkId}: the browser process could not start.`,
          );
          fixture.browserClaim.postflightExitCode = 0;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwrightExitCode: must be nonzero when the Playwright report contains a root error or unexpected outcome/,
      );
    });

    await t.test('rejects an unattributed root error despite another blocked result', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'unattributed-root-error',
        '20260801231020',
        makeHumanNotRunFixture,
        (fixture) => {
          configureBlockedPlaywrightRootErrorFixture(
            fixture,
            'The browser process could not start before any check was selected.',
          );
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-results\.json\.errors\[0\]: must contain exactly one bounded planned playwright-temporary check ID token/,
      );
    });

    await t.test('does not attribute a root error from arbitrary metadata', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'root-error-metadata-id',
        '20260801231229',
        makeHumanNotRunFixture,
        (fixture) => {
          const checkId = fixture.plan.checks[0].id;
          configureBlockedPlaywrightRootErrorFixture(
            fixture,
            'The browser process could not start before check selection.',
          );
          const report = JSON.parse(fixture.files['playwright-results.json']);
          report.errors[0].metadata = checkId;
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-results\.json\.errors\[0\]: must contain exactly one bounded planned playwright-temporary check ID token/,
      );
    });

    await t.test('rejects an unplanned Playwright leaf spec', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'unplanned-playwright-leaf',
        '20260801231009',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          report.suites[0].specs.push({
            title: 'BC-UNPLANNED-001 unexpected browser check',
            ok: true,
            tests: [
              {
                expectedStatus: 'passed',
                status: 'expected',
                results: [{ status: 'passed', errors: [] }],
              },
            ],
          });
          report.stats.expected = 2;
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /playwright-results\.json\.suites\[0\]\.specs\[1\]: must contain exactly one bounded planned playwright-temporary check ID token/,
      );
    });

    await t.test('rejects a planned check ID used only as a leaf-title prefix', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-leaf-id-prefix',
        '20260801231104',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const report = JSON.parse(fixture.files['playwright-results.json']);
          report.suites[0].specs[0].title = `${fixture.plan.checks[0].id}-EXTRA prefix collision`;
          fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /must contain exactly one bounded planned playwright-temporary check ID token/,
      );
    });

    await t.test(
      'rejects leaf and root attribution containing planned plus unplanned IDs',
      async () => {
        const leafRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-leaf-multiple-ids',
          '20260801231105',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            const report = JSON.parse(fixture.files['playwright-results.json']);
            report.suites[0].specs[0].title = `${fixture.plan.checks[0].id} BC-UNPLANNED-001 ambiguous leaf`;
            fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
          },
        );
        const rootRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-root-multiple-ids',
          '20260801231106',
          makeHumanNotRunFixture,
          (fixture) => {
            const checkId = fixture.plan.checks[0].id;
            configureBlockedPlaywrightRootErrorFixture(
              fixture,
              `${checkId} BC-UNPLANNED-001 ambiguous root error`,
            );
          },
        );

        assertInvalid(
          runValidator(leafRunDirectory),
          /must contain exactly one bounded planned playwright-temporary check ID token/,
        );
        assertInvalid(
          runValidator(rootRunDirectory),
          /must contain exactly one bounded planned playwright-temporary check ID token/,
        );
      },
    );

    await t.test(
      'validates an existing report even when blocked evidence omits its citation',
      async () => {
        const runDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-report-without-citation',
          '20260801231107',
          makeHumanNotRunFixture,
          (fixture) => {
            const checkId = fixture.plan.checks[0].id;
            configureBlockedPlaywrightRootErrorFixture(
              fixture,
              `${checkId}: the browser process could not start.`,
            );
            fixture.result.results[0].evidence = [];
            const report = JSON.parse(fixture.files['playwright-results.json']);
            report.stats.expected = 1;
            fixture.files['playwright-results.json'] = `${JSON.stringify(report, null, 2)}\n`;
          },
        );
        const validation = runValidator(runDirectory);

        assertInvalid(
          validation,
          /playwright-results\.json\.stats\.expected: must equal 0, the expected test count derived from leaf specs/,
        );
        assert.match(
          validation.stderr,
          /playwright-results\.json: must be cited by the corresponding playwright-temporary result evidence/,
        );
      },
    );

    await t.test(
      'rejects not_run temporary results that coexist with execution artifacts',
      async () => {
        const reportRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-not-run-with-report',
          '20260801231108',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            const checkResult = fixture.result.results[0];
            checkResult.status = 'not_run';
            checkResult.actualResult = 'The check claims not_run despite an existing report.';
            checkResult.evidence = [];
            checkResult.blocker = {
              reason: 'This fixture intentionally contradicts its execution artifacts.',
              nextAction: 'Create a fresh run with an honest execution status.',
            };
            fixture.result.summary.pass = 0;
            fixture.result.summary.notRun = 1;
            fixture.verdict = 'incomplete';
          },
        );
        const claimRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-not-run-with-claim',
          '20260801231109',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            const checkResult = fixture.result.results[0];
            checkResult.status = 'not_run';
            checkResult.actualResult = 'The check claims not_run despite an execution claim.';
            checkResult.evidence = [];
            checkResult.blocker = {
              reason: 'This fixture intentionally contradicts its execution claim.',
              nextAction: 'Create a fresh run with an honest execution status.',
            };
            fixture.result.summary.pass = 0;
            fixture.result.summary.notRun = 1;
            fixture.verdict = 'incomplete';
            delete fixture.files['playwright-results.json'];
          },
        );

        assertInvalid(
          runValidator(reportRunDirectory),
          /not_run must not coexist with a Playwright report or execution claim/,
        );
        const claimValidation = runValidator(claimRunDirectory);
        assertInvalid(claimValidation, /playwright-results\.json: cannot be read/);
        assert.match(
          claimValidation.stderr,
          /not_run must not coexist with a Playwright report or execution claim/,
        );
      },
    );

    await t.test('detects dangling report and claim symlinks as execution artifacts', async () => {
      const reportRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-dangling-report-symlink',
        '20260801231218',
        makeHumanNotRunFixture,
        configureNotRunPlaywrightFixture,
      );
      const claimRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-dangling-claim-symlink',
        '20260801231219',
        makeHumanNotRunFixture,
        configureNotRunPlaywrightFixture,
      );
      await symlink(
        'missing-playwright-results.json',
        resolve(reportRunDirectory, 'playwright-results.json'),
      );
      await symlink(
        'missing-browser-claim.json',
        resolve(claimRunDirectory, '.browser-check-run.json'),
      );

      const reportValidation = runValidator(reportRunDirectory);
      assertInvalid(
        reportValidation,
        /playwright-results\.json: must be a regular file, not a symlink/,
      );
      assert.match(
        reportValidation.stderr,
        /not_run must not coexist with a Playwright report or execution claim/,
      );

      const claimValidation = runValidator(claimRunDirectory);
      assertInvalid(
        claimValidation,
        /\.browser-check-run\.json: must be a regular file, not a symlink/,
      );
      assert.match(
        claimValidation.stderr,
        /not_run must not coexist with a Playwright report or execution claim/,
      );
    });

    await t.test('rejects an executed temporary result without a report or claim', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-executed-without-artifacts',
        '20260801231110',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          const checkResult = fixture.result.results[0];
          checkResult.status = 'blocked';
          checkResult.actualResult = 'The claimed execution has no report or run claim.';
          checkResult.evidence = [];
          checkResult.blocker = {
            reason: 'This fixture intentionally omits execution artifacts.',
            nextAction: 'Execute through the isolated wrapper in a fresh run.',
          };
          fixture.result.summary.pass = 0;
          fixture.result.summary.blocked = 1;
          fixture.verdict = 'incomplete';
          delete fixture.files['playwright-results.json'];
          delete fixture.browserClaim;
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /playwright-results\.json: cannot be read/);
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json: is required for playwright-temporary execution artifacts and executed results/,
      );
    });

    await t.test('accepts a Docker claim path with the same normalized run suffix', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-docker-claim-path',
        '20260801231111',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.runDir = `/app/test-results/change-verification/${fixture.plan.change.id}/${fixture.result.runId}`;
          };
        },
      );

      assertValid(runValidator(runDirectory));
    });

    await t.test('rejects reusable auth state even when the claim binds its hash', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-auth-state-hash',
        '20260801231224',
        makeHumanNotRunFixture,
        (fixture) => {
          fixture.plan.environment.useAuthState = true;
          configurePassingPlaywrightFixture(fixture);
          fixture.plan.environment.baseUrl = 'http://nginx-browser-check:80';
          fixture.result.results[0].environment.baseUrl = 'http://localhost';
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /reusable auth state is unsupported; authenticate explicitly inside the check/,
      );
    });

    await t.test('rejects an auth-state hash when reusable auth state is disabled', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-auth-hash-unexpected',
        '20260801231228',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.runtime.authStateHash = `sha256:${'c'.repeat(64)}`;
            claim.postflight.runtime.authStateHash = `sha256:${'c'.repeat(64)}`;
          };
        },
      );

      assertInvalid(
        runValidator(runDirectory),
        /authStateHash: must be omitted when useAuthState is false/,
      );
    });

    await t.test('binds the exact testing database runtime tuple across postflight', async () => {
      const invalidPlanRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-plan-environment',
        '20260801231248',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.plan.environment.appEnvironment = 'staging';
        },
      );
      const invalidConnectionRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-database-connection',
        '20260801231249',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.runtime.databaseConnection = 'pgsql';
            claim.postflight.runtime.databaseConnection = 'pgsql';
          };
        },
      );
      const invalidHashRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-database-hash',
        '20260801231250',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.runtime.databaseIdentifierHash = 'sha256:bad';
            claim.postflight.runtime.databaseIdentifierHash = 'sha256:bad';
          };
        },
      );
      const driftRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-database-hash-drift',
        '20260801231251',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.postflight.runtime.databaseIdentifierHash = `sha256:${'e'.repeat(64)}`;
          };
        },
      );

      assertInvalid(
        runValidator(invalidPlanRunDirectory),
        /plan\.json\.environment\.appEnvironment: playwright-temporary checks require the testing application environment/,
      );
      assertInvalid(
        runValidator(invalidConnectionRunDirectory),
        /databaseConnection: must be one of: sqlite, mysql/,
      );
      assertInvalid(
        runValidator(invalidHashRunDirectory),
        /databaseIdentifierHash: must be a lowercase sha256 fingerprint/,
      );
      assertInvalid(
        runValidator(driftRunDirectory),
        /postflight\.runtime\.databaseIdentifierHash: must equal the preflight runtime databaseIdentifierHash/,
      );
    });

    await t.test(
      'rejects mode-plausible but wrongly bound database claims and host auth state',
      async () => {
        const hostMysqlRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'runtime-host-mysql-binding',
          '20260801231257',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.browserClaim.mutate = (claim) => {
              const mysqlHash = `sha256:${createHash('sha256')
                .update('mysql:mysql-browser-check/browser_check')
                .digest('hex')}`;
              for (const runtime of [claim.runtime, claim.postflight.runtime]) {
                runtime.databaseConnection = 'mysql';
                runtime.databaseIdentifierHash = mysqlHash;
              }
            };
          },
        );
        const dockerSqliteRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'runtime-docker-sqlite-binding',
          '20260801231258',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.plan.environment.baseUrl = 'http://nginx-browser-check:80';
            fixture.result.results[0].environment.baseUrl = 'http://localhost';
            fixture.browserClaim.mutate = (claim) => {
              const plausibleHash = `sha256:${'f'.repeat(64)}`;
              for (const runtime of [claim.runtime, claim.postflight.runtime]) {
                runtime.databaseConnection = 'sqlite';
                runtime.databaseIdentifierHash = plausibleHash;
              }
            };
          },
        );
        const hostAuthRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'runtime-host-auth-state',
          '20260801231259',
          makeHumanNotRunFixture,
          (fixture) => {
            fixture.plan.environment.useAuthState = true;
            configurePassingPlaywrightFixture(fixture);
          },
        );

        assertInvalid(
          runValidator(hostMysqlRunDirectory),
          /databaseConnection: must equal sqlite for the planned browser execution mode/,
        );
        assertInvalid(
          runValidator(dockerSqliteRunDirectory),
          /databaseConnection: must equal mysql for the planned browser execution mode/,
        );
        assertInvalid(
          runValidator(hostAuthRunDirectory),
          /host temporary-browser execution must not use authentication state/,
        );
      },
    );

    await t.test('requires HTTP and an explicit unprivileged host port', async () => {
      const httpsRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-host-https',
        '20260801231300',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.plan.environment.baseUrl = 'https://localhost:8443';
          fixture.result.results[0].environment.baseUrl = 'https://localhost:8443';
        },
      );
      const privilegedPortRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'runtime-host-privileged-port',
        '20260801231301',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.plan.environment.baseUrl = 'http://localhost:80';
          fixture.result.results[0].environment.baseUrl = 'http://localhost';
        },
      );

      assertInvalid(runValidator(httpsRunDirectory), /temporary browser execution must use http/);
      assertInvalid(
        runValidator(privilegedPortRunDirectory),
        /host temporary checks require an explicit port from 1024 through 65535/,
      );
    });

    await t.test(
      'allows only the isolated Docker browser host and normalizes it to localhost',
      async () => {
        const validRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'runtime-isolated-docker-host',
          '20260801231252',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.plan.environment.baseUrl = 'http://nginx-browser-check:80';
            fixture.result.results[0].environment.baseUrl = 'http://localhost';
          },
        );
        const invalidRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'runtime-shared-docker-host',
          '20260801231253',
          makeHumanNotRunFixture,
          (fixture) => {
            configurePassingPlaywrightFixture(fixture);
            fixture.plan.environment.baseUrl = 'http://nginx:8000';
            fixture.result.results[0].environment.baseUrl = 'http://nginx:8000';
          },
        );

        assertValid(runValidator(validRunDirectory));
        assertInvalid(
          runValidator(invalidRunDirectory),
          /must target localhost, a loopback address, or Docker nginx-browser-check/,
        );
      },
    );

    await t.test('rejects plan bytes changed after a completed browser claim', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-plan-after-claim',
        '20260801231112',
        makeHumanNotRunFixture,
        configurePassingPlaywrightFixture,
      );
      const planPath = resolve(runDirectory, 'plan.json');
      await writeFile(planPath, `${await readFile(planPath, 'utf8')} \n`);
      const validation = runValidator(runDirectory);

      assertInvalid(
        validation,
        /\.browser-check-run\.json\.planHash: must match the current raw plan\.json bytes/,
      );
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.postflight\.planHash: must match the current raw plan\.json bytes/,
      );
    });

    await t.test('rejects generated source changed after a completed browser claim', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-source-after-claim',
        '20260801231113',
        makeHumanNotRunFixture,
        configurePassingPlaywrightFixture,
      );
      const generatedPath = resolve(runDirectory, 'generated/contract.check.spec.ts');
      await writeFile(generatedPath, `${await readFile(generatedPath, 'utf8')}// tampered\n`);
      const validation = runValidator(runDirectory);

      assertInvalid(
        validation,
        /\.browser-check-run\.json\.generatedSourceHash: must match the current generated temporary check sources/,
      );
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.postflight\.generatedSourceHash: must match the current generated temporary check sources/,
      );
    });

    await t.test('rejects malformed and mismatched final browser claim bindings', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-invalid-final-claim',
        '20260801231114',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            claim.tokenHash = 'INVALID';
            claim.runDir = '/app/test-results/change-verification/WRONG/20000101000000';
            claim.planHash = `sha256:${'0'.repeat(64)}`;
            claim.generatedSourceHash = `sha256:${'1'.repeat(64)}`;
            claim.planRevision.headSha = '0'.repeat(40);
            claim.preflightRevision.worktreeFingerprint = `sha256:${'2'.repeat(64)}`;
            claim.runtime.baseUrl = 'http://localhost:9999/';
            claim.runtime.useAuthState = true;
            claim.claimedAt = 'not-an-iso-timestamp';
            claim.postflight.planHash = `sha256:${'3'.repeat(64)}`;
            claim.postflight.generatedSourceHash = `sha256:${'4'.repeat(64)}`;
            claim.postflight.revision.baseSha = '5'.repeat(40);
            claim.postflight.runtime.baseUrl = 'http://localhost:8888/';
            claim.postflight.runtime.useAuthState = true;
            claim.postflight.playwrightExitCode = -1;
          };
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /\.browser-check-run\.json\.tokenHash/);
      assert.match(validation.stderr, /\.browser-check-run\.json\.runDir: must end with/);
      assert.match(validation.stderr, /\.browser-check-run\.json\.planRevision: must equal/);
      assert.match(validation.stderr, /\.browser-check-run\.json\.preflightRevision: must equal/);
      assert.match(validation.stderr, /\.browser-check-run\.json\.runtime\.baseUrl: must match/);
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.runtime\.useAuthState: must match/,
      );
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.postflight\.revision: must equal/,
      );
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.postflight\.runtime\.baseUrl: must match/,
      );
      assert.match(
        validation.stderr,
        /\.browser-check-run\.json\.postflight\.runtime\.useAuthState: must match/,
      );
      assert.match(validation.stderr, /\.browser-check-run\.json\.postflight\.playwrightExitCode/);
    });

    await t.test('requires a successful postflight for a passing temporary result', async () => {
      const missingRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-missing-postflight',
        '20260801231115',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            delete claim.postflight;
          };
        },
      );
      const nonzeroRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-nonzero-pass-postflight',
        '20260801231116',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.postflightExitCode = 1;
        },
      );
      const missingRuntimeRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-missing-postflight-runtime',
        '20260801231125',
        makeHumanNotRunFixture,
        (fixture) => {
          configurePassingPlaywrightFixture(fixture);
          fixture.browserClaim.mutate = (claim) => {
            delete claim.postflight.runtime;
          };
        },
      );

      assertInvalid(
        runValidator(missingRunDirectory),
        /\.browser-check-run\.json\.postflight: is required when Playwright report or evidence exists/,
      );
      assertInvalid(
        runValidator(nonzeroRunDirectory),
        /playwrightExitCode: must equal 0 when every executed temporary check passed/,
      );
      assertInvalid(
        runValidator(missingRuntimeRunDirectory),
        /\.browser-check-run\.json\.postflight\.runtime: must be an object/,
      );
    });

    await t.test('binds a failed temporary result to a nonzero postflight exit', async () => {
      const validRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-fail-nonzero-postflight',
        '20260801231127',
        makeHumanNotRunFixture,
        configureFailingPlaywrightFixture,
      );
      const invalidRunDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'playwright-fail-zero-postflight',
        '20260801231128',
        makeHumanNotRunFixture,
        (fixture) => {
          configureFailingPlaywrightFixture(fixture);
          fixture.browserClaim.postflightExitCode = 0;
        },
      );

      assertValid(runValidator(validRunDirectory));
      assertInvalid(
        runValidator(invalidRunDirectory),
        /playwrightExitCode: must be nonzero when a temporary check failed/,
      );
    });

    await t.test('diagnoses malformed arrays without an uncaught type error', async () => {
      const runDirectory = await writeFixture(
        testOwnedChangeDirectories,
        'malformed-arrays',
        '20260801231007',
        makeNotRequiredFixture,
        (fixture) => {
          fixture.plan.scope.affectedFiles = { invalid: true };
          fixture.plan.scope.routes = 'not-an-array';
          fixture.plan.existingTestCommands = null;
          fixture.plan.delegatedWorkItems = {};
          fixture.plan.unnecessaryChecks = 'not-an-array';
          fixture.plan.assumptions = null;
          fixture.plan.specificationGaps = {};
          fixture.plan.checks[0].target.files = 'not-an-array';
          fixture.plan.checks[0].preconditions = {};
          fixture.plan.checks[0].steps = null;
          fixture.plan.checks[0].expectedResults = 'not-an-array';
          fixture.plan.checks[0].evidence = {};
          fixture.result.issueRecords = {};
          fixture.result.results[0].evidence = {};
          fixture.result.results[0].issues = null;
          fixture.result.results[0].executionNotes = 'not-an-array';
        },
      );
      const validation = runValidator(runDirectory);

      assertInvalid(validation, /plan\.json\.scope\.affectedFiles: must be an array/);
      assert.match(validation.stderr, /result\.json\.results\[0\]\.evidence: must be an array/);
      assert.doesNotMatch(validation.stderr, /\b(?:TypeError|ReferenceError):/);
    });

    await t.test('wrapper rejects unsupported CLI overrides before browser launch', () => {
      const execution = runWrapper(['--workers=2']);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(execution.stderr, /accepts only the optional --headed flag/);
    });

    await t.test('wrapper rejects helper source in the generated tree', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-helper-source',
        '20260801231022',
        {
          'generated/helper.ts':
            "export { expect, test } from '../../../../../playwright.browser-check.fixture';\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(
        execution.stderr,
        /generated may contain only \*\.check\.spec\.ts source files; helpers are not executable/,
      );
    });

    await t.test(
      'wrapper rejects a canonical-fixture comment with an unrestricted import',
      async () => {
        const runDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-comment-import-bypass',
          '20260801231023',
          {
            'generated/preflight.check.spec.ts':
              "// ../../../../../playwright.browser-check.fixture\nimport { expect, test } from '@playwright/test';\n\ntest('comment bypass', async ({ page }) => {\n  await expect(page).toHaveURL('/manual-review');\n});\n",
          },
        );
        const execution = runWrapper([], runDirectory);

        assert.equal(execution.signal, null, diagnosticOutput(execution));
        assert.equal(execution.status, 2, diagnosticOutput(execution));
        assert.match(execution.stderr, /must import the canonical fixture from/);
      },
    );

    await t.test('wrapper rejects direct Node network access', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-fetch-bypass',
        '20260801231024',
        {
          'generated/preflight.check.spec.ts':
            "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 fetch bypass', async ({ page }) => {\n  await page.goto('/manual-review');\n  await fetch('https://example.test');\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(
        execution.stderr,
        /(?:uses forbidden runtime identifier|must not execute) fetch|reachable awaited direct assertion/,
      );
    });

    await t.test('wrapper rejects attempts to create another browser context', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-new-context-bypass',
        '20260801231025',
        {
          'generated/preflight.check.spec.ts':
            "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 context bypass', async ({ page }) => {\n  await page.goto('/manual-review');\n  await page.context().newContext();\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(
        execution.stderr,
        /uses forbidden runtime property newContext|reachable awaited direct assertion/,
      );
    });

    await t.test('wrapper restricts test callbacks to the guarded page fixture', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-fixture-bypass',
        '20260801231026',
        {
          'generated/preflight.check.spec.ts':
            "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('fixture bypass', async ({ browser }) => {\n  expect(browser).toBeDefined();\n});\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(execution.stderr, /test callbacks may request only the page fixture/);
    });

    await t.test('wrapper rejects AST capability alias and destructuring bypasses', async () => {
      const cases = [
        {
          name: 'test-extend-alias',
          runId: '20260801231117',
          statement: 'const { extend: derive } = test;',
          diagnostic:
            /forbidden binding property extend|may use test only|safe linear page\/locator operations/,
        },
        {
          name: 'expect-constructor-alias',
          runId: '20260801231118',
          statement: 'const { constructor: F } = expect;',
          diagnostic: /forbidden binding property constructor|may use expect only/,
        },
        {
          name: 'computed-destructuring',
          runId: '20260801231119',
          statement: "const { ['con' + 'structor']: F } = page;",
          diagnostic: /computed destructuring properties/,
        },
        {
          name: 'rest-destructuring',
          runId: '20260801231120',
          statement: 'const { ...rest } = page;',
          diagnostic: /rest destructuring/,
        },
        {
          name: 'assignment-constructor',
          runId: '20260801231121',
          statement: 'let F; ({ constructor: F } = page);',
          diagnostic:
            /forbidden runtime property constructor|declares forbidden runtime property constructor/,
        },
        {
          name: 'test-derived-reference',
          runId: '20260801231122',
          statement: 'const derived = test;',
          diagnostic: /may use test only as a direct/,
        },
        {
          name: 'page-constructor-binding',
          runId: '20260801231123',
          statement: 'const { constructor } = page;',
          diagnostic: /must not bind runtime capability constructor/,
        },
        {
          name: 'page-aliased-constructor-binding',
          runId: '20260801231124',
          statement: 'const { safe: constructor } = page;',
          diagnostic: /must not bind runtime capability constructor/,
        },
        {
          name: 'private-channel-route-bypass',
          runId: '20260801231201',
          statement:
            'await page.context()._channel.setNetworkInterceptionPatterns({ patterns: [] });',
          diagnostic: /must not access private runtime member/,
        },
        {
          name: 'private-browser-context-bypass',
          runId: '20260801231202',
          statement:
            "const engine = page.context()._browser; engine.removeAllListeners('context'); await engine._newContextForReuse();",
          diagnostic: /must not access private runtime member/,
        },
        {
          name: 'listener-removal-bypass',
          runId: '20260801231203',
          statement: "page.removeAllListeners('request');",
          diagnostic: /uses forbidden runtime property removeAllListeners/,
        },
        {
          name: 'screenshot-filesystem-bypass',
          runId: '20260801231204',
          statement: "await page.screenshot({ path: '/tmp/outside.png' });",
          diagnostic: /screenshot path must be a relative static string/,
        },
        {
          name: 'pdf-filesystem-bypass',
          runId: '20260801231205',
          statement: "await page.pdf({ path: '/tmp/outside.pdf' });",
          diagnostic: /uses forbidden runtime property pdf/,
        },
        {
          name: 'upload-filesystem-bypass',
          runId: '20260801231206',
          statement: "await page.setInputFiles('input', '/etc/passwd');",
          diagnostic: /uses forbidden runtime property setInputFiles/,
        },
        {
          name: 'storage-state-filesystem-bypass',
          runId: '20260801231207',
          statement: "await page.context().storageState({ path: '.env' });",
          diagnostic: /uses forbidden runtime property storageState/,
        },
        {
          name: 'download-save-filesystem-bypass',
          runId: '20260801231208',
          statement:
            "const artifact = await page.waitForEvent('download'); await artifact.saveAs('/tmp/outside');",
          diagnostic: /uses forbidden runtime property saveAs/,
        },
        {
          name: 'tracing-filesystem-bypass',
          runId: '20260801231209',
          statement: "await page.context().tracing.stop({ path: '/tmp/outside-trace.zip' });",
          diagnostic: /uses forbidden runtime property tracing/,
        },
        {
          name: 'set-content-evidence-bypass',
          runId: '20260801231210',
          statement: "await page.setContent('<h1>fabricated</h1>');",
          diagnostic: /uses forbidden runtime property setContent/,
        },
        {
          name: 'data-navigation-evidence-bypass',
          runId: '20260801231211',
          gotoTarget: 'data:text/html,<h1>fabricated</h1>',
          statement: '',
          diagnostic: /goto must target the planned HTTP\(S\) origin/,
        },
        {
          name: 'about-navigation-evidence-bypass',
          runId: '20260801231212',
          gotoTarget: 'about:blank',
          statement: '',
          diagnostic: /goto must target the planned HTTP\(S\) origin/,
        },
        {
          name: 'init-script-runtime-bypass',
          runId: '20260801231221',
          statement: "await page.addInitScript('window.injected = true');",
          diagnostic: /uses forbidden runtime property addInitScript/,
        },
      ];

      for (const regressionCase of cases) {
        const runDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          `wrapper-${regressionCase.name}`,
          regressionCase.runId,
          {
            'generated/preflight.check.spec.ts':
              "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\n" +
              `test('BC-WRAPPER-001 ${regressionCase.name}', async ({ page }) => {\n` +
              `  await page.goto('${regressionCase.gotoTarget ?? '/manual-review'}');\n` +
              (regressionCase.statement ? `  ${regressionCase.statement}\n` : '') +
              "  await expect(page.getByRole('heading')).toBeVisible();\n" +
              '});\n',
          },
        );
        const execution = runWrapper([], runDirectory);

        assert.equal(execution.signal, null, diagnosticOutput(execution));
        assert.equal(execution.status, 2, diagnosticOutput(execution));
        const requiresSpecificDiagnostic = [
          'about-navigation-evidence-bypass',
          'data-navigation-evidence-bypass',
          'screenshot-filesystem-bypass',
        ].includes(regressionCase.name);
        const acceptedDiagnostic = requiresSpecificDiagnostic
          ? regressionCase.diagnostic
          : new RegExp(
              `${regressionCase.diagnostic.source}|safe linear page\\/locator operations`,
              regressionCase.diagnostic.flags,
            );
        assert.match(execution.stderr, acceptedDiagnostic);
      }
    });

    await t.test(
      'wrapper requires every generated check to start at its planned target',
      async () => {
        const missingGotoRunDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-missing-planned-goto',
          '20260801231222',
          {
            'generated/preflight.check.spec.ts':
              "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 missing goto', async ({ page }) => {\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n",
          },
        );
        const mismatchedGotoRunDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-mismatched-planned-goto',
          '20260801231223',
          {
            'generated/preflight.check.spec.ts':
              "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 mismatched goto', async ({ page }) => {\n  await page.goto('/different-target');\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n",
          },
        );

        assertInvalidWrapper(
          runWrapper([], missingGotoRunDirectory),
          /each test callback must start with a direct static page\.goto/,
        );
        assertInvalidWrapper(
          runWrapper([], mismatchedGotoRunDirectory),
          /goto must exactly match BC-WRAPPER-001 target\.url/,
        );
      },
    );

    await t.test('wrapper rejects a plan revision stale for the execution worktree', async () => {
      const staleRevision = {
        ...structuredClone(fixtureRevision),
        worktreeFingerprint: `sha256:${'0'.repeat(64)}`,
      };
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-stale-revision',
        '20260801231027',
        {
          'plan.json': `${JSON.stringify(
            {
              schemaVersion: '1.0',
              change: { baseRef: fixtureBaseRef, source: 'continuous-integration' },
              revision: staleRevision,
              environment: {
                baseUrl: 'http://localhost:8000',
                appEnvironment: 'testing',
                browser: 'chromium',
                locale: 'ja-JP',
                timezone: 'Asia/Tokyo',
                useAuthState: false,
              },
              checks: [
                {
                  id: 'BC-WRAPPER-001',
                  driver: 'playwright-temporary',
                  target: { url: '/manual-review' },
                },
              ],
            },
            null,
            2,
          )}\n`,
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(
        execution.stderr,
        /plan\.json revision is stale; create a new run for the current Git worktree/,
      );
      await assert.rejects(access(resolve(runDirectory, '.browser-check-run.json')), {
        code: 'ENOENT',
      });
    });

    await t.test(
      'wrapper rejects missing or production appEnvironment before claiming',
      async () => {
        const baseEnvironment = {
          baseUrl: 'http://localhost:8000',
          browser: 'chromium',
          locale: 'ja-JP',
          timezone: 'Asia/Tokyo',
          useAuthState: false,
        };
        const missingRunDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-missing-app-environment',
          '20260801231213',
          {
            'plan.json': `${JSON.stringify(
              {
                schemaVersion: '1.0',
                change: { baseRef: fixtureBaseRef },
                revision: structuredClone(fixtureRevision),
                environment: baseEnvironment,
                checks: [
                  {
                    id: 'BC-WRAPPER-001',
                    driver: 'playwright-temporary',
                    target: { url: '/manual-review' },
                  },
                ],
              },
              null,
              2,
            )}\n`,
          },
        );
        const productionRunDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-production-app-environment',
          '20260801231214',
          {
            'plan.json': `${JSON.stringify(
              {
                schemaVersion: '1.0',
                change: { baseRef: fixtureBaseRef },
                revision: structuredClone(fixtureRevision),
                environment: { ...baseEnvironment, appEnvironment: 'production' },
                checks: [
                  {
                    id: 'BC-WRAPPER-001',
                    driver: 'playwright-temporary',
                    target: { url: '/manual-review' },
                  },
                ],
              },
              null,
              2,
            )}\n`,
          },
        );

        for (const runDirectory of [missingRunDirectory, productionRunDirectory]) {
          const execution = runWrapper([], runDirectory);
          assert.equal(execution.signal, null, diagnosticOutput(execution));
          assert.equal(execution.status, 2, diagnosticOutput(execution));
          assert.match(
            execution.stderr,
            /plan\.environment must use appEnvironment=testing, browser=chromium, locale=ja-JP, and timezone=Asia\/Tokyo/,
          );
          await assert.rejects(access(resolve(runDirectory, '.browser-check-run.json')), {
            code: 'ENOENT',
          });
        }
      },
    );

    await t.test('Playwright config rejects a claim bound to another revision', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'config-claim-revision-mismatch',
        '20260801231028',
        {},
      );
      const token = 'validator-contract-claim-token';
      await writeRunClaim(runDirectory, token, (claim) => {
        claim.preflightRevision.worktreeFingerprint = `sha256:${'0'.repeat(64)}`;
      });
      const execution = runPlaywrightConfig(runDirectory, token);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.notEqual(execution.status, 0, diagnosticOutput(execution));
      assert.match(diagnosticOutput(execution), /browser-check run claim does not match/);
    });

    await t.test('Playwright config binds Docker claims to trusted dependencies', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'config-docker-dependency-binding',
        '20260801231320',
        {},
      );
      const planPath = resolve(runDirectory, 'plan.json');
      const plan = JSON.parse(await readFile(planPath, 'utf8'));
      plan.environment.baseUrl = 'http://nginx-browser-check:80';
      await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
      const token = 'validator-contract-docker-token';
      await writeRunClaim(runDirectory, token);

      const missingFingerprintExecution = runPlaywrightConfig(runDirectory, token, {
        BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT: undefined,
      });
      assert.equal(
        missingFingerprintExecution.signal,
        null,
        diagnosticOutput(missingFingerprintExecution),
      );
      assert.notEqual(
        missingFingerprintExecution.status,
        0,
        diagnosticOutput(missingFingerprintExecution),
      );
      assert.match(
        diagnosticOutput(missingFingerprintExecution),
        /BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT must be a lowercase sha256 fingerprint in Docker mode/,
      );

      const execution = runPlaywrightConfig(runDirectory, token);
      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 0, diagnosticOutput(execution));
    });

    await t.test('wrapper rejects a run with existing execution output', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-reused-output',
        '20260801231010',
        { 'playwright-results.json': '{}\n' },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(execution.stderr, /already contains execution output; create a new run/);
    });

    await t.test('wrapper rejects a preclaimed run before browser launch', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-preclaimed',
        '20260801231011',
        { '.browser-check-run.json': '{}\n' },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(execution.stderr, /was already claimed; create a new run/);
    });
  } finally {
    for (const changeDirectory of testOwnedChangeDirectories) {
      assert.equal(dirname(changeDirectory), verificationRoot);
      assert.match(changeDirectory, /\/VALIDATOR-TEST-[A-Z0-9-]+-\d+$/);
      await rm(changeDirectory, { recursive: true, force: true });
      await assert.rejects(access(changeDirectory), { code: 'ENOENT' });
    }
    if (validatorGitDirectory) {
      const fakeGitDirectory = validatorGitDirectory;
      validatorGitDirectory = undefined;
      assert.equal(dirname(fakeGitDirectory), verificationRoot);
      assert.match(fakeGitDirectory, /\/VALIDATOR-GIT-[A-Za-z0-9]+$/);
      await rm(fakeGitDirectory, { recursive: true, force: true });
      await assert.rejects(access(fakeGitDirectory), { code: 'ENOENT' });
    }
  }
});
