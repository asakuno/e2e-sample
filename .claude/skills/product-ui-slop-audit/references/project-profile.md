# e2e-sample Project Profile

## Product and stack

`e2e-sample` is a finance-oriented product UI built with Laravel 12, Inertia.js v2, React 19, TypeScript, Tailwind CSS v4, Lucide React, Radix UI, and class-variance-authority. Its tests use Playwright and Vitest/Testing Library.

## Sources of truth

Read these before judging a target:

1. `resources/css/app.css` for theme variables, OKLCH tokens, typography, radii, semantic colors, and motion.
2. Relevant primitives in `resources/js/components/ui/`, including existing Button, ActionButton, ActionLink, Surface, StatusBadge, Field, Dialog, and Pagination patterns when present.
3. Layouts in `resources/js/components/layouts/` and the actual layout used by the page.
4. At least one sibling component or page in the same feature directory.

The repository and target files are authoritative; names above describe expected categories and do not prove a component exists. Reuse existing implementations before recommending a new abstraction.

## Accepted product patterns

Do not flag these merely for existing:

- a centered surface on an authentication screen;
- SideNav + TopNav and a consistent application shell;
- KPI-focused StatCards and semantically meaningful Surfaces;
- StatusBadges for states or classifications;
- tables, lists, master-detail layouts, centered empty states, and skeletons;
- dark mode and a Japanese system-font stack;
- 44px interaction targets and `tabular-nums`;
- positive, negative, warning, and information tokens.

Consistency between page headings, filters, lists, and detail views improves learnability; it is not automatically “template-like.” Dense analysis screens may be more efficient than artificially spacious layouts.

## High-value audit signals

Look especially for:

- long page-local Tailwind class lists that recreate Button or Link contracts;
- a Surface containing many additional bordered cards without semantic independence;
- near-identical empty states implemented separately by features;
- divergent interaction styles across rows, filters, and pagination;
- badges used for prose, headings, ordinary links, or decoration;
- inconsistent number, timestamp, period, currency, and unit formatting;
- mobile collisions involving SideNav, TopNav, long news headlines, or public IDs.

Treat visual impact from containment, wrapping, and shell collisions as `needs-browser` until rendered. A repeated style is not automatically abstraction-worthy when it is a single, feature-specific expression or abstraction would obscure ownership.

## Skill boundaries

Use `screen-design-process` to decide content and order, `ui-design-guidelines` for general UX/accessibility/visual requirements, Inertia and async React skills for data and pending behavior, Tailwind guidance for implementation, and Playwright/browser verification for rendered behavior. This skill only returns a read-only, named-finding audit unless a later task explicitly requests remediation.
