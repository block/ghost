---
description: The line between the deterministic CLI and the interpreting agent. Gather when adding or changing any CLI command, flag, or emitted packet.
materials:
  - packages/ghost/src/cli.ts
  - docs/purposes.md
---

Ghost is BYOA: the host agent reads, decides, and writes; the CLI grounds
that work deterministically. Every feature lands on one side of this line.

The CLI side: validation, the gather menu, node pulls, event tapes, packet
assembly. Repeatable, no LLM, same output for the same input. Its emissions
are evidence for an agent, never verdicts: `ghost review` assembles an
advisory packet; it does not grade the diff. Probes run shell commands and
report output as evidence only.

The agent side: selecting nodes against a task, interpreting prose,
grading review packets, authoring fingerprints. This lives in the skill
bundle, never in CLI code.

When a proposed feature needs the CLI to interpret meaning, rank by
relevance beyond mechanical matching, or pass/fail on prose, it belongs in
the skill instead. When a proposed skill step is repeatable and mechanical,
move it into the CLI so agents cannot do it inconsistently.

A consumer may read the fingerprint through any projection it likes; it may
not change the shape of the fingerprint to suit itself. The shape test lives
in `docs/purposes.md`.
