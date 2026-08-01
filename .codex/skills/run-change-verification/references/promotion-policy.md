# Permanent E2E Promotion Policy

## Contents

1. [Default mode and criteria](#default-mode)
2. [Recommendation values](#recommendation-values)
3. [Explicit approval boundary](#explicit-approval-boundary)
4. [Identifiers and adaptation](#permanent-identifiers)
5. [Evidence preservation and completion](#evidence-preservation)

## Default Mode

Produce recommendations only. Do not create or modify permanent E2E specifications, tests, Page Objects, fixtures, or test data unless the user explicitly requests promotion implementation.

`promotionCandidate: true` records planning interest; it is not approval.

## Promotion Criteria

Recommend `promote-now` or `promote-if-repeated` only when several of these are supported by evidence:

- failure would cause high user or business impact;
- behavior crosses meaningful integration boundaries;
- the defect or the same manual/temporary check has recurred;
- lower-level tests cannot provide equivalent confidence;
- setup and expected results are deterministic;
- the scenario is stable and repeatable;
- execution time is acceptable;
- maintenance cost is justified;
- data can be isolated from shared mutable state.

One successful temporary run is not sufficient by itself.

## Non-Promotion Criteria

Do not recommend permanent E2E for:

- a one-time CSS adjustment;
- subjective visual or usability approval;
- temporary migration verification;
- experimental UI behavior;
- unstable third-party systems;
- behavior already covered sufficiently below the browser;
- an expensive or flaky scenario;
- unresolved or invented expectations;
- detailed validation or branching matrices.

## Recommendation Values

Use exactly one value for each non-regression browser check. An existing permanent browser test
uses lifecycle `regression` and is outside the promotion candidate set.

| Value | Meaning |
|---|---|
| `promote-now` | Evidence and risk justify implementing permanent coverage after explicit approval |
| `promote-if-repeated` | Keep change-only now and reconsider after recurrence |
| `keep-change-only` | The check was useful for this change but lacks long-term value |
| `delegate-lower-level` | Unit, feature, or component coverage is the appropriate permanent asset |
| `do-not-automate` | Human or observation-only handling is more trustworthy |
| `needs-specification` | Resolve expectations before any automation decision |

Record rationale, target paths or `not applicable`, test-data needs, lower-level dependencies, and maintenance risk in `promotion.md`.

Use one Markdown table row per non-regression browser check, with the check ID and one exact recommendation value in separate cells. Do not encode multiple checks in one row or place the only recommendation solely in prose.

## Explicit Approval Boundary

Approval must clearly request creation or modification of permanent E2E coverage. A request to verify, review, recommend, or run temporary checks does not grant promotion authority.

After approval:

1. read [`designing-e2e-specs`](../../designing-e2e-specs/SKILL.md);
2. read [`playwright-guidelines`](../../playwright-guidelines/SKILL.md) and its required references;
3. create or update the domain E2E specification under `tests/e2e/specs/`;
4. create or update the test under `tests/e2e/tests/`;
5. reuse stable existing Page Objects, fixtures, and test data;
6. add requirement and change-check traceability;
7. run the relevant permanent E2E and project quality gates;
8. preserve the original run artifacts unchanged.

Do not run the full `designing-e2e-specs` workflow for every change-only check. Use it only in explicit promotion mode.

## Permanent Identifiers

Assign the promoted test a stable domain ID, for example `NEWS_SEARCH_003`. Do not use the `BC-*` identifier as its only permanent ID.

Record the relationship in the permanent specification:

```text
Change-only check: BC-PR10-002
Permanent E2E test: NEWS_SEARCH_003
```

The relationship provides traceability without changing the historical run.

## Adapt Temporary Work

Do not copy temporary source unchanged. During promotion:

- replace exploratory locators with stable accessible locators;
- derive assertions from the permanent specification;
- remove run-directory assumptions;
- use deterministic permanent fixtures or scenarios;
- fit existing Page Object and test conventions;
- eliminate redundant steps and evidence-only code;
- confirm isolation, runtime, and CI behavior.

## Evidence Preservation

Keep the original `plan.json`, `result.json`, temporary source, screenshots, traces, issues, review, and promotion decision as append-only historical evidence. Do not rewrite the old recommendation after promotion; record the permanent relationship in the new specification and current work instead.

Do not commit ignored change-verification artifacts solely because promotion occurred.

## Completion

Recommendation mode is complete when every eligible check has a supported recommendation and rationale.

Explicit promotion mode is complete only when the permanent specification and test are implemented, reviewed, executed, and traceable, with original evidence preserved.
