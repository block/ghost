# Authoring a `.ghost/haunt/` package

A `.ghost/haunt/` package is two flat dirs inside the fingerprint's reserved
`haunt/` subtree. Flat — **no nesting** (a nested folder inside a dir is a
hard error), and no inheritance: checks bind to prose through explicit
`references`, never through folder depth. Haunt has no manifest of its own —
the fingerprint's `manifest.yml` is the only anchor.

```text
.ghost/
  haunt/
    inventory/   # the materials — the code bridge
    checks/      # ghost.check/v1 assertions
```

Brand truths — principles, surface composition, stance — do **not** live here.
They live in the repo's `.ghost/` fingerprint as prose nodes (author them with
the `ghost` skill), and checks point at them. A `.ghost/` package is required
for `ghost-haunt review`; if the repo has none, set one up first:

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
error — it may name not-yet-written prose. `ghost-haunt validate` is where dangling
references get caught.

### What a check's references determine

- A check referencing a **local inventory id** is offered when the diff touches
  that material's `paths` (review), and bound into that material's section of
  the integrity packet (a check referencing several materials appears in each
  of their sections).
- A check whose references are **all fingerprint-shaped** is *always offered* —
  there is no mechanical hop from a diff to a brand truth; the reviewing agent
  weighs relevance. In the integrity packet these checks are listed once, in a
  global section (they assert truths about the whole surface).
- A **mixed** check (local + fingerprint references) is **scoped to its
  material at review**: the local reference is the trigger, the fingerprint
  reference is the baseline to grade against. It is offered only when the diff
  touches the material's `paths`. Adding a local reference to a check narrows
  it — "this truth, *as it lands in this material*" — it never widens it.

Two consequences, both intentional:

- If you want a brand truth graded on **every** diff, write a fingerprint-only
  check. If you want it graded **where a material lands**, write a mixed check.
  Two intents, two checks — do not overload one.
- A mixed check is silent when a diff drifts against its truth *outside* its
  material. That is not a hole; it is review staying quiet unless the diff
  mechanically implicates it. Whole-system contradiction — a new component
  quietly forking the library's pattern, sprawl no single diff reveals — is
  `ghost-haunt integrity`'s job, on a cadence you choose.

### Cadence — review is triggered, integrity is chosen

`ghost-haunt review` runs on a diff; the trigger is the change itself. `ghost-haunt
integrity` has no diff and no natural trigger — **the cadence is yours**, and
its findings are advisory ("fyi") rather than PR-blocking. Common shapes:

- **Manual** — run it when the system feels like it's drifting.
- **Scheduled** — a weekly cron in CI pipes the packet to your agent and posts
  the report wherever your team reads (issue, Slack, dashboard).
- **Signal-driven** — run integrity on a PR whenever `review`'s matched
  materials show the diff touched inventory `paths` (the packet is that
  signal), or when a `dead-paths` gap appears.

Haunt ships no bot and posts no comments — the packet on stdout is the stable
contract; the glue (which agent, where it posts, whether it gates) is the
integrator's choice.

### Author for both tenses

The same check serves two verbs: `ghost-haunt review` grades a **change** against it,
`ghost-haunt integrity` grades the **whole material** against it (and against its
siblings). Sprawl assertions — "modal contracts stay congruent", "naming
follows the glossary", "tokens, not hardcoded values" — are ordinary checks
referencing the materials they guard. A material no check references shows up
in the integrity packet as an `unreferenced-material` gap: unguarded against
sprawl. Run `ghost-haunt integrity` locally when the system feels like it's
drifting, and on PRs whenever a diff touches inventory `paths`.

## Validate as you go

Run `ghost-haunt validate` after edits. It checks the shape (flat dirs, valid
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
