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
| `playwright-temporary` | Playwright JSON result, trace, and either a successful screenshot or explicit assertion output                                        |
| `human`                | Executor, execution time, environment or device, actual result, and supplied evidence or an explicit permitted evidence-waiver reason |
| `not-required`         | Analysis rationale; use status `not_required`, not pass                                                                               |

An evidence file must be readable, relevant to the expected result, and attributable to the current run. A path alone is not proof when the referenced content is unrelated or contradictory.

Record existing-test command details in `results[].testExecution` and passing human metadata in `results[].humanExecution`, as defined by the artifact contract. These structured fields keep JSON authoritative; Markdown command logs and human notes are projections and supporting evidence.

## Evidence Paths

- Store evidence below the current run directory.
- Record paths relative to the run directory using forward slashes.
- Never record absolute workstation or container paths in `plan.json` or `result.json`.
- Do not reference a prior run as current pass evidence.
- Keep Playwright automatic output under `artifacts/` and its JSON and HTML reporters at the run root.
- Use `evidence/` for intentionally captured screenshots, console, network, and notes.
- Use `traces/` only for explicitly exported trace files; a trace may remain under `artifacts/` when Playwright generated it there.

## Screenshots

Use this naming pattern for intentional screenshots:

```text
evidence/screenshots/{check-id}-{stage}-{run-id}.png
```

Use lowercase stages such as `before`, `after`, `error`, or `viewport-390x844`.

- Capture before and after when a state transition matters.
- Prefer the smallest region that proves the result while retaining enough context to identify it.
- Add a text or DOM record when an image alone cannot prove the result.
- Do not request a screenshot mechanically when a command log, assertion, network record, or trace is more probative.

## Playwright Traces, Screenshots, and Video

Temporary Playwright uses:

- `trace: 'on'`;
- `screenshot: 'on'`;
- `video: 'retain-on-failure'`.

Keep successful traces because change-only verification may require positive evidence. Treat trace and screenshot capture as supporting evidence, not substitutes for Web-first assertions.

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
`playwright-results.json`, `.browser-check-run.json`, or executed temporary result activates report
validation, so removing `playwright-results.json` from `results[].evidence` cannot bypass leaf,
root-error, or statistics checks. A `not_run` temporary result must not coexist with a report or
claim. Execution artifacts and executed results require the wrapper claim, and any report or
temporary evidence requires an integrity-complete postflight whose hashes, revision, runtime, and
exit code agree with the final artifacts.

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
- inspect trace, network, and storage-state artifacts because they may contain cookies or page data;
- do not commit evidence under the ignored run directory.

If redaction would destroy probative value, mark the check blocked or document an approved evidence-waiver reason. Never preserve secrets merely to obtain pass evidence.

## CI Retention

When change verification runs in CI, upload the complete run directory as a restricted artifact with the repository's appropriate retention policy. Do not make CI execution automatic as part of an ordinary local run and do not edit CI unless explicitly requested.

Validate and sanitize evidence before upload. Retention does not change the append-only or same-run rules.

## Unsupported Evidence

Reject or downgrade pass when:

- a required file is missing;
- evidence belongs to another run;
- the screenshot does not show the expected state;
- only navigation or absence of exceptions was observed;
- trace, console, or network data contradicts the claim;
- the expectation is subjective or unspecified;
- human executor or environment details are fabricated or absent.
