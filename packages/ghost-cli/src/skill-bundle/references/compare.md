---
name: compare
description: Interpret ghost compare output — pairwise distance or fleet analysis.
handoffs:
  - label: Accept the drift as aligned reality
    command: ghost ack
    prompt: Accept current drift across the board
  - label: Adopt the other fingerprint as a new parent baseline
    command: ghost adopt
    prompt: Adopt the other fingerprint.md as the new parent baseline
  - label: Declare a dimension intentionally divergent
    command: ghost diverge
    prompt: Record an intentional divergence on a specific dimension
---

# Recipe: Compare fingerprints

**Goal:** answer "how different are these design systems?" or "how has ours drifted over time?"

## Steps

### Pairwise (N=2)

    ghost compare a.md b.md

Output: distance (0 = identical, 1 = unrelated) and per-dimension deltas (palette, spacing, typography, surfaces).

Flags:
- `--semantic` — add qualitative diff (which decisions changed, which colors appeared/disappeared)
- `--temporal` — add drift velocity, trajectory, and ack bounds (reads `.ghost/history.jsonl`)

### Fleet (N≥3)

    ghost compare a.md b.md c.md d.md

Output: pairwise distance matrix, centroid, spread, and cluster assignments.

Use for: comparing multiple downstream consumers of a parent design system (which are closest to parent, which have drifted most, do they cluster?).

### Interpreting output

- **Distance < 0.2**: effectively the same system.
- **0.2 – 0.5**: recognizable drift; worth a qualitative review.
- **> 0.5**: the two fingerprints represent meaningfully different systems. Either one has diverged intentionally, or they were never the same.

If the user asks "why did it change", follow up with `--semantic`.
