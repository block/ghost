# Attempt 7 - ghost-ui scan, 2026-05-04 (bounded survey summary dogfood)

Fresh dogfood pass after adding `ghost-expression survey summarize`. The source package `packages/ghost-ui` itself was clean; the wider repo was dirty because the bounded-summary implementation was in progress. Survey provenance records `3e0ef1a+dirty`.

This attempt intentionally profiles from a bounded survey digest instead of reading the full raw survey as LLM context.

## Stage Results

| Stage | Result |
|---|---|
| map | `map.md` carried forward from attempt 6 with the scan date updated; topology unchanged |
| survey | `survey.json` regenerated with the attempt-6 extractor, then finalized with `ghost-expression survey fix-ids` |
| summary | `ghost-expression survey summarize survey.json --budget compact` used as profile context |
| expression | `expression.md` re-profiled conservatively from the compact digest; design-language contract unchanged |

## Survey Coverage

| Section | Attempt 6 | Attempt 7 | Result |
|---|---:|---:|---|
| values | 243 | 243 | unchanged |
| tokens | 269 | 269 | unchanged |
| components | 99 | 99 | unchanged |
| ui_surfaces | 1 | 1 | unchanged |

Value-kind counts are unchanged: 141 color, 34 typography, 26 spacing, 26 motion, 8 radius, 7 shadow, 1 breakpoint.

## Summary Dogfood

| Input | Size |
|---|---:|
| raw `survey.json` | 332,026 bytes |
| compact summary | 17,341 bytes |
| standard summary | 30,721 bytes |

The compact digest preserved the high-signal rows, top token families, unresolved Tailwind color-token evidence, component inventory highlights, and the single static-source UI surface while cutting the working profile context to roughly 5% of the raw survey.

The standard digest is readable but a little fat for this target because token evidence is dense; compact was the better profile budget for `ghost-ui`.

## Compare Against Attempt 6

`ghost-expression diff dogfood/ghost-ui/attempt-6/expression.md dogfood/ghost-ui/attempt-7/expression.md`:

```text
No semantic changes.
```

`ghost-drift compare dogfood/ghost-ui/attempt-6/expression.md dogfood/ghost-ui/attempt-7/expression.md`:

```text
Overall Distance: 0.0%
```

All scored dimensions are unchanged: palette, spacing, typography, and surfaces remain aligned. Decisions are present in both expressions but embeddings are missing, so drift reports them as unscored.

## Validation

```bash
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-7/map.md
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-7/survey.json
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-7/expression.md
node packages/ghost-expression/dist/bin.js scan-status dogfood/ghost-ui/attempt-7
node packages/ghost-drift/dist/bin.js compare dogfood/ghost-ui/attempt-7/expression.md dogfood/ghost-ui/attempt-7/expression.md
```

Map and survey return `0 error(s), 0 warning(s), 0 info`. Expression returns `0 error(s), 0 warning(s), 1 info` because no promoted `checks[]` are present. Self-distance is `0.0%`.
