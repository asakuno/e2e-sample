# Change Verification Artifact Contract

## Contents

1. [Run directory](#run-directory)
2. [Identifiers](#identifiers)
3. [Allowed values](#allowed-values)
4. [`plan.json`](#planjson)
5. [`result.json`](#resultjson)
6. [Issue records](#issue-records)
7. [Canonical Markdown projections](#canonical-markdown-projections)
8. [Source of truth and history](#source-of-truth-and-history)

## Run Directory

Store every run below:

```text
test-results/change-verification/{change-id}/{run-id}/
├── plan.json
├── plan.md
├── result.json
├── result.md
├── review.md
├── promotion.md
├── issues.md
├── .browser-check-run.json
├── generated/
│   └── *.check.spec.ts
├── evidence/
│   ├── screenshots/
│   ├── console/
│   ├── network/
│   └── notes/
├── artifacts/
├── traces/
├── playwright-report/
└── playwright-results.json
```

Use `generated/` only for temporary Playwright source. Every file below it must be a
`*.check.spec.ts`; helper modules, generated JavaScript, and other executable files are invalid.
`artifacts/` is Playwright's configured per-test output directory and may contain screenshots,
videos, and trace archives. Use `traces/` only for explicitly exported or driver-independent trace
evidence; do not move evidence merely to satisfy the tree.

Every generated temporary spec must have exactly one static import: the unaliased named values
`test` and `expect` from the canonical relative path to the repository
`playwright.browser-check.fixture.ts`. The wrapper parses the TypeScript structure, rejects helper
or dynamic module loading, restricts test callbacks to the guarded `page` fixture, and rejects Node
network and alternate Playwright execution surfaces. It permits `test` only as a direct
`test(...)` callee and `expect` only as `expect(...)` or `expect.poll(...)`; aliases, derived APIs,
forbidden binding keys, rest or computed destructuring, and computed property access are invalid.
Each `test(...)` must receive exactly a title and an inline arrow callback.
The title must contain exactly one bounded ID for a planned `playwright-temporary` check, and the
callback must request only `{ page }`. Its first statement must be a direct static
`page.goto("...")` whose canonical URL exactly equals that check's `target.url`, including its
query and fragment. Every planned temporary check must bind to exactly one generated test.
Comments and string literals do not satisfy the import contract. The fixture independently blocks
cross-origin HTTP requests and WebSockets, rejects `about:`, `data:`, `file:`, and other non-HTTP(S)
top-level destinations after initial page creation, checks the final URL of every remaining or
closed page, protects
Playwright API request contexts, and fails attempts to create another browser, browser context,
CDP session, routing policy, or replacement listener policy.

Generated source must not access any member whose name starts with `_`, browser/context/CDP or
routing capabilities, listener-registration/removal methods, raw-code execution methods such as
`evaluate*`, `$eval`, `waitForFunction`, `addInitScript`, `addScriptTag`, `addStyleTag`, or
`setContent`, or filesystem-bearing Playwright methods such as uploads, downloads, PDF, tracing,
attachments, storage state, streams, and video paths. The sole intentional file-writing exception
is a direct awaited `.screenshot({ path: "..." })` top-level test statement with an inline object
and one repository-relative static `.png` path. That path must resolve lexically beneath the current run's exact
`evidence/screenshots/` directory and must be both new and unique in the generated source; indirect
options, absolute paths, traversal, pre-existing targets, and every other `path` property are
invalid.

Never place temporary source under `tests/e2e/tests/` or change the normal Playwright `testDir`.
The normal Playwright suite must use an output directory outside `test-results/change-verification/`
so its startup cleanup cannot erase append-only change-verification history.

## Identifiers

### Change ID

Choose the first available source:

1. pull request: `PR-10`;
2. issue: `ISSUE-123`;
3. normalized branch: `BRANCH-feature-news-filter`;
4. user-provided ID;
5. timestamp fallback.

Normalize branch and user values to ASCII letters, digits, and single hyphens. Trim leading and trailing hyphens. Record the original source in `change.source`.

### Run ID

Use `yyyyMMddHHmmss` in `Asia/Tokyo`, for example `20260730123000`. A run directory is append-only and uniquely identifies one execution attempt.

The `test:browser-check` wrapper must claim a run atomically in `.browser-check-run.json` before
Playwright starts. It must refuse a prior claim or a run that already contains nonempty
`artifacts/`, `playwright-results.json`, or `playwright-report/`. The claim binds the wrapper token,
canonical run path, complete `plan.json` hash, generated-source hash, plan revision, and preflight
Git revision. It also records the complete fixed runtime snapshot. With guest state, both
`runtime` and `postflight.runtime` have exactly this shape:

```json
{
  "baseUrl": "http://localhost:8000/",
  "useAuthState": false,
  "browser": "chromium",
  "locale": "ja-JP",
  "timezone": "Asia/Tokyo"
}
```

When `useAuthState` is `true`, add exactly
`"authStateHash": "sha256:<64-lowercase-hex>"`; omit that key when authentication is disabled.
The wrapper hashes the regular, non-symlinked workspace `playwright/.auth/user.json` before launch,
the configuration recomputes and compares the hash, and postflight recomputes it again. Any
mutation or redirection invalidates the run. The configuration must verify every binding and
recompute the revision each time
Playwright evaluates it, including in workers. After any ordinary Playwright exit, the wrapper must
recompute the plan hash, generated-source hash, runtime binding, and Git revision, then atomically
add a `postflight` completion record containing those hashes, the revision, an explicit runtime
snapshot, and Playwright's integer exit code.
A pass requires exit code zero; a nonzero completion record can support trustworthy failure
classification. Spawn errors, signals, and integrity mismatches must not receive a postflight
record. Create a new run ID for every retry. Run, change, output, and evidence paths must not use
symlinks that escape or redirect the repository-owned verification tree.

The final host validator must reopen the claim and independently recompute the raw `plan.json`
hash, generated-source hash, current revision, canonical runtime URL, and planned authentication
selection. It validates both preflight revision bindings and every available postflight binding.
For authenticated runs it validates the recorded hash shape and exact preflight/postflight equality,
but does not reopen the shared auth file during later final validation because an ordinary E2E setup
may legitimately rotate that file after this run completed.
The raw wrapper token is intentionally unavailable at final validation, so only the recorded token
hash format can be checked. Because Docker writes a path such as `/app/...` while the host sees the
workspace path, compare `runDir` by its normalized
`test-results/change-verification/{change-id}/{run-id}` suffix rather than by an environment-specific
absolute prefix. A report or referenced temporary-browser evidence requires a completed postflight;
an all-pass temporary execution requires exit code zero, while any failed temporary check requires
a nonzero exit.

### Check ID

Use:

```text
BC-{normalized-change-id}-{three-digit-sequence}
```

Example: `BC-PR10-001`. Keep IDs stable within the same change and never reuse one for a different concern.

## Allowed Values

### Test responsibility

```text
unit
feature
component
browser
```

### Asset lifecycle

```text
regression
change-only
exploratory
human-only
```

### Execution driver

```text
existing-test
agent-browser
playwright-temporary
human
not-required
```

Do not add `playwright-test` as a driver. Represent an existing permanent Playwright test as `existing-test` with lifecycle `regression`. Represent a proposed new permanent E2E test as delegated or promotion work, not as a fabricated execution driver.

### Evaluation mode

```text
objective
observation
not-required
```

- `objective` has grounded expected results and may end as pass, fail, blocked, or not-run.
- `observation` has no invented pass/fail criterion and may end as observation, blocked, or not-run.
- `not-required` records analysis rather than execution and must use the `not-required` driver and `not_required` result status.

### Result status

```text
pass
fail
blocked
not_run
observation
not_required
```

- `pass`: every objective expected result is met and required same-run evidence exists.
- `fail`: the verified subject does not meet an objective expected result.
- `blocked`: environment, permission, data, tooling, or specification prevents execution.
- `not_run`: the check is required but has not been executed.
- `observation`: the result is exploratory or subjective and has no pass/fail judgment.
- `not_required`: analysis shows no additional execution is needed.

Use `planned` only in `plan.json`. It is a nonterminal planning marker, not a result status.

### Issue classification

```text
product-defect
test-data-defect
check-script-defect
environment-defect
specification-gap
observation
```

### Priority

```text
P0
P1
P2
P3
```

## `plan.json`

Use schema version `1.0` and this minimum shape:

```json
{
  "schemaVersion": "1.0",
  "change": {
    "id": "PR-10",
    "title": "Example change",
    "source": "pull-request",
    "baseRef": "develop",
    "headRef": "feature/example",
    "summary": "What changed"
  },
  "revision": {
    "baseSha": "1111111111111111111111111111111111111111",
    "headSha": "2222222222222222222222222222222222222222",
    "worktreeFingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
  },
  "environment": {
    "baseUrl": "http://localhost:8000",
    "appEnvironment": "testing",
    "browser": "chromium",
    "locale": "ja-JP",
    "timezone": "Asia/Tokyo"
  },
  "scope": {
    "affectedFiles": ["resources/js/components/features/news/NewsArticleList.tsx"],
    "routes": ["/news"]
  },
  "existingTestCommands": [],
  "delegatedWork": [],
  "unnecessaryChecks": ["A duplicate human check is unnecessary"],
  "assumptions": ["At least two seeded articles exist"],
  "specificationGaps": [],
  "checks": [
    {
      "id": "BC-PR10-001",
      "title": "Only one news card remains expanded",
      "risk": "Multiple cards remain expanded",
      "priority": "P2",
      "responsibility": "browser",
      "lifecycle": "change-only",
      "driver": "playwright-temporary",
      "evaluationMode": "objective",
      "target": {
        "url": "/news",
        "files": ["resources/js/components/features/news/NewsArticleList.tsx"]
      },
      "preconditions": ["At least two news articles exist"],
      "steps": ["Open the news page", "Expand the first and second articles"],
      "expectedResults": ["Only the second article remains expanded"],
      "evidence": ["Playwright JSON", "trace", "screenshot or explicit assertion"],
      "promotionCandidate": false,
      "status": "planned"
    }
  ]
}
```

Require all shown root, change, revision, environment, scope, planning-context, and check fields. Keep `checks[].id` unique. Give every `objective` check at least one grounded expected result. Give every check except `not-required` planned evidence. An `observation` check may keep `expectedResults` empty rather than invent a pass/fail criterion. Empty planning-context arrays are valid, but omitting them is not; JSON must remain the source of truth for delegated work, unnecessary checks, assumptions, and specification gaps. Require `target.url` only for browser-responsibility checks; lower-level and not-required rows may omit it rather than fabricate a browser target.

Record the resolved base SHA, current HEAD SHA, and a `sha256:` fingerprint of the tracked diff plus
all untracked, non-ignored files. Copy the same revision object into `result.json`. The validator
resolves `change.baseRef` again and requires it to equal `revision.baseSha`; it also recomputes HEAD
and the worktree fingerprint. A moved base ref or later code edit therefore makes the run stale
instead of silently reusing old evidence.

Run revision generation and final artifact validation from the repository host, where local Git is
available. These scripts use Node built-ins only. Do not silently weaken revision validation merely
because the application container intentionally lacks Git.

Require at least one check. When analysis concludes that no execution is necessary, retain that
decision as an explicit `not-required` check instead of producing an empty plan. Every executable
browser target URL must be a relative path or resolve to the same origin as
`environment.baseUrl`; a check must not redirect its planned target to another environment.

Automated browser checks (every executable browser-responsibility check except `human` and
`not-required`) must identify an explicit non-production `appEnvironment`. Values such as `prod`,
`production`, and `live` are invalid. The temporary Playwright driver additionally accepts only
localhost, loopback, or Docker `nginx` as its base URL host. Its runtime base URL must equal
`environment.baseUrl` after URL normalization and Docker `nginx`-to-`localhost` normalization.
Temporary Playwright plans must use browser `chromium`, locale `ja-JP`, and timezone `Asia/Tokyo`;
the preflight and postflight runtime snapshots bind the same fixed execution tuple.
This is deliberately a local-origin restriction plus a required non-production declaration in the
plan; it is not presented as independent proof of the application's real deployment environment.
`environment.useAuthState` is optional for schema compatibility and defaults to `false`; set it to
`true` only when the plan explicitly requires `playwright/.auth/user.json`. Runtime authentication
selection must equal this planned value.

A human check may permit evidence waiver only by including a nonempty plan-level `evidenceWaiverReason`. Omit that field for every other check and when waiver is not explicitly justified. A result-level waiver is invalid without this plan permission.

Every `existingTestCommands` entry must match exactly one `existing-test` check's `target.command`, and every such check must appear in `existingTestCommands`. This one-to-one binding prevents selected existing tests from disappearing between plan and result. The result's `testExecution.command` must equal the planned command.

`plan.md` must project the same change, risks, checks, delegated work, explicitly unnecessary checks, assumptions, and specification gaps. It must not introduce checks absent from `plan.json`. Follow the canonical projection format below.

## `result.json`

Use schema version `1.0` and this minimum shape:

```json
{
  "schemaVersion": "1.0",
  "changeId": "PR-10",
  "runId": "20260730123000",
  "revision": {
    "baseSha": "1111111111111111111111111111111111111111",
    "headSha": "2222222222222222222222222222222222222222",
    "worktreeFingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
  },
  "startedAt": "2026-07-30T12:30:00+09:00",
  "completedAt": "2026-07-30T12:32:10+09:00",
  "summary": {
    "pass": 1,
    "fail": 0,
    "blocked": 0,
    "notRun": 0,
    "observation": 0,
    "notRequired": 0
  },
  "issueRecords": [],
  "results": [
    {
      "checkId": "BC-PR10-001",
      "driver": "playwright-temporary",
      "status": "pass",
      "actualResult": "Opening the second article collapsed the first article.",
      "environment": {
        "browser": "chromium",
        "viewport": "1280x720",
        "baseUrl": "http://localhost:8000"
      },
      "evidence": [
        "playwright-results.json",
        "artifacts/example/trace.zip",
        "evidence/screenshots/BC-PR10-001-after-20260730123000.png"
      ],
      "issues": [],
      "executionNotes": ["Executed in the repository Playwright container"]
    }
  ]
}
```

Require one result for every planned check and no unknown or duplicate result IDs. Require `changeId` to equal `plan.change.id`, `runId` to equal the containing directory name, and `revision` to equal the plan revision exactly.

Require each result driver to equal its planned driver and each status to match the planned evaluation mode. Use `not-required` only with `not_required`, and use `not_required` only with `not-required`. Require browser, viewport, and base URL in `results[].environment` only for browser-responsibility checks; omit browser fields for lower-level and not-required rows instead of inventing values. An `existing-test` result also records a structured `testExecution` object with `command`, `workingDirectory`, `selectedTests`, integer `exitCode`, and `summary`. Every supplied human execution (pass, fail, blocked, or observation) records `humanExecution.executor`, `executedAt`, and `device`, plus evidence or `evidenceWaiverReason`; an unexecuted human `not_run` result must not invent these details.

Use all six summary keys. Count `not_run` as `notRun` and `not_required` as `notRequired`. Summary counts must exactly match `results`.

Require every pass to list at least one existing, run-relative evidence path, except an `existing-test` pass supported by structured `testExecution` or a human pass with an explicit permitted `evidenceWaiverReason`. Require every fail to reference at least one classified issue. Every blocked or not-run result must include `blocker.reason` and `blocker.nextAction`; narrative `actualResult` and `executionNotes` remain supporting context.

`executionNotes` is optional for schema compatibility but strongly recommended. It must never replace `actualResult` or evidence.

## Issue Records

Use stable issue IDs in `result.json.issueRecords`, project them into `issues.md`, and reference those IDs from the corresponding `results[].issues`. Use `CVI-{run-id}-{three-digit-sequence}` and record:

- check ID;
- classification;
- priority;
- expected and actual behavior;
- reproduction details;
- evidence paths;
- current disposition.

Each machine-readable record uses this shape:

```json
{
  "id": "CVI-20260730123000-001",
  "checkId": "BC-PR10-001",
  "classification": "check-script-defect",
  "priority": "P2",
  "expected": "The second article expands",
  "actual": "The locator did not resolve",
  "reproduction": ["Run the temporary Playwright check"],
  "evidence": ["artifacts/example/trace.zip"],
  "disposition": "Correct the temporary locator in a new run"
}
```

Require every issue record to be referenced exactly from its check result and every referenced ID to exist. Issue evidence follows the same same-run path and containment rules as result evidence.

A `product-defect` issue must belong to an objective result with `fail` status. Do not attach a
product defect to an observation or pass and then produce a passing verdict; unresolved tooling,
data, environment, and specification causes remain conservatively blocked instead.

Do not classify a broken locator, invalid assertion, expired fixture, or unavailable environment as a product defect without isolating evidence.

## Canonical Markdown Projections

JSON remains the machine-readable source of truth. Markdown uses the following small canonical
surface so the validator can prove that rows and details belong to the correct check instead of
accepting unrelated words elsewhere in a document. Escape a literal pipe inside a table cell as
`\|`. Fenced code blocks are examples only: rows, headings, scalar values, summary counts, verdicts,
and issue fields inside a fence do not satisfy any projection requirement. This exclusion also
applies to CommonMark fences nested in block quotes or list-item containers; container prefixes do
not make fenced example text authoritative. The final validator treats block-quoted and indented
projection lines conservatively as non-authoritative so multiline list-continuation indentation,
ambiguous list padding, or an unterminated container cannot expose hidden projection text.

### `plan.md`

Project every `change`, `revision`, `environment`, and `scope` string. Use exactly this check-table column
order, with one row per check:

```markdown
| Check ID      | Title                               | Priority | Responsibility | Lifecycle   | Driver               | Evaluation Mode | Risk                           | Promotion Candidate | Status  |
| ------------- | ----------------------------------- | -------- | -------------- | ----------- | -------------------- | --------------- | ------------------------------ | ------------------- | ------- |
| `BC-PR10-001` | Only one news card remains expanded | P2       | browser        | change-only | playwright-temporary | objective       | Multiple cards remain expanded | false               | planned |
```

Create exactly one detail section per check using an exact heading such as
`### \`BC-PR10-001\``. Under that heading, project every target URL, target file, target command,
precondition, step, expected result, evidence requirement, and evidence-waiver reason that exists
in `plan.json`.

Use these exact level-two headings even when their arrays are empty:

```markdown
## Delegated Work

## Unnecessary Checks

## Assumptions

## Specification Gaps
```

Project every nonempty array value under its matching heading. Project each selected
`existingTestCommands` value verbatim somewhere in the document.

### `result.md`

Project the change ID, run ID, and revision values. Use exactly this result-table column order, with one row per
result:

```markdown
| Check ID      | Driver               | Status | Actual Result                                           |
| ------------- | -------------------- | ------ | ------------------------------------------------------- |
| `BC-PR10-001` | playwright-temporary | pass   | Opening the second article collapsed the first article. |
```

Create exactly one `### \`{check-id}\`` detail section per result. Project its environment,
evidence paths, issue IDs, execution notes, structured existing-test execution values, supplied
human-execution values, and blocker values under that section. End the summary with this exact key
order and spelling:

```text
Summary counts: pass=1; fail=0; blocked=0; notRun=0; observation=0; notRequired=0
```

### `review.md`

Mention every reviewed check ID. Project corrected counts with the same order:

```text
Corrected summary counts: pass=1; fail=0; blocked=0; notRun=0; observation=0; notRequired=0
```

Write exactly one verdict block, with no competing `## Verdict` heading:

```markdown
## Verdict

`pass`
```

Use `fail` when any acceptance check failed. With no failure but one or more blocked or not-run
checks, use `incomplete`, or `conditional-pass` only when the review has established that the
remaining check is explicitly low risk or human-only. For machine validation, low risk means P3;
every unresolved row must therefore use the `human` driver or priority `P3`. Use `pass` when no
failed, blocked, or not-run check remains.

### `promotion.md` and `issues.md`

Use exactly this eight-column order and one Markdown table row per non-regression browser check in
`promotion.md`. Existing permanent browser tests use lifecycle `regression` and are not promotion
candidates, so do not fabricate a second promotion decision for them:

```markdown
| Check ID      | Recommendation   | Rationale                                              | Target E2E Specification | Target Playwright Test | Test Data                     | Lower-Level Dependencies       | Runtime, Flakiness, and Maintenance Risk                      |
| ------------- | ---------------- | ------------------------------------------------------ | ------------------------ | ---------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `BC-PR10-001` | keep-change-only | Existing component coverage owns the durable contract. | not applicable           | not applicable         | Existing deterministic seeder | NewsArticleList component test | One-off browser proof does not justify permanent maintenance. |
```

The first cell must contain only the check ID, the second must contain exactly one allowed
recommendation value, and every remaining cell must be nonempty. Use `not applicable` instead of
leaving a field blank.

Project every machine-readable issue field into `issues.md`, including reproduction and evidence
values. If there are no issues, state that explicitly. Do not introduce stale check or issue IDs
in any projection.

## Source of Truth and History

- Treat JSON artifacts, including `issueRecords`, as the machine-readable source of truth.
- Treat Markdown artifacts as human-readable projections and reviews.
- Keep paths relative to the run directory; do not use absolute workstation paths in JSON.
- Append a new run directory for each attempt.
- Never overwrite or delete prior runs, human history, or evidence.
- Correct unsupported status or classification only in the current run and document the correction in `review.md`.
- Keep generated source and all evidence under ignored `test-results/change-verification/`; do not commit run artifacts.
