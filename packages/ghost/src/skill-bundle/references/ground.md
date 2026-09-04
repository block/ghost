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

`gather` presents every selectable node; it does not filter or rank, and its
selection contract states the pull rule. Kind legends may narrow that global
rule, including stricter handling when uncertain.

Read the coverage line before you choose. It tells you whether the package has
concrete material and whether any node lacks a `for` payload.

## Pull and inspect

Run `ghost pull <id> [<id>…]`. Prefer the pull packet over reading files
directly; [SKILL.md](../SKILL.md) gives the canonical pull-over-files rationale.
Inspect decisive materials before generating. Follow the triage bullets in
[making.md](making.md).

`ghost pull` records the pulled ids, so selection can be checked later. It is
also idempotent: after compaction or a session handoff, re-run it with the same
ids to restore steering.

## End with the anchor

The anchor is an ephemeral pre-generation block, never written into `.ghost/`.
Do not call it a pull packet or review packet.

Keep it to two parts:

1. Up to five non-negotiables, each cited to a pulled node id. Guidance from a
   `Never` section states the positive replacement, never just the rejection.
   Include conditional guidance only when its stated situation actually holds,
   including guidance whose kind has scoped meaning in the glossary.
2. Named silence, one line: what ghost does not cover and what provisional
   reasoning carries it. Ask a human or author guidance before proceeding when
   the gap is consequential, irreversible, or brand-defining. Keep this
   separate from cited claims. Follow [SKILL.md](../SKILL.md)'s canonical "When
   the package is silent" section.

Never restate or paraphrase the Skeleton into the anchor. Start the artifact
from it verbatim, per the [SKILL.md](../SKILL.md) Skeleton convention.
