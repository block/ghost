# Attempt 4 - ghost-ui scan, 2026-05-01 (terminal-context tightening)

Dogfood scan after adding source graph provenance, rule curation guidance, and sharper emitted terminal context. Target is still `packages/ghost-ui`; this pass checks that the broader bucket remains useful while the promoted expression rules become the compact contract.

## Artifacts

| Artifact | Result |
|---|---:|
| `map.md` | `ghost.map/v1` with `subject` and `sources[]` |
| `bucket.json` | 101 values, 169 tokens, 97 components |
| `expression.md` | 7 promoted rules with `support`, `enforce_at`, and `observed_count` |

`bucket.json` source provenance records `ghost-ui` as the primary source, target `block/ghost@packages/ghost-ui`, commit `83c2b64`, scan time `2026-05-01T17:51:23Z`, and scanner version `dogfood-attempt-4`.

## Validation

```bash
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-4/map.md
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-4/bucket.json
node packages/ghost-expression/dist/bin.js lint dogfood/ghost-ui/attempt-4/expression.md
```

All three return `0 error(s), 0 warning(s), 0 info`.

```bash
node packages/ghost-drift/dist/bin.js compare dogfood/ghost-ui/attempt-4/expression.md dogfood/ghost-ui/attempt-4/expression.md
```

Self-distance is `0.0%`, as expected.

## Terminal-output check

`emit context-bundle --prompt-only` now produces a prompt with:

- Character first.
- Non-negotiable promoted rules sorted by computed severity.
- Decisions as generation direction.
- Defaults/avoids and token lists.
- No instruction to cite decisions in generated UI.

`emit review-command` renders the rules-driven path with 2 Critical, 4 Serious, and 1 Nit rule. Presence-floor escalation correctly moves `no-decorative-motion` from rhythmic to Serious because `observed_count: 0` crosses `presence_floor: 4`.

## Follow-up found and fixed

The dogfood caught a wording bug in the review-command calibration footer: it reported base prior counts after rendering escalated severity groups, which made the footer disagree with the visible sections. The emitter now reports final Critical/Serious/Nit counts first, then the base prior counts before escalation.
