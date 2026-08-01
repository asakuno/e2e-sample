---
name: review-browser-check-results
description: Review change-verification plans, results, issues, and browser evidence for completeness, correctness, and trustworthy classification. Use it after execution to reject unsupported passes, detect missing or stale checks, distinguish product defects from data, script, environment, and specification problems, correct current-run classifications, and produce an explicit verdict.
---

# Review Browser Check Results

## Overview

Audit the plan-to-result mapping and underlying evidence. Determine whether the result set is trustworthy; do not merely summarize executor claims.

## Required References and Inputs

Read:

- [`artifact-contract.md`](../run-change-verification/references/artifact-contract.md);
- [`evidence-policy.md`](../run-change-verification/references/evidence-policy.md);
- the current `plan.json`, `plan.md`, `result.json`, `result.md`, and `issues.md`;
- Playwright JSON, screenshots, traces, console, and network evidence;
- supplied human records when present;
- relevant specifications and changed implementation.

Review only the current append-only run. Do not borrow evidence from another run.

## Review Procedure

### 1. Check plan-to-result completeness

Confirm every planned check has exactly one current result. Flag:

- missing or duplicate results;
- unknown check IDs;
- stale results from another run;
- mismatched change or run identity;
- inconsistent summary counts.

### 2. Validate pass evidence

A pass is valid only when:

- expected results are objective and specification-grounded;
- the actual result addresses every expected result;
- all required evidence exists and belongs to the same run;
- no console, network, trace, screenshot, or log evidence contradicts it.

Downgrade an unsupported objective pass to `blocked` or `not_run` as appropriate and explain the
correction. Use `observation` only when the plan already classifies the check with
`evaluationMode: observation`; otherwise preserve the current run and create a replanned run when
observation is the correct classification.

### 3. Validate failures

Require each failure to include:

- reproducible location and behavior;
- expected and actual results;
- evidence;
- an issue classification;
- an appropriate `P0` through `P3` priority.

Reject vague claims such as "did not work."

### 4. Validate blocked and not-run checks

Require each blocked or not-run result to state:

- what prevented execution;
- whether the dependency is environment, data, specification, permission, or human execution;
- exactly what is needed to complete it.

### 5. Validate issue classification

Distinguish:

- product defect;
- test-data defect;
- check-script defect;
- environment defect;
- specification gap;
- observation.

A broken locator or invalid temporary assertion is not a product defect. Preserve uncertainty when evidence cannot isolate the cause.

### 6. Check test-layer allocation

Flag browser checks that belong in unit, feature, component, or permanent E2E coverage. Prevent the browser lane from becoming a catch-all validation layer.

### 7. Produce the verdict

Use exactly one verdict:

- `pass`: all required checks passed and evidence is complete;
- `conditional-pass`: no blocking product defect remains, but explicit low-risk or human checks remain;
- `fail`: a blocking product defect or acceptance failure remains;
- `incomplete`: required checks are blocked, not run, missing, or unsupported.

## Output

Create or update `review.md` with:

- reviewed artifact paths;
- completeness findings;
- evidence findings;
- classification findings;
- test-layer allocation findings;
- corrected summary counts;
- final verdict;
- concrete remaining actions.

Follow the exact corrected-summary line and single backticked verdict block in the
[`artifact-contract.md` canonical Markdown projection](../run-change-verification/references/artifact-contract.md#canonical-markdown-projections). Do not add a second `## Verdict` heading.

Update `result.json` only to correct the current run's unsupported status or classification. Keep the original execution account and evidence paths visible. Never rewrite prior run history.

## Boundaries

- Do not invent missing evidence.
- Do not convert a blocked or missing check into pass.
- Do not classify every technical failure as a product defect.
- Do not modify product code.
- Do not promote checks into permanent E2E during review.
- Do not claim completion when required human or automated checks remain unexecuted.

## Completion Criteria

Finish when:

- every planned check is accounted for exactly once;
- unsupported statuses are corrected;
- issue classifications and priorities are defensible;
- summary counts match current results;
- the verdict is explicit;
- remaining work is concrete and traceable.
