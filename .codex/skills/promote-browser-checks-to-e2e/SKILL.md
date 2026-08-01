---
name: promote-browser-checks-to-e2e
description: Assess whether successful or repeatedly valuable change-only browser checks should become permanent Playwright regression tests. Use it after review to produce promotion recommendations by default, and enter implementation mode only when the user explicitly requests permanent E2E promotion.
---

# Promote Browser Checks to E2E

## Overview

Evaluate change-only browser checks for long-term regression value. A useful one-time browser check does not automatically justify permanent maintenance cost.

Default to recommendation mode. Implement or modify permanent E2E specifications and tests only after explicit user approval.

## Required References and Inputs

Read:

- [`artifact-contract.md`](../run-change-verification/references/artifact-contract.md);
- [`promotion-policy.md`](../run-change-verification/references/promotion-policy.md);
- the current `plan.json`, `result.json`, `review.md`, and `issues.md`;
- temporary Playwright code and agent-browser evidence;
- existing E2E specifications, tests, and relevant lower-level coverage;
- product requirements and risks.

Do not assess promotion from an unsupported, blocked, subjective, or unresolved check as though it passed.

## Promotion Criteria

Treat a check as a strong candidate when several of these are true:

- failure has high user or business impact;
- behavior crosses meaningful integration boundaries;
- the defect or manual check has recurred;
- lower-level tests cannot provide equivalent confidence;
- setup and expected results are deterministic;
- the scenario is stable and isolated from shared mutable data;
- runtime and maintenance cost are justified.

## Reasons Not to Promote

Do not recommend promotion when the concern is primarily:

- a one-time CSS adjustment;
- subjective visual or usability approval;
- temporary migration verification;
- experimental behavior;
- unstable third-party integration;
- sufficiently covered below the browser layer;
- expensive or flaky to maintain;
- based on unresolved expectations.

## Recommendation Values

Use exactly one per assessed check:

- `promote-now`
- `promote-if-repeated`
- `keep-change-only`
- `delegate-lower-level`
- `do-not-automate`
- `needs-specification`

## Recommendation Output

Create `promotion.md`. For every non-regression browser check, record:

- check ID;
- recommendation and rationale;
- target permanent E2E specification path;
- target Playwright test path;
- required deterministic test-data scenario;
- lower-level coverage dependencies;
- expected runtime, flakiness, and maintenance risks.

Existing permanent browser tests use lifecycle `regression`; they are not promotion candidates and
do not need a second recommendation row.

Use one Markdown table row per non-regression browser check. Follow the exact eight-column order in the
[`artifact-contract.md` canonical Markdown projection](../run-change-verification/references/artifact-contract.md#canonical-markdown-projections). Put the check ID in the first cell and exactly one recommendation value in the second cell so the artifact validator can bind the recommendation to the correct check without interpreting rationale prose.

Use `not applicable` rather than inventing a target path for a non-promotion recommendation.

## Explicit Promotion Mode

Enter this mode only when the user explicitly asks to implement promotion.

1. Read [`designing-e2e-specs`](../designing-e2e-specs/SKILL.md).
2. Read [`playwright-guidelines`](../playwright-guidelines/SKILL.md) and its required references.
3. Create or update the permanent E2E specification.
4. Create or update the permanent Playwright test.
5. Reuse existing Page Objects, fixtures, and test-data assets where appropriate.
6. Trace the permanent test to its requirement and original `BC-*` ID.
7. Run the relevant permanent E2E test and project quality gates.
8. Preserve the original change-verification run unchanged as historical evidence.

Assign a domain-appropriate permanent test ID. Do not retain the `BC-*` identifier as the only permanent ID.

Example:

```text
Change-only ID: BC-PR10-002
Permanent ID: NEWS_SEARCH_003
```

Record that relationship in the permanent specification.

## Boundaries

- Do not promote automatically.
- Do not copy a temporary test unchanged into the permanent suite.
- Do not preserve exploratory or brittle locators.
- Do not create permanent E2E for detailed validation matrices.
- Do not erase or rewrite original change-only evidence.
- Do not promote unresolved or subjective checks.
- Do not treat `promotionCandidate: true` as implementation approval.

## Completion Criteria

Recommendation mode is complete when every eligible check has an explicit value and rationale.

Explicit promotion mode is complete only when the permanent specification and test are implemented, reviewed, executed, and traceable while the original run remains unchanged.
