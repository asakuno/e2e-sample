---
name: record-human-browser-check-results
description: Create human browser-check instructions or normalize user-supplied execution results into the change-verification artifact contract. Use it for checks that require a real person, device, external identity, subjective approval, or inaccessible environment, validating evidence and completeness without fabricating execution.
---

# Record Human Browser Check Results

## Overview

Handle verification that must be executed by a person. Generate a checklist, import completed results, normalize them into the shared contract, and expose missing information.

Never pretend a human check was executed.

## Required References and Inputs

Read:

- [`artifact-contract.md`](../run-change-verification/references/artifact-contract.md);
- [`evidence-policy.md`](../run-change-verification/references/evidence-policy.md);
- the current `plan.json` and its human-only rows;
- user-supplied notes and evidence;
- supplied environment details;
- relevant specifications.

Do not use browser automation under this skill.

## Checklist Generation

For each human check, provide:

- check ID;
- purpose and risk;
- preconditions;
- required environment or device;
- concrete steps;
- grounded expected result;
- required evidence or an allowed evidence-waiver reason;
- safety and privacy notes;
- result fields.

Use this template:

```markdown
| Check ID | Status | Executor | Executed At | Environment | Actual Result | Evidence | Issue |
|---|---|---|---|---|---|---|---|
```

Allow only:

- `pass`
- `fail`
- `blocked`
- `not_run`
- `observation`

Keep the row `not_run` until the user supplies an actual execution record.

## Result Import

When the user supplies results:

1. match each row to one planned check ID;
2. validate the status;
3. validate the executor and execution time;
4. validate the environment or device;
5. validate the actual result against every expected result;
6. validate required evidence or a permitted evidence-waiver reason;
7. classify and reference issues;
8. update the current `result.json` and `result.md` projection.

For every supplied execution status (`pass`, `fail`, `blocked`, or `observation`), record:

```json
{
  "humanExecution": {
    "executor": "supplied identity or role",
    "executedAt": "2026-07-30T12:30:00+09:00",
    "device": "supplied environment or device",
    "evidenceWaiverReason": "include only when the plan permits a defensible waiver"
  }
}
```

Do not add `humanExecution` to an unexecuted `not_run` result. Instead, record `blocker.reason` and `blocker.nextAction`. Accept `humanExecution.evidenceWaiverReason` only when the planned check already contains a defensible plan-level `evidenceWaiverReason`. A human fail still requires issue evidence sufficient to support classification; do not use a waiver to fabricate a defect.

Do not retain `pass` when required information or evidence is missing. Keep the result incomplete and state exactly what is needed.

## Subjective Checks

Use `observation` for subjective usability, visual, legal, or business judgment unless the plan contains a formal acceptance rule. Record the observation without inventing an objective pass criterion.

## History and Privacy

- Append a new run for a new human execution; do not overwrite prior human history.
- Use repository-relative evidence paths under the current run directory.
- Redact personal information, tokens, credentials, and other secrets before saving evidence.
- If safe redaction would destroy probative value, record the limitation rather than committing sensitive evidence.

## Boundaries

- Do not fabricate executor, date, environment, action, evidence, or result.
- Do not execute agent-browser or Playwright checks.
- Do not modify product code.
- Do not convert incomplete notes into pass.
- Do not expose personal information or secrets.
- Do not overwrite earlier runs.

## Completion Criteria

Finish when:

- all supplied human results are normalized;
- missing execution remains visible as `not_run`;
- evidence gaps and waiver reasons are explicit;
- issues are classified;
- imported human-result fields and their Markdown projections conform to the artifact contract and
  are ready for orchestration-level review and final validation;
- updated artifact paths are reported.
