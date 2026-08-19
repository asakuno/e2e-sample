# Product UI Anti-patterns

Apply these rules after reading the project profile and local sources of truth. A signal is not automatically a finding: honor each exception and evidence requirement. Recommendations are read-only guidance.

## Honest Content and Trust

## H-01 Invented metrics

### Signal
A user-facing metric, claim, forecast, confidence score, win rate, target price, user count, or performance result has no supporting user input, API/domain field, fixture, or specification.

### Why it matters
Fabricated values can mislead users and are especially harmful in investment analysis.

### Do not flag when
The value has a traceable source, is clearly marked sample data in a non-production fixture, or is an explicitly labeled user-entered scenario.

### Recommendation
Remove it, show `—`/an unavailable state, request real input, or connect it to a sourced field. Never replace it with a more plausible invented number.

### Evidence requirements
Trace the value through props, requests, domain types, fixtures, and specifications. Use P1 only when the unsupported user-facing claim is established.

## H-02 Missing provenance, time, or period

### Signal
Financial data, news, or analysis loses a necessary retrieval time, analysis time, target period, source, currency/unit, timezone, or stale state.

### Why it matters
Correct numbers can still mislead when users cannot tell when, where, or for what interval they apply.

### Do not flag when
The context is unambiguous and the metadata is reliably presented in a shared parent or immediately adjacent region.

### Recommendation
Expose only the metadata needed for correct interpretation, using established formatting patterns.

### Evidence requirements
Identify the missing field and show that no nearby/shared context supplies it. Rendered prominence is `needs-browser` unless inspected.

## H-03 Facts and AI interpretation are conflated

### Signal
Observed prices, filings, or news and AI estimates/commentary share the same label, hierarchy, or certainty without semantic separation.

### Why it matters
Users may mistake inference for sourced fact.

### Do not flag when
Labels, structure, and provenance make the distinction explicit even if both appear in one surface.

### Recommendation
Separate fact and interpretation with clear labels, provenance, timestamps, and restrained hierarchy.

### Evidence requirements
Cite the exact labels and data paths. Visual conflation is `needs-browser` unless rendered.

## H-04 Investment advice is implied

### Signal
Copy presents a buy/sell instruction, guaranteed return, or certain forecast without the product context and qualifications required by the specification.

### Why it matters
It can create unsafe reliance and undermine product trust.

### Do not flag when
The text is a clearly attributed source quotation, user-authored scenario, or appropriately qualified workflow required by the product.

### Recommendation
Use factual, probabilistic language; attribute sources and distinguish scenarios from advice.

### Evidence requirements
Quote only the minimum relevant UI text, cite its location, and account for nearby qualifications.

## Design-System Coherence

## D-01 Local values bypass tokens

### Signal
A component introduces unexplained hex/rgb/hsl/oklch colors, arbitrary brand values, local font families, or motion timing/easing outside the established scale.

### Why it matters
Local literals fork light/dark themes and make future design-system changes unreliable.

### Do not flag when
Dynamic data visualization requires generated values, an external brand asset mandates a color, or the project profile establishes an exception.

### Recommendation
Use an existing semantic token or propose a token only when the concept is reusable and justified.

### Evidence requirements
Cite the literal and the relevant source-of-truth token or absence. Do not assume every Tailwind arbitrary value is a brand drift.

## D-02 Shared component contract is duplicated

### Signal
Page-local classes recreate an established Button, ActionButton, ActionLink, Surface, StatusBadge, Field, Dialog, or Pagination contract.

### Why it matters
Focus, pending, disabled, theme, and future token behavior can diverge.

### Do not flag when
The expression is genuinely feature-specific, appears once, or abstraction would obscure responsibility.

### Recommendation
Reuse the existing primitive/variant or justify a narrowly owned shared variant.

### Evidence requirements
Compare the target with the actual shared component and cite both locations; resemblance alone is insufficient.

## D-03 Icon systems are mixed

### Signal
Emoji, another icon package, or one-off SVGs appear beside the established Lucide/AppIcon system without a semantic need.

### Why it matters
Stroke, alignment, accessible labeling, and visual language drift.

### Do not flag when
A logo, data visualization, nationally standardized symbol, or domain-specific mark is unavailable in the shared set.

### Recommendation
Use Lucide/AppIcon or document the domain-specific exception and accessible name.

### Evidence requirements
Identify both icon sources and verify the element is an icon, not content or a logo.

## D-04 Local variants proliferate

### Signal
Near-identical buttons, cards, links, badges, or empty states differ by small, page-specific class changes.

### Why it matters
Users encounter inconsistent state behavior and maintainers cannot evolve a single contract.

### Do not flag when
The visual difference expresses a real semantic distinction or only one owned use exists.

### Recommendation
Consolidate on an existing variant or define the smallest semantic shared contract.

### Evidence requirements
Cite at least two comparable implementations and describe the unjustified difference.

## Visual Slop

## V-01 Meaningless decoration

### Signal
Gradient text, purple/blue gradients, aurora blobs, glows, floating orbs, sparkle emoji, generic 3D art, unrelated geometry, decorative badges, or fake device/browser frames lack product or brand meaning.

### Why it matters
Decoration competes with financial evidence and makes the product interchangeable with generic SaaS output.

### Do not flag when
The element encodes data, is part of an established brand system, or supports a documented product task.

### Recommendation
Remove it or replace it with a restrained, token-based treatment tied to domain meaning.

### Evidence requirements
Cite the element and establish the absence of semantic/brand purpose; visible dominance is `needs-browser` unless inspected.

## V-02 Excessive containment

### Signal
A bordered or elevated surface contains several additional bordered surfaces without a semantic containment reason.

### Why it matters
The interface becomes visually noisy, hierarchy flattens, and every piece of information competes as a separate card.

### Do not flag when
- The outer surface is a dialog or independently scrollable region.
- The inner surfaces represent independently actionable records.
- The pattern is required to distinguish comparison groups, drill-down targets, or KPI comparisons.

### Recommendation
Try spacing, dividers, section headings, or a single shared surface before adding another containment layer.

### Evidence requirements
Code can establish nesting but not its visual weight. Unless rendered, label the visual concern `needs-browser`.

## V-03 Equal card grids used by default

### Signal
A three- or four-column equal grid contains unrelated information whose importance or task flow is not equal.

### Why it matters
Uniform tiles flatten priority and suggest a generic feature-grid template.

### Do not flag when
Users genuinely compare peer KPIs, records, plans, or equally weighted choices.

### Recommendation
Reflect decision priority with a list, table, master-detail structure, or intentionally unequal hierarchy.

### Evidence requirements
Establish the content roles; perceived hierarchy requires browser verification.

## V-04 Pills and badges used beyond status

### Signal
Headings, prose, normal links, or decorative labels are repeatedly rendered as pills.

### Why it matters
Every label competes as a status and scanning becomes noisy.

### Do not flag when
A short element identifies status, warning, phase, category, filter state, or compact attribute.

### Recommendation
Use ordinary text, headings, or links unless the pill shape communicates a real compact state.

### Evidence requirements
Cite the content and explain why it is not a status/classification; do not ban StatusBadge globally.

## V-05 Centering weakens dense product screens

### Signal
Headings, body text, data, and actions are all centered in an information-dense analysis or list view.

### Why it matters
Scan paths and label/value comparison become inefficient.

### Do not flag when
The target is auth, an empty state, confirmation dialog, or another focused short task.

### Recommendation
Use alignment that supports scanning while retaining intentional centered states.

### Evidence requirements
Class names may support a `code` finding; actual hierarchy and scan impact require rendering.

## V-06 Product specificity is absent

### Signal
The structure could become any SaaS dashboard by replacing copy, while ticker, period, source, timestamp, direction, and finance relationships are not reflected in hierarchy.

### Why it matters
Generic structure obscures the decisions the finance product should support.

### Do not flag when
A generic pattern is the most usable solution and domain context is supplied elsewhere in the task flow.

### Recommendation
Strengthen domain-relevant relationships and remove generic decoration rather than creating novelty for its own sake.

### Evidence requirements
Name the missing domain relationship. This is normally `inferred` or `needs-browser`, not a taste-only code finding.

## Interaction and Motion

## I-01 Broad transitions

### Signal
An interactive element uses `transition-all` rather than naming the properties that should animate.

### Why it matters
Focus, layout, and future property changes may animate unexpectedly.

### Do not flag when
No such broad transition exists; a framework-generated safe equivalent must be evaluated on its actual output.

### Recommendation
Use an explicit transition property and keep focus indication immediate.

### Evidence requirements
A literal `transition-all` or equivalent CSS rule is sufficient `code` evidence.

## I-02 Stacked hover effects

### Signal
One hover simultaneously changes several of scale, translation, rotation, shadow, and color without task feedback requiring them.

### Why it matters
The interaction feels ornamental and can distract from dense data.

### Do not flag when
Multiple changes form one necessary state cue or established control contract.

### Recommendation
Keep the smallest effect that clearly signals interactivity or state.

### Evidence requirements
Cite every simultaneous hover class/property. Perceived excess is stronger after rendering.

## I-03 Focus indication is delayed

### Signal
Focus rings/outlines are included in delayed transitions or appear only after animation.

### Why it matters
Keyboard users need immediate location feedback.

### Do not flag when
A transition affects unrelated properties and focus remains immediate.

### Recommendation
Exclude focus indication from transitions and preserve the shared `focus-visible` contract.

### Evidence requirements
Trace focus and transition selectors together; rendered visibility still requires browser verification.

## I-04 Reduced motion is ignored

### Signal
Transform or animation effects lack an appropriate `motion-reduce`/`prefers-reduced-motion` alternative.

### Why it matters
Nonessential movement can cause discomfort and violate the local interaction contract.

### Do not flag when
The effect is essential, instantaneous, already covered globally, or does not create meaningful motion.

### Recommendation
Disable or reduce nonessential movement through the established motion pattern.

### Evidence requirements
Check component and global CSS before reporting; source can show missing handling, while comfort cannot be asserted without rendering/user context.

## I-05 Redundant success toast

### Signal
A success toast repeats a result already immediately and unambiguously visible in the current viewport.

### Why it matters
Redundant notifications add noise and interruption.

### Do not flag when
The operation completes off-screen/asynchronously, confirmation is critical, or failure/success would otherwise be ambiguous.

### Recommendation
Prefer the visible state change; reserve toast for information users may miss.

### Evidence requirements
Trace the action outcome and notification path. Viewport visibility may require browser verification.

## I-06 Loading flicker risk

### Signal
A spinner appears for every very short operation, or known-layout content lacks an appropriate stable placeholder.

### Why it matters
Rapid flashing and layout shifts reduce perceived stability.

### Do not flag when
Latency is unknown, the indicator is delayed, layout remains stable, or immediate progress is necessary.

### Recommendation
Use an established delay, pending treatment, or skeleton appropriate to known layout.

### Evidence requirements
Static code usually supports only `inferred`; timing/flicker is `verified` only after observation or measurement.

## Responsive and Readability

## R-01 Interactive labels wrap

### Signal
A button, primary navigation item, tab, pagination control, or CTA label wraps to multiple lines.

### Why it matters
Controls become harder to scan and may change layout unpredictably.

### Do not flag when
A deliberately multiline selection control is specified and remains operable.

### Recommendation
Preserve readable single-line controls by changing layout, responsive labeling, or available space—not by clipping meaning.

### Evidence requirements
Wrapping is `needs-browser` until observed at a recorded viewport.

## R-02 Overflow is hidden instead of fixed

### Signal
Root-level `overflow-x: hidden` or `clip` masks an overflowing child without correcting its sizing behavior.

### Why it matters
Content and focus indicators may become unreachable while the root cause remains.

### Do not flag when
Clipping is an intentional, bounded visual effect and functional content/focus remain unaffected.

### Recommendation
Identify and fix the causing element; keep clipping local and justified.

### Evidence requirements
A root rule is only a signal. Demonstrate the causal child in a browser before claiming an actual responsive failure.

## R-03 Long content is unhandled

### Signal
Long Japanese/English headlines, company names, tickers, UUID/public IDs, URLs, or prompt versions have no appropriate wrap, clamp, truncate, or detail path.

### Why it matters
Real finance content can break layouts or hide identifying information.

### Do not flag when
The container naturally wraps safely, content is constrained upstream, or a complete accessible/detail view exists.

### Recommendation
Choose wrap, clamp, truncation plus disclosure, or a scrollable data region according to the content's importance.

### Evidence requirements
Source can identify absent safeguards; actual breakage needs representative data and browser verification. Recognize correct public-ID truncation as a strength.

## R-04 Comparable numbers lack tabular figures

### Signal
Prices, percentages, amounts, counts, dates, rankings, or pagination values intended for column/digit comparison omit `tabular-nums` or an equivalent inherited rule.

### Why it matters
Proportional figures make numeric scanning less stable.

### Do not flag when
The number is isolated prose, the active font is already tabular, or comparison is not part of the task.

### Recommendation
Apply the established tabular-number utility at the narrowest shared numeric container.

### Evidence requirements
Check inheritance and font behavior before reporting; do not demand the class on every individual span.

## R-05 Meaning relies on color alone

### Signal
Gain/loss, positive/negative, warning, or another state is represented only by a color class.

### Why it matters
Color-vision differences, themes, and nonvisual access can erase the distinction.

### Do not flag when
A sign, arrow, label, icon with accessible meaning, or adjacent semantic text already provides the state.

### Recommendation
Add the smallest non-color cue and accessible meaning consistent with the data format.

### Evidence requirements
Inspect displayed signs/text and accessible labels, not just the conditional color expression.

## R-06 Contrast claims are unmeasured

### Signal
An audit or implementation claims contrast compliance solely from token names or visual intuition.

### Why it matters
Names such as muted or foreground do not establish a numeric ratio in every theme/state.

### Do not flag when
Ratios were measured for the exact rendered colors, state, and theme and the evidence is recorded.

### Recommendation
Label it `needs measurement` and verify the rendered foreground/background pair.

### Evidence requirements
Never report a pass from code alone. Record tools/values and theme when measured.

## Information Hierarchy and Restraint

## S-01 Primary information is not identifiable

### Signal
In a rendered view, the main decision input does not become clear within a brief scan because equal visual weight is given to secondary content.

### Why it matters
Users spend effort reconstructing the intended task hierarchy.

### Do not flag when
The task is intentionally exploratory or multiple values are legitimate peers.

### Recommendation
Remove or subordinate secondary emphasis before adding decoration.

### Evidence requirements
This rule requires browser inspection and screen/task context; do not assert it from source alone.

## S-02 Information is redundantly repeated

### Signal
The same number or message appears in KPI, chart, badge, and prose without distinct purposes.

### Why it matters
Repetition consumes attention and can create inconsistent updates.

### Do not flag when
Each occurrence supports a different task, comparison, accessibility alternative, or necessary summary/detail relationship.

### Recommendation
Keep the occurrence that best supports the task or explicitly differentiate the roles.

### Evidence requirements
Trace that the values are semantically identical, not merely similar.

## S-03 Labels are excessive

### Signal
Self-evident values receive redundant headings, eyebrow labels, badges, and captions.

### Why it matters
Label noise competes with actual financial context.

### Do not flag when
A label supplies required unit, currency, period, timestamp, source, or disambiguation.

### Recommendation
Remove redundant labels while preserving finance-critical context.

### Evidence requirements
Explain why the value is unambiguous without the label; perceived noise requires rendered context.

## S-04 Decoration substitutes for editing

### Signal
Gradients, shadows, icons, and badges are added to repair weak hierarchy while redundant or low-value elements remain.

### Why it matters
The interface becomes louder without becoming clearer.

### Do not flag when
The decoration conveys state, affordance, data, or established brand meaning.

### Recommendation
First remove or consolidate low-value elements, then use the minimum semantic emphasis needed.

### Evidence requirements
Identify both the decorative treatment and the removable/redundant cause; visual dominance requires browser verification.
