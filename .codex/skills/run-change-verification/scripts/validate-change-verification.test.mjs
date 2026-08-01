import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '../../../..');
const validatorPath = resolve(scriptDirectory, 'validate-change-verification.mjs');
const wrapperPath = resolve(scriptDirectory, 'run-browser-check.mjs');
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const fixtureBaseRef = process.env.CHANGE_VERIFICATION_TEST_BASE_REF?.trim() || 'develop';
const fixtureRevision = revisionSnapshot(fixtureBaseRef, workspaceRoot);

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
      delegatedWork: [],
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
      delegatedWork: [],
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
  const tracePath = 'artifacts/planned/trace.zip';
  const screenshotPath = 'evidence/screenshots/planned.png';
  check.lifecycle = 'change-only';
  check.driver = 'playwright-temporary';
  check.evidence = ['Playwright JSON', 'trace', 'screenshot'];
  checkResult.driver = 'playwright-temporary';
  checkResult.status = 'pass';
  checkResult.actualResult = 'The planned temporary browser check passed.';
  checkResult.environment = {
    browser: 'chromium',
    viewport: '1280x720',
    baseUrl: 'http://localhost:8000',
  };
  checkResult.evidence = ['playwright-results.json', tracePath, screenshotPath];
  delete checkResult.blocker;
  fixture.result.summary.notRun = 0;
  fixture.result.summary.pass = 1;
  fixture.verdict = 'pass';
  fixture.files[tracePath] = 'deterministic trace placeholder\n';
  fixture.files[screenshotPath] = 'deterministic screenshot placeholder\n';
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

${listSection('## Delegated Work', plan.delegatedWork)}

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
  const checkIds = arrayValues(plan.checks)
    .map((check) => `- ${check.id}`)
    .join('\n');
  const summary = result.summary;

  return `# Change Verification Review

${checkIds || '- No planned checks'}

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

  const fixture = fixtureFactory(changeId, runId, structuredClone(fixtureRevision));
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

  for (const [relativePath, contents] of Object.entries(fixture.files)) {
    const targetPath = resolve(runDirectory, relativePath);
    assert.equal(relative(runDirectory, targetPath).startsWith('..'), false);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents);
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
        change: { baseRef: fixtureBaseRef },
        revision: structuredClone(fixtureRevision),
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
      "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 preflight only', async ({ page }) => {\n  await page.goto('/manual-review');\n  await expect(page).toHaveURL(/.*/);\n});\n",
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

function runValidator(runDirectory) {
  return spawnSync(process.execPath, [validatorPath, relative(workspaceRoot, runDirectory)], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

function runWrapper(args, runDirectory) {
  return spawnSync(process.execPath, [wrapperPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(runDirectory ? { BROWSER_CHECK_RUN_DIR: relative(workspaceRoot, runDirectory) } : {}),
    },
    timeout: 15_000,
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

async function writeRunClaim(runDirectory, token, mutate, options = {}) {
  const planSource = await readFile(resolve(runDirectory, 'plan.json'));
  const plan = JSON.parse(planSource.toString('utf8'));
  const planHash = `sha256:${createHash('sha256').update(planSource).digest('hex')}`;
  const generatedFingerprint = await generatedSourceHash(runDirectory);
  const plannedBaseUrl = new URL(plan.environment.baseUrl);
  if (plannedBaseUrl.hostname === 'nginx') {
    plannedBaseUrl.hostname = 'localhost';
  }
  const runtime = {
    baseUrl: plannedBaseUrl.toString(),
    useAuthState: plan.environment.useAuthState ?? false,
    browser: plan.environment.browser,
    locale: plan.environment.locale,
    timezone: plan.environment.timezone,
    ...(plan.environment.useAuthState ? { authStateHash: `sha256:${'a'.repeat(64)}` } : {}),
  };
  const claim = {
    schemaVersion: '1.0',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    runDir: runDirectory,
    planHash,
    generatedSourceHash: generatedFingerprint,
    planRevision: structuredClone(plan.revision),
    preflightRevision: structuredClone(plan.revision),
    runtime,
    claimedAt: '2026-08-01T15:00:00.000Z',
  };
  if (options.postflightExitCode !== undefined) {
    claim.postflight = {
      completedAt: '2026-08-01T15:00:01.000Z',
      planHash,
      generatedSourceHash: generatedFingerprint,
      revision: structuredClone(plan.revision),
      runtime: structuredClone(runtime),
      playwrightExitCode: options.postflightExitCode,
    };
  }
  mutate?.(claim);
  await writeFile(
    resolve(runDirectory, '.browser-check-run.json'),
    `${JSON.stringify(claim, null, 2)}\n`,
  );
}

function runPlaywrightConfig(runDirectory, token) {
  const playwrightCli = resolve(workspaceRoot, 'node_modules/@playwright/test/cli.js');

  return spawnSync(
    process.execPath,
    [playwrightCli, 'test', '--config=playwright.browser-check.config.ts', '--list'],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        BROWSER_CHECK_RUN_DIR: relative(workspaceRoot, runDirectory),
        BROWSER_CHECK_RUN_TOKEN: token,
      },
      timeout: 15_000,
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

  try {
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
        /verdict must be pass when no failed, blocked, or not-run checks remain/,
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
        configurePassingPlaywrightFixture,
      );

      assertValid(runValidator(runDirectory));
    });

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

    await t.test(
      'accepts a bound auth-state hash without reopening the mutable auth file',
      async () => {
        const runDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-auth-state-hash',
          '20260801231224',
          makeHumanNotRunFixture,
          (fixture) => {
            fixture.plan.environment.useAuthState = true;
            configurePassingPlaywrightFixture(fixture);
          },
        );

        assertValid(runValidator(runDirectory));
      },
    );

    await t.test(
      'rejects missing, malformed, mismatched, or unexpected auth-state hashes',
      async () => {
        const missingRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-auth-hash-missing',
          '20260801231225',
          makeHumanNotRunFixture,
          (fixture) => {
            fixture.plan.environment.useAuthState = true;
            configurePassingPlaywrightFixture(fixture);
            fixture.browserClaim.mutate = (claim) => {
              delete claim.runtime.authStateHash;
            };
          },
        );
        const malformedRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-auth-hash-malformed',
          '20260801231226',
          makeHumanNotRunFixture,
          (fixture) => {
            fixture.plan.environment.useAuthState = true;
            configurePassingPlaywrightFixture(fixture);
            fixture.browserClaim.mutate = (claim) => {
              claim.runtime.authStateHash = 'sha256:bad';
              claim.postflight.runtime.authStateHash = 'sha256:bad';
            };
          },
        );
        const mismatchedRunDirectory = await writeFixture(
          testOwnedChangeDirectories,
          'playwright-auth-hash-mismatch',
          '20260801231227',
          makeHumanNotRunFixture,
          (fixture) => {
            fixture.plan.environment.useAuthState = true;
            configurePassingPlaywrightFixture(fixture);
            fixture.browserClaim.mutate = (claim) => {
              claim.postflight.runtime.authStateHash = `sha256:${'b'.repeat(64)}`;
            };
          },
        );
        const unexpectedRunDirectory = await writeFixture(
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
          runValidator(missingRunDirectory),
          /\.browser-check-run\.json\.runtime\.authStateHash: must be a non-empty string/,
        );
        assertInvalid(
          runValidator(malformedRunDirectory),
          /authStateHash: must be a lowercase sha256 fingerprint/,
        );
        assertInvalid(
          runValidator(mismatchedRunDirectory),
          /postflight\.runtime\.authStateHash: must equal the preflight runtime authStateHash/,
        );
        assertInvalid(
          runValidator(unexpectedRunDirectory),
          /authStateHash: must be omitted when useAuthState is false/,
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
          fixture.plan.delegatedWork = {};
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
              "// ../../../../../playwright.browser-check.fixture\nimport { expect, test } from '@playwright/test';\n\ntest('comment bypass', async ({ page }) => {\n  await expect(page).toHaveURL(/.*/);\n});\n",
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
            "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 fetch bypass', async ({ page }) => {\n  await page.goto('/manual-review');\n  await fetch('https://example.test');\n  await expect(page).toHaveURL(/.*/);\n});\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(
        execution.stderr,
        /(?:uses forbidden runtime identifier|must not execute) fetch/,
      );
    });

    await t.test('wrapper rejects attempts to create another browser context', async () => {
      const runDirectory = await writeWrapperFixture(
        testOwnedChangeDirectories,
        'wrapper-new-context-bypass',
        '20260801231025',
        {
          'generated/preflight.check.spec.ts':
            "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 context bypass', async ({ page }) => {\n  await page.goto('/manual-review');\n  await page.context().newContext();\n  await expect(page).toHaveURL(/.*/);\n});\n",
        },
      );
      const execution = runWrapper([], runDirectory);

      assert.equal(execution.signal, null, diagnosticOutput(execution));
      assert.equal(execution.status, 2, diagnosticOutput(execution));
      assert.match(execution.stderr, /uses forbidden runtime property newContext/);
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
          diagnostic: /forbidden binding property extend|may use test only/,
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
              '  await expect(page).toHaveURL(/.*/);\n' +
              '});\n',
          },
        );
        const execution = runWrapper([], runDirectory);

        assert.equal(execution.signal, null, diagnosticOutput(execution));
        assert.equal(execution.status, 2, diagnosticOutput(execution));
        assert.match(execution.stderr, regressionCase.diagnostic);
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
              "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 missing goto', async ({ page }) => {\n  await expect(page).toHaveURL(/.*/);\n});\n",
          },
        );
        const mismatchedGotoRunDirectory = await writeWrapperFixture(
          testOwnedChangeDirectories,
          'wrapper-mismatched-planned-goto',
          '20260801231223',
          {
            'generated/preflight.check.spec.ts':
              "import { expect, test } from '../../../../../playwright.browser-check.fixture';\n\ntest('BC-WRAPPER-001 mismatched goto', async ({ page }) => {\n  await page.goto('/different-target');\n  await expect(page).toHaveURL(/.*/);\n});\n",
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
              change: { baseRef: fixtureBaseRef },
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
          assert.match(execution.stderr, /plan\.environment must be non-production/);
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
  }
});
