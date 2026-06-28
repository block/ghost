---
name: review
description: Review PR or working-tree changes against checked-in Ghost fingerprints.
handoffs:
  - label: Suggest minimal fixes
    skill: remediate
    prompt: Given the findings, suggest the minimal code changes that bring the diff back inside the .ghost fingerprint
---

# Recipe: Review Code Changes For Experience Drift

## 1. Route The Change To Its Surfaces

```bash
ghost checks --surface <ids> --format json
```

Name the surfaces the change touches (you analyzed the diff). Ghost selects the
markdown checks governing those surfaces and their ancestors, and grounds each
in the surface's fingerprint slice. Use JSON as the agent contract. It includes:

- `touched_surfaces`: the surfaces the diff resolved to
- `checks`: the relevant checks per surface, with `relevance` (own or inherited)
- `grounding`: per surface, the slice's prose `nodes`, each with `provenance`
  (own / ancestor / edge). The why and the what live in each node's prose — read
  the grounded nodes, own first, then inherited, then related.

Ghost selects and grounds the checks; it does not run them. Evaluate each
markdown check's instructions against the diff yourself.

## 2. Compose Deeper Context When Needed

```bash
ghost gather <surface> --format json
```

When a finding needs more than the grounding slice, gather the full surface
context (own + inherited + edge-contributed nodes). Match a prompt-shaped ask to
a surface via the menu (`ghost gather` with no surface).

## 3. Write Findings

Classify each finding as `fix`, `intentional-divergence`, `missing-fingerprint`,
`experience-gap`, or `eval-uncertainty`.

Each finding must cite the diff location, the check that fired, the grounding
refs (principles/contracts as the why, exemplars as what good looks like), and a
repair or intentional-divergence rationale.

When a surface's grounding is silent, local evidence can still support advisory
critique — label those findings provisional and non-Ghost-backed.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package. Do not silently rewrite the Ghost package during review unless the user
asks for fingerprint edits.
