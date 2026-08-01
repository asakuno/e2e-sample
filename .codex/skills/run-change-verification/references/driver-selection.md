# Driver Selection

## Contents

1. [Decision order](#decision-order)
2. [Driver guidance](#1-existing-test)
3. [Repository examples](#repository-examples)
4. [Quality gate](#quality-gate)

## Decision Order

Evaluate concerns in this order and stop at the smallest layer that provides reliable confidence:

1. a sufficient existing test;
2. a new lower-level automated test;
3. a permanent E2E regression test;
4. an agent-browser change-only check;
5. a temporary Playwright check;
6. a human check;
7. no additional verification.

Do not equate browser execution with permanent lifecycle. Record responsibility, lifecycle, and driver independently. Then set `evaluationMode` to `objective`, `observation`, or `not-required`; never invent a pass/fail contract for subjective or exploratory work.

## 1. Existing Test

Choose `existing-test` when a current PHPUnit, feature, component, or permanent Playwright test directly proves the changed contract.

Record the exact command, filter or file, exit code, and result. Do not add a browser check when existing coverage is sufficient unless the run is an explicitly labeled framework demonstration.

## 2. New Lower-Level Automated Test

Delegate to unit, feature, or component coverage when the concern is deterministic business logic or can be isolated below the UI. Typical examples include:

- validation combinations and boundaries;
- authorization, persistence, and repository filters;
- DTO and Inertia prop mapping;
- dates and timezone calculations;
- API response parsing;
- prompt-version branching;
- detailed display branches and error-code matrices.

Describe the delegated target in the plan. Do not invent a new execution-driver value for future work.

## 3. Permanent E2E

Recommend permanent E2E only for stable, repeatable, business-critical flows that cross meaningful integration boundaries and cannot be covered equivalently below the browser.

If a permanent test already exists, execute it as `existing-test` with lifecycle `regression`. If a new permanent test is proposed, record it as promotion or delegated work and require explicit approval before implementation.

## 4. Agent Browser

Choose `agent-browser` with lifecycle `change-only` or `exploratory` for:

- responsive layout and primary-action availability;
- focus, keyboard, and accessibility exploration;
- simultaneous DOM, console, and network inspection;
- one-time investigation;
- steps that are not stable enough for deterministic automation.

Use `observation` when there is no objective expected result.

## 5. Temporary Playwright

Choose `playwright-temporary` with lifecycle `change-only` when:

- steps and expected results are objective;
- repeated execution during the change is useful;
- Web-first assertions and trace evidence add confidence;
- permanent maintenance is not justified.

Generate code only under the run's `generated/` directory.

## 6. Human

Choose `human` with lifecycle `human-only` for:

- real-device-only behavior;
- CAPTCHA or real external identity;
- real email or notification delivery;
- environments inaccessible to the agent;
- subjective design or usability approval;
- required legal or business judgment.

Never fabricate execution. Keep it `not_run` until a person supplies a complete record.

## 7. Not Required

Choose `not-required` only after documenting why no additional execution is needed. Use result status `not_required`, not pass.

## Repository Examples

| Area | Concern | Preferred allocation | Rationale |
|---|---|---|---|
| Auth | Request validation and credential rejection matrix | Existing or new feature tests | Deterministic server behavior does not need many browser paths |
| Auth | Stable sign-in redirect across Laravel, session, Inertia, and React | Existing permanent E2E, executed as `existing-test` | A representative cross-boundary flow has regression value |
| Stocks | Repository symbol and market filters | Existing or new feature test | The failure is isolated below the UI |
| Stocks | One-off search pending-state transition with stable labels | `playwright-temporary` when component coverage is insufficient | Assertion and trace evidence help during the change without permanent cost |
| Watchlist | Authorization and persistence | Existing or new feature test | Server contracts provide stronger, cheaper evidence |
| Watchlist | Keyboard focus after an Inertia mutation | `agent-browser` | Focus and navigation diagnostics are browser-specific and exploratory |
| Dashboard | Responsive access to primary navigation | `agent-browser` | Viewport and interaction inspection matter; subjective impressions stay observations |
| Dashboard | Deferred-prop loading contract already covered by a permanent test | `existing-test` | Reuse direct regression coverage |
| News | Only one article remains expanded | Existing component test first; `playwright-temporary` only for an explicit real-browser demonstration or integration risk | Avoid duplicating sufficient component coverage by default |
| News | Whether spacing feels balanced | `human` or `agent-browser` with `observation` | No objective pass criterion exists without a design specification |

## Quality Gate

Before selecting a browser driver, confirm:

- the concern maps to a concrete changed risk;
- existing coverage was inspected;
- the expected result is grounded and observable;
- lower-level coverage cannot provide equivalent confidence;
- lifecycle is not inferred from the tool;
- the evidence requirement is proportional;
- human and exploratory work is not mislabeled as deterministic pass/fail.
