import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  frontendAssetsContentFingerprint,
  frontendAssetsFingerprint,
} from './browser-check-assets.mjs';
import { revisionSnapshot } from './revision-fingerprint.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '../../../..');
const wrapperPath = resolve(scriptDirectory, 'run-browser-check.mjs');
const verificationRoot = resolve(workspaceRoot, 'test-results/change-verification');
const testChangeDirectory = resolve(
  verificationRoot,
  `WRAPPER-FOCUSED-${process.pid}-${Date.now()}`,
);
const fixtureImport = '../../../../../playwright.browser-check.fixture';
const trustedRevisionEnvironmentNames = [
  'BROWSER_CHECK_TRUSTED_BASE_SHA',
  'BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT',
  'BROWSER_CHECK_TRUSTED_HEAD_SHA',
  'BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT',
];

let fixtureSequence = 0;

async function writeWrapperFixture(source) {
  fixtureSequence += 1;
  const runId = `20991231${String(fixtureSequence).padStart(6, '0')}`;
  const runDirectory = resolve(testChangeDirectory, runId);
  const plan = {
    schemaVersion: '1.0',
    change: { baseRef: 'develop', source: 'continuous-integration' },
    revision: {
      baseSha: '1'.repeat(40),
      headSha: '2'.repeat(40),
      worktreeFingerprint: `sha256:${'3'.repeat(64)}`,
    },
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
  };
  await mkdir(resolve(runDirectory, 'generated'), { recursive: true });
  await mkdir(resolve(runDirectory, 'evidence/screenshots'), { recursive: true });
  await writeFile(resolve(runDirectory, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(resolve(runDirectory, 'generated/contract.check.spec.ts'), source);
  return runDirectory;
}

async function updateWrapperPlan(runDirectory, update) {
  const planPath = resolve(runDirectory, 'plan.json');
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  update(plan);
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  return plan;
}

function runWrapper(runDirectory, environmentOverrides = {}) {
  const environment = {
    ...process.env,
    BROWSER_CHECK_DATABASE_CONNECTION: '',
    BROWSER_CHECK_DATABASE_IDENTIFIER: '',
    BROWSER_CHECK_RUN_DIR: relative(workspaceRoot, runDirectory),
    PLAYWRIGHT_BASE_URL: 'http://localhost:8000',
  };
  for (const name of trustedRevisionEnvironmentNames) {
    delete environment[name];
  }
  Object.assign(environment, environmentOverrides);
  return spawnSync(process.execPath, [wrapperPath], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: environment,
    timeout: 120_000,
  });
}

function generatedSource(callbackBody, prefix = '') {
  return (
    `import { expect, test } from '${fixtureImport}';\n\n` +
    prefix +
    "test('BC-WRAPPER-001 focused contract', async ({ page }) => {\n" +
    "  await page.goto('/manual-review');\n" +
    callbackBody +
    '});\n'
  );
}

async function writeFocusedScreenshotFixture(assertion) {
  const runDirectory = await writeWrapperFixture(
    generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
  );
  const screenshotDirectory = relative(workspaceRoot, resolve(runDirectory, 'evidence/screenshots'))
    .split(sep)
    .join('/');
  const screenshotPath = `${screenshotDirectory}/BC-WRAPPER-001-focused.png`;
  await writeFile(
    resolve(runDirectory, 'generated/contract.check.spec.ts'),
    generatedSource(
      `  await page.screenshot({ path: ${JSON.stringify(screenshotPath)} });\n${assertion}`,
    ),
  );
  return runDirectory;
}

function runGit(workspace, arguments_) {
  const execution = spawnSync('git', arguments_, {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 60_000,
  });
  assert.equal(execution.signal, null, execution.stderr);
  assert.equal(execution.status, 0, execution.stderr);
}

async function assertProcessStopped(pid) {
  assert.equal(Number.isSafeInteger(pid) && pid > 0, true, `invalid child process id: ${pid}`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') {
        return;
      }
      throw error;
    }
    await new Promise((resolveDelay) => {
      setTimeout(resolveDelay, 25);
    });
  }
  assert.fail(`browser-check process ${pid} remained alive after timeout cleanup`);
}

async function writeRootErrorWorkspace() {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'browser-check-wrapper-'));
  const fakeWorkspace = await realpath(temporaryDirectory);
  const fakeScriptDirectory = resolve(
    fakeWorkspace,
    '.codex/skills/run-change-verification/scripts',
  );
  await mkdir(fakeScriptDirectory, { recursive: true });
  await copyFile(wrapperPath, resolve(fakeScriptDirectory, 'run-browser-check.mjs'));
  await copyFile(
    resolve(scriptDirectory, 'revision-fingerprint.mjs'),
    resolve(fakeScriptDirectory, 'revision-fingerprint.mjs'),
  );
  await copyFile(
    resolve(scriptDirectory, 'browser-check-assets.mjs'),
    resolve(fakeScriptDirectory, 'browser-check-assets.mjs'),
  );
  await mkdir(resolve(fakeWorkspace, 'node_modules'), { recursive: true });
  await symlink(
    resolve(workspaceRoot, 'node_modules/typescript'),
    resolve(fakeWorkspace, 'node_modules/typescript'),
    'dir',
  );
  await mkdir(resolve(fakeWorkspace, 'node_modules/@playwright/test'), { recursive: true });
  await writeFile(
    resolve(fakeWorkspace, 'node_modules/@playwright/test/cli.js'),
    `'use strict';
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
if (process.env.BROWSER_CHECK_FAKE_CLI_MODE === 'hang') {
  process.on('SIGTERM', () => {
    writeFileSync(resolve(process.env.BROWSER_CHECK_RUN_DIR, 'fake-sigterm.txt'), 'received');
  });
  const descendant = spawn(
    process.execPath,
    ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
    { stdio: 'ignore' },
  );
  writeFileSync(
    resolve(process.env.BROWSER_CHECK_RUN_DIR, 'fake-processes.json'),
    JSON.stringify({ cli: process.pid, descendant: descendant.pid }),
  );
  setInterval(() => {}, 1000);
  return;
}
if (process.env.BROWSER_CHECK_FAKE_CLI_MODE === 'renamed-zip') {
  const artifactsDirectory = resolve(process.env.BROWSER_CHECK_RUN_DIR, 'artifacts/fake');
  mkdirSync(artifactsDirectory, { recursive: true });
  writeFileSync(
    resolve(artifactsDirectory, 'renamed-archive.bin'),
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]),
  );
  const passingReport = {
    suites: [
      {
        title: 'fake renamed archive fixture',
        specs: [
          {
            title: 'BC-ROOTERROR-001 focused contract',
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
    stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 },
  };
  writeFileSync(
    resolve(process.env.BROWSER_CHECK_RUN_DIR, 'playwright-results.json'),
    JSON.stringify(passingReport),
  );
  process.exitCode = 0;
  return;
}
const report = {
  suites: [],
  errors: [{ message: 'Global webServer startup failed before check attribution' }],
  stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 },
};
writeFileSync(resolve(process.env.BROWSER_CHECK_RUN_DIR, 'playwright-results.json'), JSON.stringify(report));
process.exitCode = 1;
`,
  );
  await writeFile(resolve(fakeWorkspace, 'playwright.browser-check.fixture.ts'), 'export {};\n');
  await mkdir(resolve(fakeWorkspace, 'public/build'), { recursive: true });
  await writeFile(resolve(fakeWorkspace, 'public/build/manifest.json'), '{}\n');
  await writeFile(
    resolve(fakeWorkspace, '.gitignore'),
    '/node_modules/\n/public/build/\n/storage/framework/browser-check-assets.json\n/test-results/\n',
  );
  runGit(fakeWorkspace, ['init', '--quiet']);
  runGit(fakeWorkspace, ['config', 'user.email', 'wrapper-contract@example.test']);
  runGit(fakeWorkspace, ['config', 'user.name', 'Wrapper Contract']);
  runGit(fakeWorkspace, ['add', '.']);
  runGit(fakeWorkspace, ['commit', '--quiet', '-m', 'contract fixture']);

  const runDirectory = resolve(
    fakeWorkspace,
    'test-results/change-verification/ROOT-ERROR/20991231235959',
  );
  const revision = revisionSnapshot('HEAD', fakeWorkspace);
  const assetsHash = frontendAssetsContentFingerprint(fakeWorkspace);
  await mkdir(resolve(fakeWorkspace, 'storage/framework'), { recursive: true });
  await writeFile(
    resolve(fakeWorkspace, 'storage/framework/browser-check-assets.json'),
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        revision: {
          headSha: revision.headSha,
          worktreeFingerprint: revision.worktreeFingerprint,
        },
        assetsHash,
      },
      null,
      2,
    )}\n`,
  );
  const plan = {
    schemaVersion: '1.0',
    change: { baseRef: 'HEAD', source: 'continuous-integration' },
    revision,
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
        id: 'BC-ROOTERROR-001',
        driver: 'playwright-temporary',
        target: { url: '/manual-review' },
      },
    ],
  };
  await mkdir(resolve(runDirectory, 'generated'), { recursive: true });
  await mkdir(resolve(runDirectory, 'evidence/screenshots'), { recursive: true });
  await writeFile(resolve(runDirectory, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(
    resolve(runDirectory, 'generated/contract.check.spec.ts'),
    `import { expect, test } from '../../../../../playwright.browser-check.fixture';

test('BC-ROOTERROR-001 root error contract', async ({ page }) => {
  await page.goto('/manual-review');
  await expect(page.getByRole('heading')).toBeVisible();
});
`,
  );

  return { fakeWorkspace, runDirectory, temporaryDirectory };
}

void test('browser-check wrapper source contract', async (t) => {
  try {
    await t.test(
      'rejects unreachable, tautological, literal-only, and non-matcher assertions',
      async () => {
        const cases = [
          '',
          '  await expect(true).toBe(true);\n',
          "  await expect(page.getByRole('heading')).toString();\n",
          '  await expect(page).toHaveURL(/.*/);\n',
          "  return;\n  await expect(page).toHaveURL('/manual-review');\n",
          '  const currentUrl = page.url();\n  await expect(currentUrl).toBe(currentUrl);\n',
          "  const matches = page.url().includes('');\n  await expect(matches).toBe(true);\n",
          '  const currentText = page.url();\n  await expect(currentText).toEqual([]);\n',
          "  const texts = await page.getByRole('heading').allInnerTexts();\n  await expect(texts).toHaveProperty('length');\n",
          "  await expect(page.url()).not.toBe('');\n",
          "  const count = await page.getByRole('heading').count();\n  await expect(count).toBeGreaterThanOrEqual(0);\n",
          "  const html = await page.content();\n  console.log(html);\n  await expect(page).toHaveURL('/manual-review');\n",
          "  await expect(page).toHaveURL('/manual-review');\n  throw new Error(page.url());\n",
          "  await expect(page).toHaveURL('/manual-review');\n  await Promise.reject(page.url());\n",
          "  await expect(page).toHaveURL('/manual-review');\n  JSON.parse(await page.content());\n",
        ];
        for (const sourceBody of cases) {
          const runDirectory = await writeWrapperFixture(generatedSource(sourceBody));
          const execution = runWrapper(runDirectory);
          assert.equal(execution.signal, null, execution.stderr);
          assert.equal(execution.status, 2, execution.stderr);
          assert.match(execution.stderr, /reachable awaited direct assertion/);
        }
      },
    );

    await t.test('accepts specific page and locator dataflow assertions', async () => {
      const cases = [
        "  await expect(page).toHaveTitle('Manual Review');\n",
        "  const heading = page.getByRole('heading');\n  await expect(heading).toBeVisible();\n",
        "  await expect(page.getByRole('heading')).toContainText('Manual');\n",
        "  await page.getByRole('button', { name: '保存' }).click();\n  await expect(page.getByRole('status')).toContainText('保存しました');\n",
      ];
      for (const sourceBody of cases) {
        const runDirectory = await writeWrapperFixture(generatedSource(sourceBody));
        const execution = runWrapper(runDirectory);
        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(execution.stderr, /BROWSER_CHECK_DATABASE_CONNECTION must be sqlite or mysql/);
        assert.doesNotMatch(execution.stderr, /reachable awaited direct assertion/);
      }
    });

    await t.test('rejects the navigation target URL as the sole acceptance assertion', async () => {
      const runDirectory = await writeFocusedScreenshotFixture(
        "  await expect(page).toHaveURL('/manual-review');\n",
      );
      const execution = runWrapper(runDirectory);

      assert.equal(execution.signal, null, execution.stderr);
      assert.equal(execution.status, 2, execution.stderr);
      assert.match(
        execution.stderr,
        /acceptance assertion|initial navigation|reachable awaited direct assertion/,
      );
    });

    await t.test('rejects viewport configuration as the sole acceptance assertion', async () => {
      const runDirectory = await writeFocusedScreenshotFixture(
        '  await expect(page.viewportSize()).toMatchObject({ width: 1280 });\n',
      );
      const execution = runWrapper(runDirectory);

      assert.equal(execution.signal, null, execution.stderr);
      assert.equal(execution.status, 2, execution.stderr);
      assert.match(
        execution.stderr,
        /viewport|acceptance assertion|reachable awaited direct assertion/,
      );
    });

    await t.test('rejects absence-only assertions as the sole acceptance signal', async () => {
      const cases = [
        "  await expect(page.getByRole('alert')).toBeHidden();\n",
        "  await expect(page.getByRole('alert')).toHaveCount(0);\n",
        "  const hidden = await page.getByRole('alert').isHidden();\n  await expect(hidden).toBe(true);\n",
        "  const count = await page.getByRole('alert').count();\n  await expect(count).toBe(0);\n",
      ];
      for (const assertion of cases) {
        const runDirectory = await writeFocusedScreenshotFixture(assertion);
        const execution = runWrapper(runDirectory);

        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(execution.stderr, /reachable awaited direct assertion/);
      }
    });

    await t.test('allows absence assertions beside an independent positive assertion', async () => {
      const runDirectory = await writeFocusedScreenshotFixture(
        "  await expect(page.getByRole('alert')).toBeHidden();\n" +
          "  const count = await page.getByRole('alert').count();\n" +
          '  await expect(count).toBe(0);\n' +
          "  await expect(page.getByRole('heading')).toContainText('Manual');\n",
      );
      const execution = runWrapper(runDirectory);

      assert.equal(execution.signal, null, execution.stderr);
      assert.equal(execution.status, 2, execution.stderr);
      assert.match(execution.stderr, /BROWSER_CHECK_DATABASE_CONNECTION must be sqlite or mysql/);
      assert.doesNotMatch(execution.stderr, /reachable awaited direct assertion/);
    });

    await t.test('requires trusted revision bindings only in Docker mode', async () => {
      const dockerRunDirectory = await writeWrapperFixture(
        generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
      );
      await updateWrapperPlan(dockerRunDirectory, (plan) => {
        plan.environment.baseUrl = 'http://nginx-browser-check:80';
      });
      const dockerExecution = runWrapper(dockerRunDirectory, {
        BROWSER_CHECK_DATABASE_CONNECTION: 'mysql',
        BROWSER_CHECK_DATABASE_IDENTIFIER: 'mysql:mysql-browser-check/browser_check',
        PLAYWRIGHT_BASE_URL: 'http://nginx-browser-check:80',
      });

      assert.equal(dockerExecution.signal, null, dockerExecution.stderr);
      assert.equal(dockerExecution.status, 2, dockerExecution.stderr);
      assert.match(dockerExecution.stderr, /are all required in Docker mode/);

      const dockerDependencyExecution = runWrapper(dockerRunDirectory, {
        BROWSER_CHECK_DATABASE_CONNECTION: 'mysql',
        BROWSER_CHECK_DATABASE_IDENTIFIER: 'mysql:mysql-browser-check/browser_check',
        BROWSER_CHECK_TRUSTED_BASE_SHA: '1'.repeat(40),
        BROWSER_CHECK_TRUSTED_HEAD_SHA: '2'.repeat(40),
        BROWSER_CHECK_TRUSTED_WORKTREE_FINGERPRINT: `sha256:${'3'.repeat(64)}`,
        PLAYWRIGHT_BASE_URL: 'http://nginx-browser-check:80',
      });
      assert.equal(dockerDependencyExecution.signal, null, dockerDependencyExecution.stderr);
      assert.equal(dockerDependencyExecution.status, 2, dockerDependencyExecution.stderr);
      assert.match(
        dockerDependencyExecution.stderr,
        /BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT must be a lowercase sha256 fingerprint in Docker mode/,
      );

      const hostRunDirectory = await writeWrapperFixture(
        generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
      );
      const hostRelativePath = relative(workspaceRoot, hostRunDirectory).split(sep).join('/');
      const hostExecution = runWrapper(hostRunDirectory, {
        BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
        BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${hostRelativePath}/runtime/browser-check.sqlite`,
        BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT: `sha256:${'4'.repeat(64)}`,
      });

      assert.equal(hostExecution.signal, null, hostExecution.stderr);
      assert.equal(hostExecution.status, 2, hostExecution.stderr);
      assert.match(
        hostExecution.stderr,
        /BROWSER_CHECK_TRUSTED_DEPENDENCIES_FINGERPRINT must be absent in host mode/,
      );
    });

    await t.test('rejects screenshot paths not uniquely bound to the owning check ID', async () => {
      const cases = [
        'shared.png',
        'BC-OTHER-002.png',
        'prefixBC-WRAPPER-001suffix.png',
        'BC-WRAPPER-001/BC-WRAPPER-001.png',
      ];
      for (const screenshotSuffix of cases) {
        const runDirectory = await writeWrapperFixture(
          generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
        );
        const screenshotDirectory = relative(
          workspaceRoot,
          resolve(runDirectory, 'evidence/screenshots'),
        )
          .split(sep)
          .join('/');
        const screenshotPath = `${screenshotDirectory}/${screenshotSuffix}`;
        await writeFile(
          resolve(runDirectory, 'generated/contract.check.spec.ts'),
          generatedSource(
            `  await page.screenshot({ path: ${JSON.stringify(screenshotPath)} });\n` +
              "  await expect(page.getByRole('heading')).toBeVisible();\n",
          ),
        );

        const runRelativePath = relative(workspaceRoot, runDirectory).split(sep).join('/');
        const execution = runWrapper(runDirectory, {
          BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
          BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runRelativePath}/runtime/browser-check.sqlite`,
          BROWSER_CHECK_TRUSTED_HOST_SMOKE: 'true',
        });
        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(
          execution.stderr,
          /screenshot path must contain exactly the owning check ID BC-WRAPPER-001 as a bounded token/,
        );
      }
    });

    await t.test('rejects mutation of the guarded page and page-derived observations', async () => {
      const cases = [
        "  page = { url: () => 'fabricated' };\n  await expect(page.url()).toBe('fabricated');\n",
        "  page.url = () => 'fabricated';\n  await expect(page.url()).toBe('fabricated');\n",
        "  const values = await page.getByRole('heading').allInnerTexts();\n  values.length = 0;\n  await expect(values).toHaveLength(0);\n",
        "  const values = await page.getByRole('heading').allInnerTexts();\n  values.pop();\n  await expect(values).toHaveLength(0);\n",
      ];
      for (const sourceBody of cases) {
        const runDirectory = await writeWrapperFixture(generatedSource(sourceBody));
        const execution = runWrapper(runDirectory);
        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(
          execution.stderr,
          /assignment, update, or delete expressions|reachable awaited direct assertion/,
        );
      }
    });

    await t.test('rejects noncanonical SourceFile top-level statements', async () => {
      const cases = [
        'const helper = 1;\n',
        'function helper() {}\n',
        'for (const value of []) { void value; }\n',
        'void (async () => {})();\n',
      ];
      for (const prefix of cases) {
        const runDirectory = await writeWrapperFixture(
          generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n", prefix),
        );
        const execution = runWrapper(runDirectory);
        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(execution.stderr, /top-level statements may contain only/);
      }
    });

    await t.test('rejects hard-linked plan and generated source files', async () => {
      for (const relativePath of ['plan.json', 'generated/contract.check.spec.ts']) {
        const runDirectory = await writeWrapperFixture(
          generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
        );
        await link(
          resolve(runDirectory, relativePath),
          resolve(runDirectory, `${relativePath.replaceAll('/', '-')}.hardlink`),
        );
        const execution = runWrapper(runDirectory);
        assert.equal(execution.signal, null, execution.stderr);
        assert.equal(execution.status, 2, execution.stderr);
        assert.match(execution.stderr, /must not be hard-linked/);
      }
    });

    await t.test('rejects oversized structured wrapper inputs before parsing', async () => {
      const runDirectory = await writeWrapperFixture(
        generatedSource("  await expect(page.getByRole('heading')).toBeVisible();\n"),
      );
      await truncate(resolve(runDirectory, 'plan.json'), 16 * 1024 * 1024 + 1);
      const execution = runWrapper(runDirectory);

      assert.equal(execution.signal, null, execution.stderr);
      assert.equal(execution.status, 2, execution.stderr);
      assert.match(execution.stderr, /16777216-byte structural file limit/);
    });
  } finally {
    await rm(testChangeDirectory, { recursive: true, force: true });
  }
});

void test('frontend asset fingerprint binds canonical build contents', async () => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'browser-check-assets-'));
  const fakeWorkspace = await realpath(temporaryDirectory);
  try {
    await mkdir(resolve(fakeWorkspace, 'public/build/assets'), { recursive: true });
    await writeFile(resolve(fakeWorkspace, 'public/build/manifest.json'), '{}\n');
    await writeFile(resolve(fakeWorkspace, 'public/build/assets/app.js'), 'first\n');
    await mkdir(resolve(fakeWorkspace, 'storage/framework'), { recursive: true });

    const firstFingerprint = frontendAssetsContentFingerprint(fakeWorkspace);
    assert.match(firstFingerprint, /^sha256:[0-9a-f]{64}$/);
    assert.equal(frontendAssetsContentFingerprint(fakeWorkspace), firstFingerprint);
    const expectedRevision = {
      headSha: '1'.repeat(40),
      worktreeFingerprint: `sha256:${'2'.repeat(64)}`,
    };
    const markerPath = resolve(fakeWorkspace, 'storage/framework/browser-check-assets.json');
    const markerSource = `${JSON.stringify({
      schemaVersion: '1.0',
      revision: expectedRevision,
      assetsHash: firstFingerprint,
    })}\n`;
    await writeFile(markerPath, markerSource);
    assert.equal(frontendAssetsFingerprint(fakeWorkspace, expectedRevision), firstFingerprint);

    await truncate(markerPath, 16 * 1024 * 1024 + 1);
    assert.throws(
      () => frontendAssetsFingerprint(fakeWorkspace, expectedRevision),
      /16777216-byte structural file limit/,
    );
    await writeFile(markerPath, markerSource);

    const dependenciesFingerprint = `sha256:${'4'.repeat(64)}`;
    await writeFile(
      markerPath,
      `${JSON.stringify({
        schemaVersion: '1.0',
        revision: expectedRevision,
        assetsHash: firstFingerprint,
        dependenciesFingerprint,
      })}\n`,
    );
    assert.equal(
      frontendAssetsFingerprint(
        fakeWorkspace,
        expectedRevision,
        undefined,
        dependenciesFingerprint,
      ),
      firstFingerprint,
    );
    assert.throws(
      () =>
        frontendAssetsFingerprint(
          fakeWorkspace,
          expectedRevision,
          undefined,
          `sha256:${'5'.repeat(64)}`,
        ),
      /trusted Docker dependency installation/,
    );
    await writeFile(markerPath, markerSource);

    await writeFile(resolve(fakeWorkspace, 'public/build/assets/app.js'), 'second\n');
    assert.notEqual(frontendAssetsContentFingerprint(fakeWorkspace), firstFingerprint);
    assert.throws(
      () => frontendAssetsFingerprint(fakeWorkspace, expectedRevision),
      /public\/build does not match its revision-bound build marker/,
    );

    await rm(resolve(fakeWorkspace, 'public/build/manifest.json'));
    assert.throws(
      () => frontendAssetsContentFingerprint(fakeWorkspace),
      /public\/build\/manifest\.json must be a regular/,
    );

    await writeFile(resolve(fakeWorkspace, 'public/build/manifest.json'), '{}\n');
    await writeFile(resolve(fakeWorkspace, 'public/hot'), 'http://localhost:5173\n');
    assert.throws(
      () => frontendAssetsContentFingerprint(fakeWorkspace),
      /public\/hot must be absent/,
    );
    await rm(resolve(fakeWorkspace, 'public/hot'));

    await link(
      resolve(fakeWorkspace, 'public/build/manifest.json'),
      resolve(fakeWorkspace, 'public/build/assets/hard-linked.json'),
    );
    assert.throws(
      () => frontendAssetsContentFingerprint(fakeWorkspace),
      /public\/build must not contain hard-linked files|manifest\.json must be a regular/,
    );
    await rm(resolve(fakeWorkspace, 'public/build/assets/hard-linked.json'));

    const oversizedAssetPath = resolve(fakeWorkspace, 'public/build/assets/oversized.js');
    await writeFile(oversizedAssetPath, '');
    await truncate(oversizedAssetPath, 1024 * 1024 * 1024);
    assert.throws(
      () => frontendAssetsContentFingerprint(fakeWorkspace),
      /1073741824-byte frontend asset limit/,
    );
    await rm(oversizedAssetPath);

    await writeFile(resolve(fakeWorkspace, 'outside.txt'), 'outside\n');
    await symlink(
      resolve(fakeWorkspace, 'outside.txt'),
      resolve(fakeWorkspace, 'public/build/assets/linked.js'),
    );
    assert.throws(
      () => frontendAssetsContentFingerprint(fakeWorkspace),
      /public\/build must not contain symlinks/,
    );
  } finally {
    await rm(fakeWorkspace, { recursive: true, force: true });
  }
});

void test('unattributed Playwright root errors become global pre-report errors', async () => {
  const { fakeWorkspace, runDirectory } = await writeRootErrorWorkspace();
  try {
    const runRelativePath = relative(fakeWorkspace, runDirectory).split('\\').join('/');
    const environment = {
      ...process.env,
      BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
      BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runRelativePath}/runtime/browser-check.sqlite`,
      BROWSER_CHECK_RUN_DIR: runRelativePath,
      BROWSER_CHECK_TRUSTED_HOST_SMOKE: 'true',
      BROWSER_CHECK_USE_AUTH_STATE: 'false',
      PLAYWRIGHT_BASE_URL: 'http://localhost:8000',
    };
    delete environment.BROWSER_CHECK_CONTRACT_TEST_TIMEOUT;
    const execution = spawnSync(
      process.execPath,
      [
        resolve(
          fakeWorkspace,
          '.codex/skills/run-change-verification/scripts/run-browser-check.mjs',
        ),
      ],
      {
        cwd: fakeWorkspace,
        encoding: 'utf8',
        env: environment,
        timeout: 240_000,
      },
    );

    assert.equal(execution.signal, null, execution.stderr);
    assert.equal(execution.status, 1, execution.stderr);
    assert.match(execution.stderr, /root error 0 cannot be attributed/);
    await assert.rejects(access(resolve(runDirectory, 'playwright-results.json')), {
      code: 'ENOENT',
    });
    await assert.rejects(access(resolve(runDirectory, '.browser-check-artifacts.json')), {
      code: 'ENOENT',
    });
    const executionError = JSON.parse(
      await readFile(resolve(runDirectory, '.browser-check-execution-error.json'), 'utf8'),
    );
    assert.deepEqual(
      {
        schemaVersion: executionError.schemaVersion,
        phase: executionError.phase,
        scope: executionError.scope,
        affectedCheckIds: executionError.affectedCheckIds,
        classification: executionError.classification,
      },
      {
        schemaVersion: '1.0',
        phase: 'pre-report',
        scope: 'global',
        affectedCheckIds: ['BC-ROOTERROR-001'],
        classification: 'environment-defect',
      },
    );
    const claim = JSON.parse(
      await readFile(resolve(runDirectory, '.browser-check-run.json'), 'utf8'),
    );
    assert.match(claim.frontendAssetsHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(claim.postflight, undefined);
  } finally {
    await rm(fakeWorkspace, { recursive: true, force: true });
  }
});

void test('renamed ZIP execution artifacts are rejected before manifest creation', async () => {
  const { fakeWorkspace, runDirectory } = await writeRootErrorWorkspace();
  try {
    const runRelativePath = relative(fakeWorkspace, runDirectory).split('\\').join('/');
    const execution = spawnSync(
      process.execPath,
      [
        resolve(
          fakeWorkspace,
          '.codex/skills/run-change-verification/scripts/run-browser-check.mjs',
        ),
      ],
      {
        cwd: fakeWorkspace,
        encoding: 'utf8',
        env: {
          ...process.env,
          BROWSER_CHECK_CONTRACT_TEST_TIMEOUT: 'true',
          BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
          BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runRelativePath}/runtime/browser-check.sqlite`,
          BROWSER_CHECK_FAKE_CLI_MODE: 'renamed-zip',
          BROWSER_CHECK_RUN_DIR: runRelativePath,
          BROWSER_CHECK_TRUSTED_HOST_SMOKE: 'true',
          BROWSER_CHECK_USE_AUTH_STATE: 'false',
          NODE_ENV: 'test',
          PLAYWRIGHT_BASE_URL: 'http://localhost:8000',
        },
        timeout: 240_000,
      },
    );

    assert.equal(execution.signal, null, execution.stderr);
    assert.equal(execution.status, 1, execution.stderr);
    assert.match(
      execution.stderr,
      /raw ZIP archives are forbidden because trace archives can retain unredacted secrets: .*\/artifacts\/fake\/renamed-archive\.bin/,
    );
    await assert.rejects(access(resolve(runDirectory, '.browser-check-artifacts.json')), {
      code: 'ENOENT',
    });
  } finally {
    await rm(fakeWorkspace, { recursive: true, force: true });
  }
});

void test('bounded Playwright timeout records a check-script pre-report error', async () => {
  const { fakeWorkspace, runDirectory } = await writeRootErrorWorkspace();
  try {
    const runRelativePath = relative(fakeWorkspace, runDirectory).split('\\').join('/');
    const execution = spawnSync(
      process.execPath,
      [
        resolve(
          fakeWorkspace,
          '.codex/skills/run-change-verification/scripts/run-browser-check.mjs',
        ),
      ],
      {
        cwd: fakeWorkspace,
        encoding: 'utf8',
        env: {
          ...process.env,
          BROWSER_CHECK_CONTRACT_TEST_TIMEOUT: 'true',
          BROWSER_CHECK_DATABASE_CONNECTION: 'sqlite',
          BROWSER_CHECK_DATABASE_IDENTIFIER: `sqlite:${runRelativePath}/runtime/browser-check.sqlite`,
          BROWSER_CHECK_FAKE_CLI_MODE: 'hang',
          BROWSER_CHECK_RUN_DIR: runRelativePath,
          BROWSER_CHECK_TRUSTED_HOST_SMOKE: 'true',
          BROWSER_CHECK_USE_AUTH_STATE: 'false',
          NODE_ENV: 'test',
          PLAYWRIGHT_BASE_URL: 'http://localhost:8000',
        },
        timeout: 240_000,
      },
    );

    assert.equal(execution.signal, null, execution.stderr);
    assert.equal(execution.status, 1, execution.stderr);
    assert.match(execution.stderr, /exceeded the derived 15000 ms execution timeout/);
    assert.match(execution.stderr, /sent SIGTERM.*SIGKILL fallback/);
    const fakeProcesses = JSON.parse(
      await readFile(resolve(runDirectory, 'fake-processes.json'), 'utf8'),
    );
    await assertProcessStopped(fakeProcesses.cli);
    await assertProcessStopped(fakeProcesses.descendant);
    for (const absentPath of ['playwright-results.json', '.browser-check-artifacts.json']) {
      await assert.rejects(access(resolve(runDirectory, absentPath)), { code: 'ENOENT' });
    }
    const executionError = JSON.parse(
      await readFile(resolve(runDirectory, '.browser-check-execution-error.json'), 'utf8'),
    );
    assert.equal(executionError.phase, 'pre-report');
    assert.equal(executionError.scope, 'global');
    assert.deepEqual(executionError.affectedCheckIds, ['BC-ROOTERROR-001']);
    assert.equal(executionError.classification, 'check-script-defect');
    const claim = JSON.parse(
      await readFile(resolve(runDirectory, '.browser-check-run.json'), 'utf8'),
    );
    assert.match(claim.frontendAssetsHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(claim.postflight, undefined);
  } finally {
    await rm(fakeWorkspace, { recursive: true, force: true });
  }
});
