# Authoring a `.haunt/` package

Haunt's fingerprint is four flat tiers plus exemplars. Flat — **no nesting** (a
nested folder inside a tier is a hard error), and **no inheritance** — the edges
between tiers are the graph, declared in frontmatter, never derived from folder
depth.

```text
.haunt/
  manifest.yml
  tenets/     inventory/     surfaces/     checks/     exemplars/
```

Start with one surface where the same review comments keep recurring, and grow
from there. Do not try to describe the whole product at once.

## The governing rule: observable decisions, not adjectives

Write things a reader can check against code. `Destructive actions use Verb +
Noun` is usable. `Buttons should be clear` is not. Adjectives (clean, polished,
intuitive) give an agent nothing to grade.

## The tiers

### `tenets/` — broad principles (the why / the stance)

System-wide beliefs: composition, product stance, principles. Portable prose, no
code pointer (materials live in inventory). A tenet is honored by surfaces and
grounded by checks — that is how it becomes reachable by review.

```markdown
---
description: How the product surface holds hierarchy, density, and restraint.
---

Restraint is the default. A surface earns density; it does not start dense.
Hierarchy stays legible under change.
```

### `inventory/` — the materials (the code bridge)

The components, tokens, and patterns the system has, plus `paths` naming where
they live in the repo. `paths` are relative repo globs (`*`, `**`, `?`,
`{a,b}`). This is the *only* place code pointers live — Haunt matches diff files
against them to decide what changed. Shallow by design: name where the material
is; the reviewing agent reads the code.

```markdown
---
description: Dialogs, sheets, and overlays.
paths:
  - packages/geist/src/Modal/**
  - apps/site/components/overlays/**
---

Modals are for interruptions that must be resolved before continuing.
No nested modals. The body scrolls; header and footer stay fixed.
```

### `surfaces/` — feature areas (composition)

How principles and materials assemble into an intentional place. A surface
**cites** tenets (`honors`) and materials (`uses`) by bare id — it does not
inherit them; the citation is an explicit edge.

```markdown
---
description: The payment surface.
honors:
  - composition
uses:
  - modals
---

Checkout runs dense on purpose — but earns it with hierarchy.
```

### `checks/` — assertions (what becomes gradeable)

A check grounds *up* into the prose that justifies it, tier-qualified. Its kind
follows from what it grounds in: ground in `inventory` for structural checks;
ground in `tenets` for high-altitude judgment. If you can't point a check at
concrete inventory, it is a judgment check by construction.

```markdown
---
description: Density must not exceed what the surface earns.
grounds:
  - tenets/composition
  - surfaces/checkout
severity: high
---

Grade whether the change increases visual density beyond what the surface earns.
Look for: more elements per region, reduced whitespace, competing emphasis. This
is not a token check — a change can pass every lint and still collapse hierarchy.
```

### `exemplars/` — shipped decisions worth repeating

Prose records of a decision worth repeating (or a mistake to avoid), ideally
tied to a shipped PR. Optional, but they teach the agent by example.

## The edge vocabulary

| Edge | On | Points to | Meaning |
| --- | --- | --- | --- |
| `paths` | inventory | repo globs | where this material's source lives |
| `honors` | surface | tenet ids | principles the surface upholds |
| `uses` | surface | inventory ids | materials assembled on the surface |
| `grounds` | check | `tenets/…` `surfaces/…` `inventory/…` | what the check enforces |

## Validate as you go

Run `haunt validate` after edits. It checks the shape (flat tiers) and the graph
(every `honors`/`uses`/`grounds` resolves), and it warns on:

- **orphan tenets** — no surface honors them and no check grounds them
  (unreachable by review);
- **honored-but-ungrounded tenets** — a surface honors them but no check grounds
  them (drift against them will not be graded);
- **inventory with no `paths`** — it can't bridge to code, so no diff resolves to
  it.

These warnings are the anti-rot signal: they make the parts of the fingerprint
that can't yet be graded *visible* instead of silently rotting. Close them by
adding checks, or record the gap honestly.
