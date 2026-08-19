---
name: execute-browser-checks
description: Execute planned change-only browser verification with an available browser agent or temporary Playwright tests. Use it for plan rows assigned to agent-browser or playwright-temporary, capturing objective results and same-run evidence without modifying product code, performing human checks, or adding permanent E2E assets.
---

# Execute Browser Checks

## Overview

Execute only checks whose primary driver is `agent-browser` or `playwright-temporary`.

Do not perform human-only checks and do not promote temporary checks into permanent E2E tests.

## Required References

Read:

- the run's `plan.json`;
- relevant specifications and changed files;
- [`artifact-contract.md`](../run-change-verification/references/artifact-contract.md);
- [`driver-selection.md`](../run-change-verification/references/driver-selection.md);
- [`evidence-policy.md`](../run-change-verification/references/evidence-policy.md);
- relevant existing browser scenarios and test-data instructions when they ground the planned steps.

Execute no unplanned browser concern unless the plan is updated first.

The temporary-test rules below carry the default locator, auto-wait, Web-first assertion, and no-permanent-POM guidance. Only these permanent-suite references are compatible with the restricted temporary-check runtime:

- [`selector-strategy.md`](../playwright-guidelines/references/selector-strategy.md) when accessible locator choice is ambiguous;
- [`test-stability.md`](../playwright-guidelines/references/test-stability.md) when dynamic behavior, retries, or flakiness needs deeper analysis;

Do not load the permanent-suite code-generation checklist, fixture examples, Laravel subprocess
setup, or full Playwright skill for temporary source. Their Page Object and alternate-fixture patterns
are intentionally incompatible with the sole canonical fixture import enforced below.

## Runtime Driver Selection

Respect the planned driver. If it is unavailable:

- use `playwright-temporary` only for a deterministic check with grounded expectations after
  updating both `plan.json` and `plan.md` before execution and before the run is claimed;
- if the run is already claimed, preserve it and create a new run for the replanned driver;
- otherwise mark the check `blocked` with the missing capability and completion requirement;
- never silently turn an exploratory observation into a deterministic pass/fail script.

## Agent Browser Mode

Use the browser automation tool actually available in the environment; do not assume a specific tool name.

For each check:

1. establish approved test state;
2. open the target route;
3. perform the planned steps;
4. inspect every expected UI result;
5. inspect URL, DOM, console, or network when required;
6. capture the planned evidence under the run directory;
7. record the actual result and environment.

### Agent Browser Rules

- Use accessible names and user-visible controls.
- Do not infer success merely because no exception occurred.
- Do not mark a subjective observation as pass.
- Capture before and after evidence when a transition matters.
- Record unexpected console errors and failed network requests.
- Do not mutate application data outside approved testing mechanisms.
- Do not use production accounts, credentials, data, or environments.

## Temporary Playwright Mode

Generate TypeScript checks only under:

```text
{run-dir}/generated/*.check.spec.ts
```

Use the repository's independent `playwright.browser-check.config.ts`.

For ordinary execution, the Docker orchestrator builds CSR and SSR assets from a sanitized
copy-on-write source workspace inside the isolated internal network. It records a run-local Git
revision, lockfile-matched dependency fingerprint, and asset marker; the wrapper rejects missing,
stale, redirected, or subsequently changed inputs and assets. The orchestrator rechecks installed
dependency parity after the build and after Playwright. Do not execute change-controlled Vite
configuration in the normal development `app` service.

Host execution is reserved for the trusted `continuous-integration` infrastructure smoke. It is
configuration-isolated but not an OS filesystem/network sandbox, so never use it for ordinary
change verification. The smoke sets the explicit host authorization flag
(`{run-dir}` is repository-relative):

Set `plan.environment.baseUrl` to `http://localhost:8000` for this mode.

```bash
PLAYWRIGHT_BASE_URL="http://localhost:8000" \
  BROWSER_CHECK_RUN_DIR="{run-dir}" \
  BROWSER_CHECK_DATABASE_CONNECTION="sqlite" \
  BROWSER_CHECK_DATABASE_IDENTIFIER="sqlite:{run-dir}/runtime/browser-check.sqlite" \
  BROWSER_CHECK_TRUSTED_HOST_SMOKE="true" \
  npm run test:browser-check
```

The trusted host smoke creates a fresh SQLite database inside the run, migrates and seeds it, and starts a
non-reusable `APP_ENV=testing` server. All Laravel storage and framework caches are run-local. A
bound port, pre-existing server, or shared `public/storage` path is an error.

For ordinary change verification, use the dedicated Docker orchestrator. It pins the
repository's absolute Compose file and an empty Compose env file, removes ambient `COMPOSE_*`
configuration, validates the rendered services before migration, assigns a unique project per run, and
always tears that project down. A sanitized source snapshot is mounted read-only with repository
environment and npm/Git configuration masked; ignored files from the live checkout are not copied. Only
the exact append-only run directory is mounted read-write into Playwright.
This boundary prevents accidental reuse of development state and credentials; it is not an
adversarial-code security sandbox. Execute only changes that you are authorized and willing to run
on the local Docker host.

The orchestrator requires a clean-install dependency attestation and rejects a marker recorded
against later-mutated package contents or root manifests. The recorder independently installs both
lockfiles into a fresh, ignored, manifest-addressed dependency root with package scripts and
Composer plugins disabled. Docker mounts only that clean root; it never trusts the development
`node_modules` or `vendor`. After changing a lockfile or package manifest, create a fresh
installation and marker before the run:

```bash
docker compose exec app npm run attest:browser-check-dependencies
```

The recorder writes the marker only after both installers and the complete dependency-tree hash
succeed. Invoking it cannot bless bytes from the existing development installation.

Set `plan.environment.baseUrl` to `http://nginx-browser-check:80` for this mode. The wrapper rejects
a plan prepared for host mode when it is invoked in Docker, even though both URLs canonicalize to
the same browser origin.

```bash
BROWSER_CHECK_RUN_DIR="{run-dir}" npm run test:browser-check:docker
```

Do not replace this with bare `docker compose up`, `run`, `rm`, or `down` commands. Those commands can
inherit local overrides, collide with concurrent verification, or affect the normal development stack.

Reusable authentication state is unsupported because every run creates a fresh database and unique
Docker project. Omit `plan.environment.useAuthState` or set it to `false`; authenticate explicitly
inside the temporary check when authentication is part of its preconditions. The wrapper and
validator reject `useAuthState=true` rather than accepting a stale session cookie.

The temporary configuration accepts only HTTP localhost/loopback addresses or the repository's
dedicated Docker `nginx-browser-check` host. It rejects the normal `nginx` service, HTTPS, and every
plan whose `appEnvironment` is not exactly `testing`. The host runtime uses a run-local SQLite
database; Docker uses only the ephemeral `mysql-browser-check` service, which has no published host
port. Do not bypass these controls to target an existing development, staging, or production
environment. Temporary execution is fixed to Chromium, `ja-JP`, and `Asia/Tokyo`.

The package script validates the plan revision and generated source, then atomically claims the run
before it starts Playwright. The claim binds the plan, generated source, revision-marked frontend
asset tree, lockfile-matched dependency fingerprint, preflight Git revision,
canonical runtime base URL, application environment, database connection and identifier, and the
required disabled-auth-state selection. The configuration verifies those bindings, including the
SHA-256 hash of the database identifier. The exact preflight and
postflight runtime object contains `baseUrl`, `appEnvironment`, `databaseConnection`,
`databaseIdentifierHash`, `useAuthState`, `browser`, `locale`, and `timezone`; `useAuthState` is
always `false` and `authStateHash` is omitted. After Playwright exits normally, the
wrapper rechecks the plan, generated source, frontend asset marker and tree,
runtime, and revision, then atomically records postflight integrity and the exit code. A missing
postflight record means the artifacts are not finalizable evidence; a nonzero recorded exit can
support a fail or blocked classification but never a pass. The wrapper refuses stale plans, a prior
claim, or a run directory that already contains Playwright execution output. Never invoke the
Playwright configuration directly and never rerun into an old run to replace JSON or evidence,
screenshots, or reports; create a fresh timestamped run and copy only the still-applicable plan
intent into it.

The wrapper accepts only the optional `--headed` flag. For Docker execution, append `-- --headed`
to the orchestrator command; it runs the headed browser under the image's isolated X virtual
framebuffer. Do not override workers, retries, trace, reporters, output paths, timeouts, or the
configuration from the command line.

### Temporary Test Rules

- Use TypeScript and make the only import exactly the unaliased named values `test` and `expect`
  from the repository root `playwright.browser-check.fixture.ts` through its canonical relative
  path. Comments and strings are not imports, and helper modules, dynamic imports, `require`, Node
  network APIs, and alternate Playwright browser/context/request fixtures are rejected.
- Call `test(...)` directly with exactly a static title and inline arrow callback. The title must
  contain exactly one bounded planned `playwright-temporary` check ID. Use only direct
  `expect(...)` and `expect.poll(...)` assertions; do not alias, destructure, extend, configure,
  bind, or derive either imported API.
- Request only `{ page }` in each inline `test(...)` callback. Use Playwright assertions and an
  explicitly planned focused screenshot or sanitized console/network record instead of importing
  filesystem evidence helpers.
- Include at least one directly awaited assertion in each callback whose subject is `page`, a
  locator, or a value derived from a permitted page observation. Literal-only assertions are invalid.
- Make the callback's first statement a direct static `page.goto(...)`. Its canonical destination
  must exactly equal the same titled check's planned `target.url`, including query and fragment.
  Generate exactly one test for every planned temporary check.
- Prefer `getByRole`, `getByLabel`, `getByPlaceholder`, and stable visible text.
- Use `getByTestId` only when no suitable user-facing locator exists.
- Never use arbitrary `waitForTimeout`.
- Use Web-first assertions and rely on auto-waiting.
- Keep each check independently diagnosable.
- Do not import or instantiate permanent Page Objects. Consult them only to ground selector intent,
  then use direct accessible locators in the generated check; the fixture must remain its sole import.
- Do not build a permanent Page Object for a one-off check.
- Do not place or copy temporary code under `tests/e2e/tests/`.
- Use focused screenshots and sanitized console/network records as evidence, not substitutes for assertions. Automatic Playwright
  artifacts remain under `artifacts/`. An intentional screenshot is allowed only as a direct awaited
  top-level test statement using
  `.screenshot({ path: "..." })` call with an inline object and one new, unique, repository-relative
  static `.png` path beneath this run's exact `evidence/screenshots/` directory.
- Keep every temporary test callback linear and capability-limited: direct awaited navigation,
  locator/page actions with static arguments, approved page-derived assertions, and the focused
  screenshot only. Console output, manual throws/rejections, arbitrary function calls, and dynamic
  runtime construction are rejected by the wrapper.
- The wrapper gives Playwright only an explicit runtime allowlist; do not depend on arbitrary parent
  environment variables or secrets in a temporary check, config, fixture, or reporter.
- Do not accept raw Playwright codegen output without objective assertions.
- Keep every HTTP request, API request, WebSocket, popup, and top-level navigation on the configured
  approved HTTP origin. `about:`, `data:`, `file:`, and any final page outside that origin are
  invalid after initial page creation. The automatic fixture blocks and fails cross-origin activity, prevents creation
  of unguarded browsers, contexts, CDP sessions, or routing policies, and service workers are
  disabled so they cannot bypass routing.
- Do not access private `_` members, context/browser/CDP APIs, listener or routing controls,
  raw-code execution methods, or Playwright methods that can read or write arbitrary files. These
  restrictions include uploads, downloads, PDF, storage state, tracing export, attachments,
  streams, and video paths; the bounded screenshot form above is the only intentional path-bearing
  exception.

## Test Data

Use approved deterministic setup in this order:

1. existing `StockAnalysisDemoSeeder` or another existing E2E seed/scenario;
2. explicit login inside the Docker temporary check; the trusted host infrastructure smoke remains
   guest-only;
3. a testing-only Artisan scenario when it exists;
4. an explicitly supplied safe test account.

Never create a generic raw-SQL input or test-only production HTTP endpoint. Never run a destructive reset outside `APP_ENV=testing` or an unconditional `migrate:fresh` against a development database.

## Result Recording

For every assigned check, write or update `result.json`, `result.md`, and `issues.md` with:

- check ID and actual driver;
- terminal status;
- actual result;
- browser, viewport, and base URL;
- evidence paths;
- issue references;
- execution notes and blockers.

Follow the exact result table, per-check detail sections, and summary-count line in the
[`artifact-contract.md` canonical Markdown projection](../run-change-verification/references/artifact-contract.md#canonical-markdown-projections).

Use only statuses defined by the artifact contract. A pass requires the evidence policy's minimum evidence and must address every expected result.

After all JSON and Markdown projections exist, run:

```bash
npm run validate:change-verification -- "{run-dir}"
```

Run this narrow repository-metadata check on the host because it invokes local Git to recompute the
recorded HEAD and dirty-worktree fingerprint; the application container does not provide Git. It
uses only Node built-ins and does not install dependencies. Keep the result incomplete until the
validator succeeds.

## Failure Classification

Investigate before classifying failure. Distinguish:

- `product-defect`
- `test-data-defect`
- `check-script-defect`
- `environment-defect`
- `specification-gap`
- `observation`

A broken locator, invalid assertion, expired test state, unavailable browser, or unclear expectation is not automatically a product defect.

## Boundaries

- Do not edit product code.
- Do not add dependencies or install browsers without explicit approval.
- Do not add permanent E2E specifications, tests, fixtures, or Page Objects.
- Do not change the normal `playwright.config.ts` to make a temporary check run.
- Do not hide failed, blocked, or not-run checks.
- Do not claim human execution.
- Do not use destructive setup against a non-testing database.

## Completion Criteria

Finish when every assigned browser check is either:

- executed with objective same-run evidence; or
- marked `blocked` with a concrete reason and completion requirement.

Report every generated file, evidence path, command, exit code, and environment blocker.
