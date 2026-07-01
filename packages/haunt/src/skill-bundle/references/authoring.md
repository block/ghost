# Authoring a `.haunt/` package

A `.haunt/` package is two flat dirs. Flat — **no nesting** (a nested folder
inside a dir is a hard error), and no inheritance: checks bind to prose through
explicit `references`, never through folder depth.

```text
.haunt/
  manifest.yml   # schema: haunt.package/v1, id
  inventory/     # the materials — the code bridge
  checks/        # ghost.check/v1 assertions
```

Brand truths — principles, surface composition, stance — do **not** live here.
They live in the repo's `.ghost/` fingerprint as prose nodes (author them with
the `ghost` skill), and checks point at them. A `.ghost/` package is required
for `haunt review`; if the repo has none, set one up first:

```bash
npm i -D @anarchitecture/ghost-fingerprint && ghost init
```

Start with one material where the same review comments keep recurring, and grow
from there. Do not try to describe the whole product at once.

## The governing rule: observable decisions, not adjectives

Write things a reader can check against code. `Destructive actions use Verb +
Noun` is usable. `Buttons should be clear` is not. Adjectives (clean, polished,
intuitive) give an agent nothing to grade.

## `inventory/` — the materials (the code bridge)

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

## `checks/` — assertions (what becomes gradeable)

A haunt check **is** a `ghost.check/v1` document: `name`, `description`, and
`severity` (`high` / `medium` / `low`) are required frontmatter, the body is
prose instructions for the reviewing agent, and `tools` / `turn_limit` pass
through. Haunt adds one field: **`references`** (required, min 1) — the prose
the check enforces.

```markdown
---
name: density-does-not-creep
description: Density must not exceed what the surface earns.
severity: high
references:
  - modals
  - checkout > Density
---

Grade whether the change increases visual density beyond what the surface earns.
Look for: more elements per region, reduced whitespace, competing emphasis. This
is not a token check — a change can pass every lint and still collapse hierarchy.
```

### The `references` grammar

One pointer grammar system-wide, shared with `ghost.check/v1`'s `source:`.
Each entry is one of:

| Shape | Example | Points at |
| --- | --- | --- |
| bare flat slug | `modals` | a local inventory id (**local-first**: checked against inventory before the fingerprint catalog) |
| node path id | `checkout/payment` | a `.ghost/` fingerprint node (whole body) |
| node id + heading anchor | `checkout/payment > Confirmation` | the section under that heading (case-insensitive, any level, first match wins) |

A path-shaped id (with `/`) or anything with a `> Heading` anchor can only be a
fingerprint target. If a bare slug collides with both a local inventory id and
a fingerprint node id, local wins — rename one if that bites.

A fingerprint reference that doesn't resolve yet is a **warning**, not an
error — it may name not-yet-written prose. `haunt validate` is where dangling
references get caught.

### What a check's references determine

- A check referencing a **local inventory id** is offered when the diff touches
  that material's `paths`.
- A check whose references are **all fingerprint-shaped** is *always offered* —
  there is no mechanical hop from a diff to a brand truth; the reviewing agent
  weighs relevance.

## Validate as you go

Run `haunt validate` after edits. It checks the shape (flat dirs, valid
frontmatter) and the references:

- local references must resolve to an inventory entry;
- fingerprint-shaped references are checked against `.ghost/` when it resolves
  (warning when the node is missing); with no fingerprint present you get an
  info note, not an error;
- **inventory with no `paths`** — warned: it can't bridge to code, so no diff
  resolves to it;
- leftover `tenets/`, `surfaces/`, or `exemplars/` dirs from the retired
  four-tier shape are warned about — migrate their prose into `.ghost/` nodes.

These warnings are the anti-rot signal: they make the parts of the package that
can't yet be graded *visible* instead of silently rotting. Close them by adding
checks, or record the gap honestly.
