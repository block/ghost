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

## Status

Scaffolded skeleton only. The design (inventory-bridge depth, the `haunt review`
"oh" demo, the Berd pilot) is tracked in `notes/`.
