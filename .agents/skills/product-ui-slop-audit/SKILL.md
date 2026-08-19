---
name: product-ui-slop-audit
description: >
  Read-only audit for existing product UI. Detects generic AI-generated visual
  patterns, excessive containment, weak hierarchy, meaningless decoration,
  design-token drift, inconsistent interaction styling, and finance-product
  trust issues. Use only when the user explicitly asks for an anti-AI-slop
  audit, visual design audit, UI polish review, Hallmark-style audit,
  excessive-card review, or design-system drift review. Do not trigger for
  ordinary UI implementation, architecture review, bug fixing, or
  accessibility-only work.
---

# Product UI Slop Audit

## Purpose

Audit an existing product interface for generic AI-generated visual patterns and gradual design-system drift. This is a final, product-specific quality audit—not a design generator or a substitute for requirements, accessibility review, React/Inertia architecture review, or browser testing.

## Trigger conditions

Use this skill only when the user explicitly requests an anti-AI-slop audit, visual-design or UI-polish audit, Hallmark-style audit, excessive-card/pill review, or visual design-system drift review. Examples include “Audit this product UI for AI-generated design clichés” and “Review visual hierarchy, restraint, and token drift.”

## Non-trigger conditions

Do not load it automatically for ordinary component implementation, bug fixes, API or E2E work, general code review, a one-value CSS change, information architecture alone, performance-only review, or accessibility-only review. A request to implement a pending state belongs to the relevant React, Inertia, and UI skills—not this audit.

## Read-only contract

This skill audits and reports. It must not edit production files, rewrite
components, change tokens, install dependencies, or create a redesign unless
the user explicitly starts a separate implementation task after reviewing the
audit findings.

Audit and remediation remain separate tasks. Recommendations may be specific, but do not apply them during the audit.

## Required references

Read these files for every audit:

- [Anti-patterns](references/anti-patterns.md) for rule IDs and evidence requirements.
- [Project profile](references/project-profile.md) for local sources of truth and false-positive guards.
- [Finance UI checklist](references/finance-ui-checklist.md) when finance data, news, charts, or AI analysis are in scope.
- [Report format](references/report-format.md) before returning findings.
- [Upstream Hallmark](references/upstream-hallmark.md) only for provenance and scope boundaries.

Use `ui-design-guidelines` first when the request also needs a general UI/UX review. Use browser or Playwright guidance only when rendered verification is requested and available.

## Audit workflow

1. **Resolve scope.** Identify the named page, component, PR, or diff. Do not silently expand a targeted request into a repository-wide audit.
2. **Read project context.** Read `resources/css/app.css`, every target file, directly relevant primitives under `resources/js/components/ui`, the applicable layout, and at least one sibling implementation. Read only the necessary portions of adjacent skills.
3. **Classify the UI.** Record whether it is an authenticated dashboard, list/search, detail, form, auth screen, dialog/drawer, reusable component, or data visualization. Apply the matching false-positive guards.
4. **Audit code signals.** Evaluate honest content, design-system coherence, visual restraint, interaction/motion, responsive/readability, hierarchy, and finance trust. Trace suspicious metrics through props, APIs, fixtures, and specifications before calling them invented.
5. **Verify in a browser only when requested or available.** Record exact viewports and states. Otherwise mark rendered questions as requiring verification.
6. **Self-review.** Internally score hierarchy reasoning, product specificity, evidence quality, restraint, actionability, and false-positive control from 1–5. Revise any dimension below 3; do not normally publish these scores.
7. **Return a read-only report.** Consolidate findings that share a root cause, include strengths, and prioritize a small actionable set.

## Evidence levels

- `verified`: observed in the rendered browser or established through an unambiguous data path.
- `code`: directly established by source, such as `transition-all`, a literal color, or missing semantic text.
- `inferred`: a reasoned possibility based on source that is not visually confirmed.
- `needs-browser`: contrast, overflow, wrapping, focus visibility, hierarchy, motion, or another rendered behavior that must be inspected.

Never promote an inference to `verified`. A hard-coded metric is not necessarily invented: trace its source and documented fixture purpose first.

## Project-first rule

The existing product design system is authoritative. Read `resources/css/app.css`,
relevant primitives under `resources/js/components/ui`, the page layout, and at
least one sibling implementation before judging a pattern. Do not apply
marketing-site rules mechanically to authenticated product UI.

Safety and accessibility are hard constraints. User and business requirements are authoritative within those constraints. If requirements conflict with safety or accessibility, surface the conflict instead of suppressing the finding. Then prefer the local design system, cross-screen consistency, product efficiency, this audit's aesthetic rules, and general Hallmark preferences in that order.

## Severity model

- **P1:** trust or misleading content, accessibility or safety risk, inoperable interaction, or major design-system breakage.
- **P2:** damaged hierarchy, shared-component drift, demonstrated responsive failure, excessive decoration, or materially weak product specificity.
- **P3:** localized consistency, typography, spacing, or polish issue with limited user impact.

Do not assign P1 to an unverified visual suspicion. Severity describes user/product risk, not how strongly the reviewer dislikes a style.

## Report format

Follow `references/report-format.md`. Every finding must contain priority, evidence label, `file:line`, rule ID, evidence, risk, and recommendation. State the target, scope, mode, and browser verification status. Include strengths and a count by severity. Do not inflate counts by splitting one cause across multiple findings.

## False-positive guards

- Do not flag cards merely for existing. KPI comparisons, independently actionable records, drill-down targets, scroll boundaries, and dialogs may require containment.
- Do not flag the centered `GuestLayout`, an authentication `Surface`, centered empty states, shared SideNav/TopNav shell, Japanese system fonts, or information-dense analysis screens merely because marketing guidance prefers otherwise.
- Do not ban `StatusBadge`; status, warning, phase, category, and short-attribute identification are valid uses.
- Do not confuse consistent product navigation and page structure with template-like AI output.
- Do not demand lower density, more whitespace, a novel theme per page, eight states for every component, or arbitrary accent-area limits.
- Do not flag `StatCard` without evidence that the comparison or value is misleading or structurally inappropriate.

## Browser verification contract

### Verification honesty

Never claim that contrast, overflow, responsive behavior, focus visibility, or
visual hierarchy passed unless the rendered UI was inspected. When only source
code was reviewed, label those items as inferred or requiring browser verification.

For browser-verified audits, inspect at minimum 320px, 375px, 414px, 768px, 1280×800, and a desktop width of at least 1440px. Record the actual viewport dimensions, route, theme, data state, and interaction state. Check horizontal overflow, action-label wrapping, app-shell collisions, sticky overlap, long finance content, keyboard navigation, focus, loading/error/empty/disabled/pending states, light/dark themes, and measured contrast. If no browser ran, write exactly `Browser verification: Not performed`.

## Prohibited behavior

- Do not modify application files, tokens, dependencies, or generated assets during an audit.
- Do not auto-redesign, add a Hallmark stamp/log/runtime, or vendor Hallmark themes, macrostructures, generation flow, or full gate set.
- Do not invent metrics, sources, user counts, performance claims, investment outcomes, or replacement values.
- Do not report taste-only claims such as “ugly,” “old,” or “AI-looking” without evidence and product impact.
- Do not mechanically ban cards, pills, centered layouts, system fonts, white/black, or established product structures.
- Do not claim accessibility compliance or rendered success from source review alone.
- Do not omit locations, ignore strengths, or prescribe a full redesign when a restrained correction addresses the cause.
