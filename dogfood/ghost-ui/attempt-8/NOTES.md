# Attempt 8 - ghost-ui scan, 2026-05-05 (authored-contract dogfood)

Fresh dogfood pass after removing fragment-era fingerprint behavior, adding `survey catalog`, and expanding `verify-profile` beyond palette. The source package `packages/ghost-ui` remains the scan target; the wider repo is dirty because the authored-contract remediation is in progress. Survey provenance records `a7e4af7+dirty`.

This attempt intentionally profiles from the bounded summary plus the derived typography catalog. The raw survey remains the evidence ledger; no catalog or embedding artifact is checked in as canonical truth.

## Stage Results

| Stage | Result |
|---|---|
| map | `map.md` refreshed for the current package-local artifact state; package-local Ghost scan artifacts are now absent from `packages/ghost-ui` |
| survey | `survey.json` regenerated with the attempt-7 extractor, then finalized with `ghost-fingerprint survey fix-ids` |
| summary | `ghost-fingerprint survey summarize survey.json --budget compact` used as broad profile context |
| catalog | `ghost-fingerprint survey catalog survey.json --kind typography` used for exact type value enums/specs |
| fingerprint | `fingerprint.md` retained the same prose contract, but narrowed `typography.sizeRamp` to survey-backed scalar font-size rows |

## Survey Coverage

| Section | Attempt 7 | Attempt 8 | Result |
|---|---:|---:|---|
| values | 243 | 243 | unchanged |
| tokens | 269 | 269 | unchanged |
| components | 99 | 99 | unchanged |
| ui_surfaces | 1 | 1 | unchanged |

Value-kind counts are unchanged: 141 color, 34 typography, 26 spacing, 26 motion, 8 radius, 7 shadow, 1 breakpoint.

## Catalog Dogfood

The new verifier rejected attempt 7 under the fresh contract because its `typography.sizeRamp` included inferred scalar endpoints from clamp tokens (`10`, `20`, `24`, `28`, `40`, `44`, `48`, `64`, `96`, `192`) that were not survey-backed as scalar typography size rows.

`ghost-fingerprint survey catalog survey.json --kind typography` made the backed scalar size enum explicit:

```text
11px, 12px, 14px, 16px, 18px
```

Attempt 8 keeps the editorial clamp evidence in `### typography-voice` prose, but the machine frontmatter now carries only `sizeRamp: [11, 12, 14, 16, 18]`.

## Compare Against Attempt 7

`ghost-fingerprint diff dogfood/ghost-ui/attempt-7/fingerprint.md dogfood/ghost-ui/attempt-8/fingerprint.md`:

```text
Tokens:
  ~ typography.sizeRamp: [10,11,12,14,16,18,20,24,28,40,44,48,64,96,192] -> [11,12,14,16,18]
```

`ghost-drift compare dogfood/ghost-ui/attempt-7/fingerprint.md dogfood/ghost-ui/attempt-8/fingerprint.md`:

```text
Overall Distance: 8.3%

Dimensions
  decisions        0.0%  Decisions present (11 vs 11) but embeddings missing - not scored
  palette          0.0%  Color palettes are nearly identical
  spacing          0.0%  Spacing scales are nearly identical
  typography      33.3%  Different typographic language
  surfaces         0.0%  Surface treatments align
```

This is a useful contract shift, not a source-design shift: the survey evidence is unchanged, and only the authored machine digest became stricter.

## Validation

```bash
node packages/ghost-fingerprint/dist/bin.js lint dogfood/ghost-ui/attempt-8/map.md
node packages/ghost-fingerprint/dist/bin.js lint dogfood/ghost-ui/attempt-8/survey.json
node packages/ghost-fingerprint/dist/bin.js lint dogfood/ghost-ui/attempt-8/fingerprint.md
node packages/ghost-fingerprint/dist/bin.js verify-profile dogfood/ghost-ui/attempt-8/fingerprint.md dogfood/ghost-ui/attempt-8/survey.json --root packages/ghost-ui
node packages/ghost-fingerprint/dist/bin.js scan-status dogfood/ghost-ui/attempt-8
node packages/ghost-drift/dist/bin.js compare dogfood/ghost-ui/attempt-8/fingerprint.md dogfood/ghost-ui/attempt-8/fingerprint.md
```

Map and survey return `0 error(s), 0 warning(s), 0 info`. Fingerprint lint and profile verification return `0 error(s), 0 warning(s), 1 info` because no promoted `checks[]` are present. Scan status is complete. Self-distance is `0.0%`.
