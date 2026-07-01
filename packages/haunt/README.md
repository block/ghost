# haunt

**The BYO-design-system adherence + drift layer for Ghost. Problem A. Scaffolded.**

Ghost splits into two differently-shaped jobs (see
[`notes/session-synthesis.md`](../../notes/session-synthesis.md) and
[`notes/naming-and-structure.md`](../../notes/naming-and-structure.md)):

- **Fingerprint** (`@anarchitecture/ghost`) — the portable, medium-agnostic on-brand
  generation contract. The knowledge layer.
- **Haunt** (this package) — the implementation-layer adherence + drift layer. It
  bridges to the design-system code a repo already owns and grades high-altitude
  compositional drift.

> **Summon** a ghost. It leaves a **Fingerprint**. Then it **Haunts** the code —
> whether that code is yours or lives in a **Vessel** we provide.

## The wedge

| | Owns code? | Adherence / drift | Stack lock-in |
|---|---|---|---|
| shadcn | you copy & own | none (by design) | none |
| Astryx | yes (their stack) | declines on purpose | high |
| **Haunt** | **no — bridges to yours** | **yes, novel** | **none** |

Haunt is design-system-agnostic and ships standalone. **Vessel** is the reference body
it ships knowing best (richest out-of-the-box read), but Haunt never requires it —
point it at any repo's own components and it still works.

## The mechanism (BYOA)

The deterministic core assembles the evidence — inventory-extracted code facts + the
bound intent/composition prose + the diff — and the **host agent renders the adherence
judgment**. Prose is the baseline; code is the observable; the inventory bridge
reconnects them.

## Shape

A `.haunt/` package is four flat tiers plus exemplars — no nesting, no inheritance;
the edges between tiers are the graph (see `notes/haunt-direction.md`):

```text
.haunt/
  manifest.yml
  tenets/     # broad principles — the why / the stance. Prose, no paths.
  inventory/  # the materials — prose + `paths` to where they live in code.
  surfaces/   # feature areas — how principles land; honors tenets, uses inventory.
  checks/     # assertions — ground up into tenets/surfaces/inventory.
  exemplars/  # shipped decisions worth repeating.
```

## CLI

```bash
haunt init                 # scaffold a .haunt/ package (one example per tier)
haunt validate             # shape (flat tiers) + edge graph (honors/uses/grounds resolve)
haunt review --diff=-      # advisory packet: matched materials, baseline prose,
                           #   offered checks, coverage gaps, diff (agent renders findings)
haunt skill install        # install the host-agent skill bundle
haunt manifest             # self-describing JSON of commands + flags
```

`haunt review` is advisory — it assembles evidence and offers checks; the host
agent judges relevance and produces P0–P3 findings. Haunt never edits and never
grades on its own.

## Status

Working core (Slices 1–6): package model + loader, graph validation, the inventory
bridge, the advisory review packet, the skill bundle, and scaffolding. Built
standalone — no dependency on `ghost-core` yet (see `notes/haunt-direction.md` →
"Where the code is vs. where this points"). Deferred: the eval/vibe-test harness,
the evidence-intake loop, and first-party Vessel knowledge.
