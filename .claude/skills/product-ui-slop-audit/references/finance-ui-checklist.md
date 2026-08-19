# Finance UI Checklist

Use this checklist when the scope displays prices, company data, financial news, analysis, forecasts, or charts. Report only supported findings and preserve the distinction between source facts and rendered verification.

## Numbers

- Identify currency and units wherever ambiguity is possible.
- Keep decimal-place rules consistent between comparable screens.
- Show an explicit sign or direction where change is communicated.
- Identify the baseline period for percentage changes.
- Distinguish missing values from zero.
- Use `—`, `N/A`, and `0` consistently and document their different meanings.
- Use `tabular-nums` where users compare prices, percentages, amounts, counts, dates, ranks, or pagination values.
- Never invent values to complete a composition.

## Time and provenance

- Distinguish the market-data retrieval time from the analysis generation time.
- State JST, UTC, exchange time, or another timezone where it affects interpretation.
- Do not present stale data as current; expose the stale state where relevant.
- Identify daily, weekly, intraday, or other granularity.
- Preserve source, target period, currency, and unit when the information requires them.

## Direction and status

- Do not communicate gain/loss, positive/negative, or warning by red/green alone.
- Add a sign, arrow, label, icon, accessible name, or equivalent non-color cue.
- Check that Japanese-market and overseas-market color conventions are not mixed ambiguously.
- Verify the accessible meaning rather than assuming an icon or color is self-explanatory.

## AI analysis and investment trust

- Visually and semantically separate factual values/news from AI commentary, estimates, and scenarios.
- Do not present an estimate as confirmed information.
- Do not fabricate numeric “confidence,” “accuracy,” win rate, expected return, target price, or performance claims.
- Trace analysis to its inputs, source news, relevant prompt/revision, and analysis timestamp when required by the product.
- Flag language that can be mistaken for guaranteed outcomes, certain forecasts, or unqualified buy/sell advice.
- Before reporting H-01, search props, API/domain fields, fixtures, and specifications; a literal may be a documented test fixture rather than a user-facing invented claim.

## Charts

- Identify chart period, granularity, currency, and unit.
- Do not trap essential information only in a visual chart; provide a useful text summary or alternative.
- Do not make a hover-only tooltip the sole source of critical data.
- Check mobile overflow in a rendered browser; source review alone can only mark the risk.
- Check missing/loading/error/stale chart states and the distinction between “no data” and a zero series.
