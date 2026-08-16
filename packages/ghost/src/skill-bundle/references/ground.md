---
name: ground
description: Ground before generating by gathering, selecting, pulling, inspecting, and ending with an anchor.
---

# Recipe: Ground Before Generating

Use this before writing UI, copy, email, review text, or any other output that
should be shaped by a ghost package.

## Gather and select

Run `ghost gather <ask>` with the real task, not a generic label. The cover is
inlined by gather, so do not pull it separately.

Select against `context`; ghost never selects for you. When you are uncertain
whether a node applies, pull it. Under-pull is silent and unrecoverable;
over-pull is mild dilution. Skip only clear non-matches. Topic overlap alone is
not applicability.

Read the coverage line before you choose: an all-prose package is weak
steering. `gather` labels materials, substantial fenced examples, and Skeletons
separately, so payload shape is visible before generation.

## Pull and inspect

Run `ghost pull <id> [<id>…]`. Prefer the pull packet over reading files
directly; [SKILL.md](../SKILL.md) gives the canonical pull-over-files rationale.
Inspect decisive materials before generating. Follow the triage bullets in
[making.md](making.md).

The pulled id list is the resume token. `ghost pull` is idempotent: after
compaction or a session handoff, re-run `ghost pull` with the same ids to
restore steering.

## End with the anchor

The anchor is an ephemeral pre-generation block, never written into `.ghost/`.
Do not call it a pull packet or review packet.

Keep it to three parts:

1. Up to five non-negotiables, each cited to a pulled node id. Anti-goals state
   the positive replacement, never just the rejection. Include conditional
   guidance only when its stated situation actually holds, including guidance
   whose kind has scoped meaning in the glossary.
2. One readiness color: Green when the surface is covered by inspected concrete
   material; no concrete material for the surface caps readiness at Yellow; Red
   means a brand-defining, high-risk, or irreversible gap, so ask a human or
   author a node first.
3. Named silence, one line: what ghost does not cover and what provisional
   reasoning carries it. Keep this separate from cited claims. Follow
   [SKILL.md](../SKILL.md)'s canonical "When the package is silent" section.

Never restate or paraphrase the Skeleton into the anchor. Start the artifact
from it verbatim, per the [SKILL.md](../SKILL.md) Skeleton convention.
