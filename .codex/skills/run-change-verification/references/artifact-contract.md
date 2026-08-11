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
├── .browser-check-artifacts.json
├── .browser-check-execution-error.json   # global pre-report failure path only
├── generated/
│   └── *.check.spec.ts
├── evidence/
│   ├── screenshots/
│   ├── console/
│   ├── network/
│   └── notes/
├── artifacts/
├── videos/
├── playwright-report/
└── playwright-results.json
```

Use `generated/` only for temporary Playwright source. Every file below it must be a
`*.check.spec.ts`; helper modules, generated JavaScript, and other executable files are invalid.
`artifacts/` is Playwright's configured per-test output directory. Raw trace archives are forbidden
anywhere in the run because they can contain cookies and cannot be redacted after postflight
hashing. Automatic trace, screenshot, and video capture stays disabled; write only focused,
sanitized evidence to the approved `evidence/` roots.

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
Each callback must also directly await at least one allowed `expect(...).matcher(...)` assertion
whose subject is `page`, a locator derived from that guarded page, or a value directly derived from
the page. Literal-only assertions, an `expect(...)` call without an allowed matcher, and unawaited
matcher chains do not satisfy the execution contract.
Existing Page Objects may be read only as locator and behavior references. Never import, call, or
execute a Page Object or its helper graph from a temporary check.
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
Git revision. It also records `frontendAssetsHash`, the deterministic hash of the served
`public/build`. Ordinary Docker execution first proves that the mounted `node_modules` and
`vendor` package identities match `package-lock.json` and `composer.lock`, hashes their bounded
installed content (including Composer autoload files), then binds that dependency fingerprint into
the claim, runtime, and asset marker. It rechecks the same fingerprint
after the isolated build and after Playwright. Docker execution promotes a sanitized copy-on-write build into
`{run-dir}/runtime/assets/public/build` and writes its marker under the same run-owned asset
workspace; the trusted host CI smoke uses the repository build and marker. In both cases the
marker must bind the same HEAD and worktree fingerprint. It
also records the complete fixed runtime snapshot. With guest state, both
`runtime` and `postflight.runtime` have exactly this shape:

```json
{
  "baseUrl": "http://localhost:8000/",
  "useAuthState": false,
  "appEnvironment": "testing",
  "databaseConnection": "sqlite",
  "databaseIdentifierHash": "sha256:<64-lowercase-hex>",
  "browser": "chromium",
  "locale": "ja-JP",
  "timezone": "Asia/Tokyo"
}
```

Docker runtime and postflight runtime add exactly one field to that shape:

```json
{
  "dependenciesFingerprint": "sha256:<64-lowercase-hex>"
}
```

The host SQLite smoke must omit this field. Docker must require it and match it to the run-local
frontend asset marker.

The initial fingerprint must equal `storage/framework/browser-check-dependencies.json`. The
recorder creates scripts-disabled npm and plugin/scripts-disabled Composer installations under a
fresh ignored root addressed by the four manifest and lockfile bytes, fingerprints those complete
trees, and writes the marker only after both installs succeed. Docker mounts that attested root
instead of the development `node_modules` and `vendor`. Changing either root manifest, either
lockfile, any installed package byte, or Composer autoload output invalidates the attestation and
blocks Docker startup. Invoking the recorder cannot bless bytes from the development installation.

Reusable authentication state is unsupported because every run receives a fresh database and
unique Docker project. `useAuthState` must remain `false`, `authStateHash` must be omitted, and an
authenticated check must log in explicitly through the testing UI. The configuration must verify every binding and
recompute the revision each time
Playwright evaluates it, including in workers. After any ordinary Playwright exit, the wrapper must
recompute the plan hash, generated-source hash, revision-bound frontend asset hash, runtime
binding, and Git revision, then atomically
write `.browser-check-artifacts.json` and add a `postflight` completion record containing those
hashes, the revision, an explicit runtime snapshot, Playwright's integer exit code, and
`executionArtifactManifestHash`, the SHA-256 hash of the manifest's exact bytes.
A pass requires exit code zero; a nonzero completion record can support trustworthy failure
classification. A global failure before a trustworthy report exists uses the exact
`.browser-check-execution-error.json` contract below and must not receive a report, manifest, or
postflight record. Create a new run ID for every retry. Run, change, output, and evidence paths
must not use symlinks that escape or redirect the repository-owned verification tree.

The final host validator must reopen the claim and independently recompute the raw `plan.json`
hash, generated-source hash, revision-bound frontend asset hash, current revision, canonical
runtime URL, and the required `useAuthState: false` selection. It validates both preflight revision
bindings and every available postflight binding.
The raw wrapper token is intentionally unavailable at final validation, so only the recorded token
hash format can be checked. Because Docker writes a path such as `/app/...` while the host sees the
workspace path, compare `runDir` by its normalized
`test-results/change-verification/{change-id}/{run-id}` suffix rather than by an environment-specific
absolute prefix. A report or referenced temporary-browser evidence requires a completed postflight;
an all-pass temporary execution requires exit code zero, while any failed temporary check requires
a nonzero exit.

The execution-artifact manifest has exactly these root keys and file-entry keys:

```json
{
  "schemaVersion": "1.0",
  "files": [
    {
      "path": "evidence/screenshots/BC-PR10-001-after.png",
      "size": 1234,
      "sha256": "sha256:<64-lowercase-hex>"
    }
  ]
}
```

Sort `files` by simple POSIX lexical path order and keep paths unique. Paths are run-relative,
normalized, and limited to `playwright-results.json` or regular, non-symlinked descendants of
`artifacts/`, `playwright-report/`, `evidence/console/`, `evidence/network/`,
`evidence/screenshots/` and `videos/`. The manifest must list every regular file under
those roots. Recorded sizes and SHA-256 values must match the current bytes. Every
temporary-browser evidence citation, including issue evidence, and `playwright-results.json` must
be present. The manifest does not list itself.

A global no-report failure uses exactly:

```json
{
  "schemaVersion": "1.0",
  "phase": "pre-report",
  "scope": "global",
  "affectedCheckIds": ["BC-PR10-001"],
  "classification": "environment-defect",
  "message": "The Playwright process did not produce a report.",
  "occurredAt": "2026-07-30T03:30:00.000Z"
}
```

Use only `environment-defect` or `check-script-defect`. `affectedCheckIds` is the sorted exact set
of all planned `playwright-temporary` checks. Every affected result is `blocked` with blocker
metadata, no temporary result is pass or fail, and `review.md` uses `incomplete`. The execution
error must be a strict regular-file record and remains bound to the same valid preflight claim,
plan, generated source, runtime, and Git revision. It must not coexist with
`playwright-results.json`, `.browser-check-artifacts.json`, or claim postflight.

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

### Delegated work type

```text
unit-test
feature-test
component-test
permanent-e2e
other
```

### Delegated work status

```text
completed
blocked
not_run
not_required
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
  "delegatedWorkItems": [
    {
      "id": "DW-PR10-001",
      "type": "feature-test",
      "priority": "P2",
      "requiredForVerdict": true,
      "status": "completed",
      "target": "tests/Feature/NewsExpansionTest.php",
      "reason": "The deterministic server contract belongs below the browser layer.",
      "evidence": ["evidence/notes/DW-PR10-001.txt"]
    }
  ],
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
      "evidence": ["Playwright JSON", "owner-bound focused PNG screenshot"],
      "promotionCandidate": false,
      "status": "planned"
    }
  ]
}
```

Require all shown root, change, revision, environment, scope, planning-context, and check fields. Keep `checks[].id` unique. Give every `objective` check at least one grounded expected result. Give every check except `not-required` planned evidence. An `observation` check may keep `expectedResults` empty rather than invent a pass/fail criterion. Empty planning-context arrays are valid, but omitting them is not; JSON must remain the source of truth for delegated work, unnecessary checks, assumptions, and specification gaps. Require `target.url` only for browser-responsibility checks; lower-level and not-required rows may omit it rather than fabricate a browser target.

Every `delegatedWorkItems` entry has exactly `id`, `type`, `priority`, `requiredForVerdict`,
`status`, `target`, `reason`, and `evidence`. Use
`DW-{normalized-change-id}-{three-digit-sequence}` IDs and keep them unique. A completed item with
`requiredForVerdict: true` must cite `evidence/delegated/{delegated-work-id}.json`; a generic note or
another contract file is not completion evidence. The delegated execution record has exactly this
shape:

```json
{
  "schemaVersion": "1.0",
  "delegatedWorkId": "DW-PR10-001",
  "type": "feature-test",
  "target": "tests/Feature/NewsControllerTest.php",
  "revision": {
    "baseSha": "<40-lowercase-hex>",
    "headSha": "<40-lowercase-hex>",
    "worktreeFingerprint": "sha256:<64-lowercase-hex>"
  },
  "command": "php artisan test tests/Feature/NewsControllerTest.php",
  "workingDirectory": ".",
  "selectedTargets": ["tests/Feature/NewsControllerTest.php"],
  "exitCode": 0,
  "summary": "The delegated feature test passed."
}
```

Bind `revision` to the plan, include the delegated target in `selectedTargets`, and require exit
code zero. Use
`requiredForVerdict: false` with `not_required` for recommendations that do not gate this run;
`not_required` is invalid for a required item. Any required P0-P2 item that is not `completed`
forces an `incomplete` verdict. An unresolved required P3 item may support only
`conditional-pass` or `incomplete`.

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
`not-required`) must identify an explicit non-production `appEnvironment`. The temporary
Playwright driver requires exactly `appEnvironment: testing` and accepts only localhost, loopback,
or the isolated Docker host `nginx-browser-check`; ordinary `nginx` is invalid. Operator-created
change-verification plans must use Docker and the raw `http://nginx-browser-check:80` binding.
Only the trusted `continuous-integration` infrastructure smoke may use a raw
`http://localhost:<port>` binding with an explicit port from 1024 through 65535 and its internal
authorization flag. Host execution is configuration-isolated, not an OS sandbox. Temporary
execution is HTTP-only. The wrapper must preserve and compare that execution mode before
canonical URL comparison; it must not use normalization to switch a host plan into Docker mode or
vice versa. The canonical runtime base URL must then equal `environment.baseUrl` after URL
normalization and `nginx-browser-check`-to-`localhost` normalization. Temporary Playwright plans must use browser
`chromium`, locale `ja-JP`, and timezone `Asia/Tokyo`. The preflight and postflight runtime
snapshots also bind `appEnvironment: testing`, `databaseConnection` as `sqlite` or `mysql`, and an
exact `databaseIdentifierHash` SHA-256 value. Docker requires `mysql` and the SHA-256 of
`mysql:mysql-browser-check/browser_check`. The trusted CI host smoke requires `sqlite` and the SHA-256 of
`sqlite:{workspace-relative runDir}/runtime/browser-check.sqlite`. The final host validator
recomputes this identity from the raw plan mode; claim shape and preflight/postflight equality alone
are insufficient.
This is deliberately a local-origin restriction plus a required non-production declaration in the
plan; it is not presented as independent proof of the application's real deployment environment.
`environment.useAuthState` is optional for schema compatibility and defaults to `false`; the
wrapper and validator reject `true`. Runtime authentication selection must remain `false`.

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

Reject empty evidence, symlinks, path aliases, generic contract files, and image extensions whose
bytes do not have the corresponding image signature. When an `agent-browser` pass uses DOM evidence
instead of a valid image, cite exactly `evidence/dom/{check-id}.json` with this shape:

```json
{
  "schemaVersion": "1.0",
  "checkId": "BC-PR10-001",
  "url": "http://localhost:8000/news",
  "capturedAt": "2026-07-30T03:30:00.000Z",
  "content": "A focused accessible DOM snapshot that proves the expected result."
}
```

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
  "evidence": ["playwright-results.json"],
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

Under `## Delegated Work`, use exactly this seven-column order and one exact row per item:

```markdown
| Delegated Work ID | Type         | Priority | Required For Verdict | Status    | Target                                 | Reason                                                       |
| ----------------- | ------------ | -------- | -------------------- | --------- | -------------------------------------- | ------------------------------------------------------------ |
| `DW-PR10-001`     | feature-test | P2       | true                 | completed | tests/Feature/NewsExpansionTest.php    | The deterministic server contract belongs below the browser. |
```

Create exactly one `### \`{delegated-work-id}\`` detail section per item and project every
evidence path under its own section. Use `No delegated work.` when the array is empty. Project
every nonempty unnecessary-check, assumption, and specification-gap value under its matching
heading. Project each selected `existingTestCommands` value verbatim somewhere in the document.

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

Mention every reviewed check ID and delegated-work ID. Project corrected counts with the same order:

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
every unresolved row must therefore use the `human` driver or priority `P3`. Required P0-P2
delegated work that is not completed and a global pre-report execution error both require
`incomplete`; unresolved required P3 delegated work may support `conditional-pass`. Use `pass`
only when no failed or required unresolved work remains.

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
