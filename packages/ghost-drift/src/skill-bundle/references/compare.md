---
name: compare
description: Interpret ghost-drift compare output — pairwise distance or composite (N≥3) analysis.
handoffs:
  - label: Accept the drift as aligned reality
    command: ghost-drift ack
    prompt: Accept current drift across the board
  - label: Track the other fingerprint
    command: ghost-drift track
    prompt: Track the other fingerprint.md as the new reference
  - label: Declare a dimension intentionally divergent
    command: ghost-drift diverge
    prompt: Record an intentional divergence on a specific dimension
---

# Recipe: Compare fingerprints

**Goal:** answer "how different are these design languages?" or "how has ours drifted over time?"

## Steps

### Pairwise (N=2)

    ghost-drift compare a/.ghost b/.ghost

Output: distance (0 = identical, 1 = unrelated) and per-dimension deltas. Bundle inputs are synthesized from survey values plus pattern frequencies; direct fingerprint markdown files still use their embedded frontmatter.

Flags:
- `--semantic` — add qualitative diff for direct fingerprint markdown comparisons
- `--temporal` — add drift velocity, trajectory, and ack bounds (reads `.ghost/history.jsonl`)

### Composite (N≥3)

    ghost-drift compare a/.ghost b/.ghost c/.ghost d/.ghost

Output: pairwise distance matrix, centroid, spread, and cluster assignments. The centroid is the composite (org-scale) fingerprint: what the members average out to.

Use for: comparing a collection of fingerprints at the same elevation: which are closest, which are far apart, and whether they cluster into coherent families.

### Interpreting output

- **Distance < 0.2**: effectively the same system.
- **0.2 – 0.5**: recognizable drift; worth a qualitative review.
- **> 0.5**: the two fingerprints represent meaningfully different systems. Either one has diverged intentionally, or they were never the same.

If the user asks "why did it change", follow up with `--semantic`.
