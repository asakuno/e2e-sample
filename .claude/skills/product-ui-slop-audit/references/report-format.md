# Audit Report Format

Use this structure. Omit the Findings section only when there are no supported findings; never invent a low-value finding to fill the template.

```markdown
# Product UI Slop Audit

- Target: `resources/js/pages/Dashboard.tsx`
- Scope: Dashboard and directly used presentation components
- Mode: Code audit | Browser-verified audit
- Browser verification: Not performed | Performed at 320×..., 375×..., 414×..., 768×..., 1280×800, 1440×...

## Findings

### [P1][code] Invented performance metric

- Location: `path/to/file.tsx:42`
- Rule: H-01
- Evidence: The UI defines “Accuracy 98%”, while no prop, domain field, fixture, or specification supports it.
- Risk: Users may treat an invented number as factual investment information.
- Recommendation: Remove it, show `—`/an unavailable state, or connect it to a sourced domain field.

### [P2][code] Duplicate action styling bypasses the shared Button

- Location: `resources/js/pages/Analysis/Index.tsx:73`
- Rule: D-02
- Evidence: A local class list reproduces the shared primary action contract.
- Risk: Focus, pending, dark-mode, and future token changes can drift.
- Recommendation: Reuse the established Button/ActionLink pattern, or justify a narrowly scoped variant.

### [P3][needs-browser] Possible excessive containment

- Location: `path/to/file.tsx:88`
- Rule: V-02
- Evidence: A bordered Surface contains several bordered child rows; their rendered independence was not inspected.
- Risk: The hierarchy may flatten if every row reads as a separate card.
- Recommendation: Verify before changing; if rows are not independent, compare dividers or spacing within one surface.

## Strengths

- Existing color tokens are reused.
- Numeric data uses `tabular-nums`.
- Focus-visible and reduced-motion handling are present in source.

## Summary

- P1: 1
- P2: 1
- P3: 1
- Browser verification required: 1 item
- Verdict: Address the trust issue first; verify containment visually before refactoring.
```

## Required fields

Every finding needs:

- one priority: P1, P2, or P3;
- one evidence label: `verified`, `code`, `inferred`, or `needs-browser`;
- exact repository-relative `file:line` location;
- one rule ID;
- concrete evidence;
- user/product risk rather than taste;
- a restrained recommendation that does not silently redesign the product.

If the audit covered only code, write `Browser verification: Not performed`. Do not say contrast, overflow, responsiveness, focus visibility, motion, or hierarchy “passed.” Findings about those rendered qualities must be `inferred` or `needs-browser`.

## Reporting discipline

- Combine multiple manifestations of one root cause where a single remediation owns them.
- Include strengths so established good patterns are preserved.
- Do not use finding count as a quality KPI.
- Do not omit a location or cite a whole directory when a precise line exists.
- Do not use unsupported labels such as “ugly,” “dated,” or “AI-like.”
- Do not prescribe an automatic full redesign.
- Do not mark an unverified concern P1 merely to increase urgency.
