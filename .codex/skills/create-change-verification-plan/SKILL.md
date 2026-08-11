---
name: create-change-verification-plan
description: Analyze a pull request, branch, diff, feature change, or bug fix and create a risk-based change-verification plan. Use it before execution to choose the smallest reliable set of existing tests, lower-level additions, permanent E2E candidates, change-only browser checks, temporary Playwright checks, human checks, observations, or explicitly unnecessary work.
---

# Create Change Verification Plan

## Overview

Create a change-scoped plan before executing checks. Select the smallest reliable verification set that addresses the risks introduced by the change; do not maximize check count.

## Required References

Read these shared contracts before planning:

- [`artifact-contract.md`](../run-change-verification/references/artifact-contract.md)
- [`driver-selection.md`](../run-change-verification/references/driver-selection.md)
- [`evidence-policy.md`](../run-change-verification/references/evidence-policy.md)
- [`promotion-policy.md`](../run-change-verification/references/promotion-policy.md) when assessing promotion candidacy

## Inputs

Gather:

- user instructions;
- pull request, branch, or diff;
- changed files and symbols;
- requirements and acceptance criteria;
- affected routes, screens, and states;
- existing PHPUnit, feature, frontend, and Playwright tests;
- related E2E specifications, helpers, fixtures, and seeders;
- product risks and environment constraints.

If the source is ambiguous, use available repository context and record the assumption. Do not infer expected behavior from general knowledge.

## Analysis Order

### 1. Understand the behavioral change

Identify:

- what behavior changed and who is affected;
- affected routes, screens, state transitions, and integration boundaries;
- concrete failure risks;
- evidence that would prove or disprove the change.

### 2. Inspect existing coverage

Search existing unit, feature, component, permanent E2E, E2E specification, helper, fixture, and seeder assets.

Record whether each existing check actually covers the changed contract. Avoid duplicating sufficient coverage merely to add another lane.
Existing Page Objects may inform locator and behavior analysis, but temporary checks must never
import, call, or execute them or their helper graph.

### 3. Classify test responsibility

Use exactly one value:

- `unit`
- `feature`
- `component`
- `browser`

Keep validation matrices, calculations, mappings, repository conditions, request authorization, persistence, and deterministic branching below the browser layer when possible.

### 4. Classify asset lifecycle

Use exactly one value:

- `regression`
- `change-only`
- `exploratory`
- `human-only`

Do not classify a check as permanent regression merely because it uses a browser.

### 5. Select one execution driver

Use exactly one value:

- `existing-test`
- `agent-browser`
- `playwright-temporary`
- `human`
- `not-required`

Model proposed lower-level tests and permanent E2E work as delegated recommendations; do not invent new driver values.
Record each proposal in the required structured `delegatedWorkItems` array. Use a stable
`DW-{normalized-change-id}-{three-digit-sequence}` ID, exact type and priority, whether it gates the
verdict, its current terminal status, a concrete target and reason, and same-run evidence paths.
Use `requiredForVerdict: false` with `not_required` for recommendations that do not gate this run.
A completed required item must cite the exact structured
`evidence/delegated/{delegated-work-id}.json` execution record; a note or contract file is not
completion evidence. An unresolved required P0-P2 item makes the
run incomplete.

### 6. Select an evaluation mode

Use exactly one value:

- `objective` for a grounded pass/fail contract;
- `observation` for exploratory or subjective findings without invented acceptance criteria;
- `not-required` only with the `not-required` driver.

Keep objective, observation, and not-required outcomes distinct in both JSON and Markdown.

### 7. Define objective expectations

Give every pass/fail check observable expected results, such as:

- a URL changes;
- exactly one card remains expanded;
- a button becomes enabled;
- a specified error appears;
- a request is or is not sent;
- a value persists after navigation;
- no specified console error occurs.

Without a formal rule, keep qualities such as natural layout, pleasant animation, balanced spacing, or ease of use as `observation`.

### 8. Define proportional evidence

Select evidence appropriate to the driver and risk. Do not request screenshots mechanically when command output, DOM state, or sanitized network evidence is more probative. Raw Playwright traces are prohibited because they can retain session headers.

For a human check only, add plan-level `evidenceWaiverReason` when the environment forbids capture and the waiver is defensible. Omit it by default. A later result cannot introduce waiver permission that the plan did not grant.

### 9. Assess promotion candidacy

Set `promotionCandidate` from the shared policy. This flag is a planning signal, not approval to create a permanent test.

## Decision Guidance

Prefer existing or new lower-level tests when the behavior is deterministic, browser behavior adds little confidence, or a failure can be isolated below the UI.

Recommend permanent E2E consideration only when a stable, business-critical flow crosses meaningful boundaries, carries high regression cost, and cannot be covered equivalently below the browser.

Use change-only `agent-browser` for exploratory UI, responsive layout, focus, keyboard behavior, browser diagnostics, or one-off investigation.

Use `playwright-temporary` when steps and expectations are deterministic, Web-first assertions and focused evidence are useful, repetition during the change is likely, and permanent maintenance is unjustified.

Use `human` for real devices, CAPTCHA, external identity, real email or notification, inaccessible environments, subjective approval, or required legal/business judgment.

Use `not-required` only after documenting why existing evidence or lack of introduced risk makes an additional check unnecessary.

## Output

Create `plan.json` as the machine-readable source of truth and `plan.md` as its projection under the current run directory.

Follow the exact table columns, per-check headings, and planning-context headings in the
[`artifact-contract.md` canonical Markdown projection](../run-change-verification/references/artifact-contract.md#canonical-markdown-projections).

Include:

- change, affected files, and routes;
- resolved base SHA, current HEAD SHA, and tracked-plus-untracked worktree fingerprint;
- risk summary;
- selected existing-test commands;
- browser and human check rows;
- concerns delegated to lower-level or permanent tests;
- explicitly unnecessary checks;
- assumptions and specification gaps.

Generate the revision object from the repository root with:

```bash
node .codex/skills/run-change-verification/scripts/revision-fingerprint.mjs "{base-ref}"
```

Do not hand-copy or approximate the worktree fingerprint.

Use stable IDs in this format:

```text
BC-{normalized-change-id}-{three-digit-sequence}
```

Use `planned` only as a nonterminal plan status. It is not an allowed `result.json` status.

Delegated work uses:

```text
DW-{normalized-change-id}-{three-digit-sequence}
```

Follow the artifact contract's exact delegated-work schema, canonical table, and per-item evidence
sections. Do not use the obsolete free-form `delegatedWork` string array.

## Quality Gate

Before finishing, confirm:

- every check addresses a concrete change risk;
- no check duplicates sufficient existing coverage without an explicit demonstration reason;
- every pass/fail check has grounded, objective expectations;
- every check has all three classification axes, one primary driver, and one evaluation mode;
- required evidence is stated;
- human-only work is not assigned to automation;
- change-only work is not silently permanent;
- delegated work has exact structured fields, defensible verdict gating, and a revision-bound execution record for every
  completed required item;
- specification gaps and assumptions are visible;
- IDs are unique and stable within the change.
