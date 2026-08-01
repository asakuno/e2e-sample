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
- relevant existing Page Objects and test-data instructions only when they reduce real duplication.

Execute no unplanned browser concern unless the plan is updated first.

The temporary-test rules below carry the default locator, auto-wait, Web-first assertion, and no-permanent-POM guidance. Load additional permanent-E2E guidance only when the check actually needs it:

- [`selector-strategy.md`](../playwright-guidelines/references/selector-strategy.md) when accessible locator choice is ambiguous;
- [`test-stability.md`](../playwright-guidelines/references/test-stability.md) when dynamic behavior, retries, or flakiness needs deeper analysis;
- [`code-generation-checklist.md`](../playwright-guidelines/references/code-generation-checklist.md) for a complex generated check before final review;
- [`laravel-test-data-setup.md`](../playwright-guidelines/references/laravel-test-data-setup.md) only when existing safe seeders or fixtures are insufficient and a testing-only Laravel setup is being considered;
- the full [`playwright-guidelines`](../playwright-guidelines/SKILL.md) only when a complex temporary check materially reuses permanent E2E Page Objects, fixtures, or data patterns.

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

Portable command:

```bash
BROWSER_CHECK_RUN_DIR="{run-dir}" npm run test:browser-check
```

In this repository's local Docker environment, run the same script through the Playwright service and pass the run directory explicitly:

```bash
docker compose --profile e2e run --rm \
  -e BROWSER_CHECK_RUN_DIR="{run-dir}" \
  playwright npm run test:browser-check
```

Stored authentication is opt-in. Set `plan.environment.useAuthState` to `true` and add
`-e BROWSER_CHECK_USE_AUTH_STATE=true` only when the planned check requires
`playwright/.auth/user.json`; the command fails if the plan, runtime setting, or requested state does
not match. Omit the plan field or set it to `false` for guest checks and checks that authenticate
explicitly, and leave the runtime option unset.

The temporary configuration accepts only localhost, loopback addresses, or the repository's Docker
`nginx` host, and the plan must explicitly declare a non-production `appEnvironment`. This is a
local-origin restriction plus a plan assertion, not an independent signal from the application's
real deployment environment. Do not bypass it to target staging or production; use a separately
approved human or environment-specific process instead. Temporary execution is fixed to Chromium,
`ja-JP`, and `Asia/Tokyo`.

The package script validates the plan revision and generated source, then atomically claims the run
before it starts Playwright. The claim binds the plan, generated source, preflight Git revision,
canonical runtime base URL, and stored-authentication selection. The configuration verifies those
bindings, including a SHA-256 hash of the opted-in authentication state. The exact preflight and
postflight runtime object contains `baseUrl`, `useAuthState`, `browser`, `locale`, and `timezone`;
it contains `authStateHash` only when `useAuthState` is true. After Playwright exits normally, the
wrapper rechecks the plan, generated source,
runtime, and revision, then atomically records postflight integrity and the exit code. A missing
postflight record means the artifacts are not finalizable evidence; a nonzero recorded exit can
support a fail or blocked classification but never a pass. The wrapper refuses stale plans, a prior
claim, or a run directory that already contains Playwright execution output. Never invoke the
Playwright configuration directly and never rerun into an old run to replace JSON, traces,
screenshots, or reports; create a fresh timestamped run and copy only the still-applicable plan
intent into it.

The wrapper accepts only the optional `--headed` flag. Do not override workers, retries, trace,
reporters, output paths, timeouts, or the configuration from the command line.

### Temporary Test Rules

- Use TypeScript and make the only import exactly the unaliased named values `test` and `expect`
  from the repository root `playwright.browser-check.fixture.ts` through its canonical relative
  path. Comments and strings are not imports, and helper modules, dynamic imports, `require`, Node
  network APIs, and alternate Playwright browser/context/request fixtures are rejected.
- Call `test(...)` directly with exactly a static title and inline arrow callback. The title must
  contain exactly one bounded planned `playwright-temporary` check ID. Use only direct
  `expect(...)` and `expect.poll(...)` assertions; do not alias, destructure, extend, configure,
  bind, or derive either imported API.
- Request only `{ page }` in each inline `test(...)` callback. Use Playwright assertions and
  automatic `artifacts/` capture instead of importing filesystem evidence helpers.
- Make the callback's first statement a direct static `page.goto(...)`. Its canonical destination
  must exactly equal the same titled check's planned `target.url`, including query and fragment.
  Generate exactly one test for every planned temporary check.
- Prefer `getByRole`, `getByLabel`, `getByPlaceholder`, and stable visible text.
- Use `getByTestId` only when no suitable user-facing locator exists.
- Never use arbitrary `waitForTimeout`.
- Use Web-first assertions and rely on auto-waiting.
- Keep each check independently diagnosable.
- Reuse an existing Page Object only when it materially reduces duplication.
- Do not build a permanent Page Object for a one-off check.
- Do not place or copy temporary code under `tests/e2e/tests/`.
- Use traces and screenshots as evidence, not substitutes for assertions. Automatic Playwright
  artifacts remain under `artifacts/`. An intentional screenshot is allowed only as a direct awaited
  top-level test statement using
  `.screenshot({ path: "..." })` call with an inline object and one new, unique, repository-relative
  static `.png` path beneath this run's exact `evidence/screenshots/` directory.
- Do not accept raw Playwright codegen output without objective assertions.
- Keep every HTTP request, API request, WebSocket, popup, and top-level navigation on the configured
  approved HTTP(S) origin. `about:`, `data:`, `file:`, and any final page outside that origin are
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
2. existing authentication setup or safe stored testing state;
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
