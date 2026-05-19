# Attempt 4 - ghost-ui scan, 2026-05-01 (terminal-context tightening)

Dogfood scan after adding source graph provenance, check curation guidance, and sharper emitted terminal context. Target is still `packages/ghost-ui`; this pass checks that the broader survey remains useful while the promoted fingerprint checks become the compact contract.

## Artifacts

| Artifact | Result |
|---|---:|
| `map.md` | `ghost.map/v2` with `subject`, `sources[]`, and `surface_sources` |
| `survey.json` | 101 values, 169 tokens, 97 components, 1 UI surface |
| `fingerprint.md` | 7 promoted checks with `support`, `enforce_at`, and `observed_count` |

`survey.json` source provenance records `ghost-ui` as the primary source, target `block/ghost@packages/ghost-ui`, commit `83c2b64`, scan time `2026-05-01T17:51:23Z`, and scanner version `dogfood-attempt-4`.

## Validation

```bash
node packages/ghost-scan/dist/bin.js lint dogfood/ghost-ui/attempt-4/map.md
node packages/ghost-scan/dist/bin.js lint dogfood/ghost-ui/attempt-4/survey.json
node packages/ghost-scan/dist/bin.js lint dogfood/ghost-ui/attempt-4/fingerprint.md
```

All three return `0 error(s), 0 warning(s), 0 info`.

```bash
node packages/ghost-drift/dist/bin.js compare dogfood/ghost-ui/attempt-4/fingerprint.md dogfood/ghost-ui/attempt-4/fingerprint.md
```

Self-distance is `0.0%`, as expected.

## Terminal-output check

`emit context-bundle --prompt-only` now produces a prompt with:

- Character first.
- Non-negotiable promoted checks sorted by computed severity.
- Decisions as generation direction.
- Defaults/avoids and token lists.
- No instruction to cite decisions in generated UI.

`emit review-command` renders the checks-driven path with 2 Critical, 4 Serious, and 1 Nit check. Presence-floor escalation correctly moves `no-decorative-motion` from rhythmic to Serious because `observed_count: 0` crosses `presence_floor: 4`.

## Follow-up found and fixed

The dogfood caught a wording bug in the review-command calibration footer: it reported base prior counts after rendering escalated severity groups, which made the footer disagree with the visible sections. The emitter now reports final Critical/Serious/Nit counts first, then the base prior counts before escalation.
