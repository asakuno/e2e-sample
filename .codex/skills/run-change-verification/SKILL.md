---
name: run-change-verification
description: Orchestrate change-scoped verification for a pull request, branch, diff, or requested modification. Use it to classify and coordinate existing automated tests, change-only agent-browser or temporary Playwright checks, supplied human checks, trustworthy evidence review, issue classification, and permanent E2E promotion recommendations without automatically changing product code or growing the regression suite.
---

# Run Change Verification

## Overview

Verify a concrete change without assuming every browser-level check belongs in the permanent Playwright suite.

Coordinate these skills in order:

1. [`create-change-verification-plan`](../create-change-verification-plan/SKILL.md)
2. [`execute-browser-checks`](../execute-browser-checks/SKILL.md)
3. [`record-human-browser-check-results`](../record-human-browser-check-results/SKILL.md) when human results are supplied
4. [`review-browser-check-results`](../review-browser-check-results/SKILL.md)
5. [`promote-browser-checks-to-e2e`](../promote-browser-checks-to-e2e/SKILL.md)

Preserve the distinction between permanent regression tests, change-only checks, exploratory observations, human-only checks, and concerns already covered by lower-level tests.

## Required References

Read all four references before running the workflow. Each reference is a direct contract; do not infer replacement values.

| Reference | Purpose |
|---|---|
| [`artifact-contract.md`](references/artifact-contract.md) | Directory layout, identifiers, schemas, enums, and source-of-truth rules |
| [`driver-selection.md`](references/driver-selection.md) | Test-layer and execution-driver decisions |
| [`evidence-policy.md`](references/evidence-policy.md) | Evidence required for each driver and status |
| [`promotion-policy.md`](references/promotion-policy.md) | Permanent E2E promotion criteria and approval boundary |

## Inputs

Identify as many of these as are available:

- pull request or issue identifier;
- branch, comparison ref, or diff;
- changed files and affected behavior;
- requirements and acceptance criteria;
- routes, screens, and state transitions;
- existing unit, feature, component, and E2E tests;
- available environment and browser driver;
- requested evidence level.

Do not invent acceptance criteria. Ground expectations in user instructions, specifications, tests, or implementation contracts. Record absent or conflicting expectations as specification gaps.

## Workflow

### 1. Resolve the change

Resolve the stable change ID using the artifact contract's priority order. Summarize:

- changed behavior;
- affected routes and files;
- relevant existing coverage;
- comparison refs and assumptions.

Resolve and record the base SHA, current HEAD SHA, and worktree fingerprint defined by the artifact
contract. Evidence from another fingerprint is stale even when the branch name is unchanged.

Create a new append-only run directory. Never reuse or overwrite a prior run.

### 2. Create the plan

Load `create-change-verification-plan` and write `plan.json` plus `plan.md`.

Classify every concern by:

- test responsibility;
- asset lifecycle;
- execution driver;
- evaluation mode;
- priority;
- objective expected results;
- required evidence;
- promotion candidacy.

Do not execute a pass/fail browser check with an unsupported expectation. Reclassify it as observation-only or record a specification blocker.

### 3. Execute selected existing tests

Run feasible commands selected by the plan. Record:

- exact command;
- exit code;
- selected files or filters;
- pass/fail summary;
- infrastructure blockers.

Do not silently install dependencies, browsers, or other tooling. Do not modify product code just to make verification pass.

### 4. Execute browser checks

Load `execute-browser-checks` for checks whose driver is `agent-browser` or `playwright-temporary`.

Do not send `human` checks to browser automation. Keep unrelated verification lanes running when one lane is blocked.

### 5. Record human results

Load `record-human-browser-check-results` only when the user supplies results or requests an execution checklist.

Keep unexecuted human checks as `not_run`. Never fabricate an executor, timestamp, environment, action, evidence, or result.

### 6. Review the results

Load `review-browser-check-results`. Require the review to:

- account for every planned check exactly once;
- verify same-run evidence completeness;
- reject unsupported passes;
- distinguish product, test-data, check-script, environment, and specification failures;
- identify observations separately;
- issue an explicit overall verdict.

### 7. Assess permanent E2E promotion

Load `promote-browser-checks-to-e2e` and write recommendations to `promotion.md`.

Remain in recommendation mode unless the user explicitly requests implementation. Do not create or modify files under `tests/e2e/specs/` or `tests/e2e/tests/` merely because a browser check succeeded.

### 8. Complete the run

Produce or update:

- `result.json` and `result.md`;
- `review.md`;
- `promotion.md`;
- `issues.md`.

Validate the machine-readable contract and same-run evidence before reporting completion:

```bash
npm run validate:change-verification -- "{run-dir}"
```

Run this final validation from the repository host. Revision validation requires the host Git
worktree; the application container is not an equivalent completion gate when it has no Git
metadata.

Do not report the run complete when validation fails. Correct the current run only when it has not yet been finalized; otherwise preserve it and create a new append-only run.

Report existing-test results, browser results, human status, issues, blockers, not-run checks, promotion recommendations, and exact artifact paths.

## Continuation Rules

Continue independent lanes as far as meaningful when another lane is blocked.

- If no browser-agent tool exists, use temporary Playwright only for deterministic checks.
- If Playwright or its browser is unavailable, record an `environment-defect` blocker.
- If required data is absent or invalid, record `test-data-defect` rather than changing expectations.
- If the expected behavior is unclear, record `specification-gap`.
- If human execution is absent, keep `not_run`.
- If the target route is unavailable, classify from evidence as `environment-defect`, `product-defect`, or `specification-gap`; do not guess.

## Boundaries

- Do not modify product code unless the user explicitly asks for a fix.
- Do not add or update dependencies without explicit approval.
- Do not add permanent E2E tests automatically.
- Do not place temporary Playwright files under `tests/e2e/tests/`.
- Do not use production data, credentials, accounts, or environments.
- Do not create test-only HTTP backdoors or generic raw-SQL inputs.
- Do not perform destructive reset outside `APP_ENV=testing`.
- Do not treat subjective impressions as pass/fail assertions.
- Do not hide blocked, not-run, observation, or unsupported checks.
- Do not claim completion while required evidence is missing.

## Completion Criteria

Finish only when:

- every planned check has one terminal result;
- every pass has sufficient same-run evidence;
- every fail has a defensible issue classification and priority;
- every blocked or not-run check has a concrete reason and next action;
- JSON and Markdown artifacts are internally consistent;
- the review verdict and promotion recommendation are explicit;
- every artifact path and executed command is reported.
