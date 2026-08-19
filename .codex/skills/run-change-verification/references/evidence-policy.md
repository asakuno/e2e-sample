# Evidence Policy

## Contents

1. [Core rule and minimum evidence](#core-rule)
2. [Evidence paths](#evidence-paths)
3. [Driver-specific evidence](#screenshots)
4. [Sensitive information](#sensitive-information)
5. [CI retention and rejection](#ci-retention)

## Core Rule

Mark a check `pass` only when every objective expected result is addressed and the required evidence exists inside the same run directory. Opening a page, completing steps without an exception, or reporting that a screen looks acceptable is not pass evidence.

## Minimum Evidence by Driver

| Driver                 | Minimum evidence for pass                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `existing-test`        | Exact command, selected test file or filter, exit code, and result summary                                                            |
| `agent-browser`        | URL plus a focused screenshot or recorded DOM state; console or network evidence when relevant                                        |
| `playwright-temporary` | Playwright JSON result and an owner-bound focused PNG screenshot                                                                         |
| `human`                | Executor, execution time, environment or device, actual result, and supplied evidence or an explicit permitted evidence-waiver reason |
| `not-required`         | Analysis rationale; use status `not_required`, not pass                                                                               |

An evidence file must be readable, relevant to the expected result, and attributable to the current run. A path alone is not proof when the referenced content is unrelated or contradictory.
Image evidence must have a valid signature and nonzero dimensions; renaming text to an image
extension is invalid. An `agent-browser` DOM alternative uses the exact
`evidence/dom/{check-id}.json` schema from the artifact contract rather than an arbitrary text file.

Record existing-test command details in `results[].testExecution` and passing human metadata in `results[].humanExecution`, as defined by the artifact contract. These structured fields keep JSON authoritative; Markdown command logs and human notes are projections and supporting evidence.

## Evidence Paths

- Store evidence below the current run directory.
- Record paths relative to the run directory using forward slashes.
- Reject symlinks, path aliases, and generic contract files presented as evidence.
- Never record absolute workstation or container paths in `plan.json` or `result.json`.
- Do not reference a prior run as current pass evidence.
- Keep Playwright automatic output under `artifacts/` and its JSON and HTML reporters at the run root.
- Use `evidence/` for intentionally captured screenshots, console, network, and notes.
- Raw Playwright trace archives are prohibited because request headers can contain session cookies.

## Screenshots

Use this naming pattern for intentional screenshots:

```text
evidence/screenshots/{check-id}-{stage}-{run-id}.png
```

Use lowercase stages such as `before`, `after`, `error`, or `viewport-390x844`.

- Capture before and after when a state transition matters.
- Prefer the smallest region that proves the result while retaining enough context to identify it.
- Add a text or DOM record when an image alone cannot prove the result.
- Do not request a screenshot mechanically for non-Playwright drivers when a command log, DOM record, or sanitized network record is more probative. A passing `playwright-temporary` check is the exception: it requires one owner-bound focused PNG in addition to the Playwright JSON report.

## Playwright Screenshots and Sensitive Automatic Capture

Temporary Playwright uses:

- `trace: 'off'`;
- `screenshot: 'off'`;
- `video: 'off'`.

Capture only focused, explicitly planned screenshots beneath `evidence/screenshots/`. Raw traces,
automatic screenshots, and video are disabled because they cannot be inspected or redacted before
the wrapper hashes the immutable manifest. Treat screenshots as supporting evidence, not
substitutes for Web-first assertions. If focused console or network evidence is required, sanitize
it before writing the evidence file.

The HTML report is a diagnostic projection. The JSON report and `result.json` remain the machine-readable execution records.

Every Playwright JSON leaf spec must contain exactly one bounded token for a planned
`playwright-temporary` check ID and map to that check's result. A planned ID used only as a longer
ID's prefix is not attribution, and a title or root error containing planned plus unplanned IDs is
ambiguous and invalid. Reject unplanned or duplicate leaves, a passing result backed by a non-clean
leaf, a failing result without an `unexpected` outcome, and a blocked result backed only by a fully
passing leaf. Validate every test outcome, attempt status, and attached error.

Derive each outcome with Playwright's counter algorithm, not from only the final attempt:
`interrupted` attempts are ignored; `skipped` attempts are ignored except for the separate
expected-skip counter when `expectedStatus` is `skipped`; every other attempt matches only by exact
status equality. Thus `timedOut` is not an expected `failed` result. No expected or unexpected
attempts yields `skipped`; no unexpected attempts yields `expected`; only unexpected attempts with
no expected skip yields `unexpected`; the remaining mixture yields `flaky`.

Require the report's `expected`, `unexpected`, `flaky`, and `skipped` statistics to equal counts
derived from every leaf test, including unplanned leaves. Every root error must contain exactly one
bounded planned temporary-check ID and that check must have a corresponding `blocked` result; an
unattributed global error is not safely assignable merely because some other result is blocked. An
unrelated failing spec invalidates an overall pass; it must never be hidden by selecting only one
successful leaf.

Discover and reconcile temporary execution independently of evidence citations. An existing
`playwright-results.json`, `.browser-check-run.json`, `.browser-check-artifacts.json`, or executed
temporary result activates execution validation, so removing `playwright-results.json` from
`results[].evidence` cannot bypass leaf, root-error, statistics, or manifest checks. A `not_run`
temporary result must not coexist with execution artifacts or a claim. Every ordinary temporary
evidence citation must appear in the exact wrapper manifest, whose recorded path, size, and SHA-256
must match every file under the allowed execution roots. The claim postflight binds the raw
manifest bytes. Execution artifacts and executed results require the wrapper claim, and any report
or temporary evidence requires an integrity-complete postflight whose hashes, revision, runtime,
database identity, and exit code agree with the final artifacts.

When the wrapper cannot produce a trustworthy report, it may instead write the strict global
`.browser-check-execution-error.json` record. It must name every planned temporary check; all of
those results stay `blocked` with blocker metadata and the review remains `incomplete`. This path
uses the valid preflight claim but no report, manifest, or postflight. Reject coexistence rather
than treating a partial report as global-error evidence.

## Console and Network Evidence

Capture console or network evidence only when the expected result or observed failure depends on it.

Suggested names:

```text
evidence/console/{check-id}-{run-id}.json
evidence/network/{check-id}-{run-id}.json
```

Record relevant errors, failed requests, status codes, request method, and sanitized endpoint. Avoid dumping all traffic when a focused record is sufficient.

Do not conclude that a product failed solely from an unrelated console warning or third-party request. Classify the evidence before assigning an issue.

## Existing Test Evidence

Record command evidence in `result.md` or a run note with:

```text
command
working directory or container
selected files or filters
started/completed time
exit code
pass/fail counts
blocker, if any
```

Do not truncate away the failing assertion or infrastructure error required to classify the result.

## Human Evidence

Require executor, timestamp, environment, actual result, and evidence for human pass. Permit an evidence-waiver reason only when the plan explicitly allows one and the reason is defensible, such as a restricted external environment that prohibits capture.

Subjective feedback remains `observation` unless a formal acceptance rule exists.

## Sensitive Information

Before saving or retaining evidence:

- remove passwords, session tokens, API keys, cookies, authorization headers, and personal information;
- avoid production accounts, data, and environments entirely;
- crop or redact unrelated sensitive content;
- inspect network and storage-state artifacts because they may contain cookies or page data;
- do not commit evidence under the ignored run directory.

If redaction would destroy probative value, mark the check blocked or document an approved evidence-waiver reason. Never preserve secrets merely to obtain pass evidence.

## CI Retention

A CI browser smoke used only as a quality gate may discard a successful run after validation. If a
CI run is cited as review evidence, upload its sanitized contract artifacts intentionally with the
repository's restricted retention policy; runtime state and authentication files are never
evidence and must remain excluded. Failure-only diagnostic upload is not proof of a successful
run. Do not make CI execution automatic as part of an ordinary local run and do not edit CI unless
explicitly requested.

Validate and sanitize evidence before upload. Retention does not change the append-only or same-run
rules.

## Unsupported Evidence

Reject or downgrade pass when:

- a required file is missing;
- evidence belongs to another run;
- the screenshot does not show the expected state;
- only navigation or absence of exceptions was observed;
- console or network data contradicts the claim;
- the expectation is subjective or unspecified;
- human executor or environment details are fabricated or absent.
