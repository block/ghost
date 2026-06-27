---
status: exploring
---

# Worked scenarios: what a Ghost fingerprint actually looks like

Companion to `context-graph.md`. The model there is abstract; this note makes it
concrete. Each scenario is a real fingerprint — actual node files, actual bodies,
the three relationship tiers, the `medium` tag — and the `gather` that turns it
into a context packet for generation.

The model, restated in one breath: **a folder of markdown nodes; nodes link
`under` a parent (the tree, the cascade) and `relates` laterally; nuanced
relationships become their own nodes (the OKF "joins" borrow); a `medium` tag is
optional; bodies are design expression written through intent / inventory /
composition; nobody hand-authors links — a skill does, lint guards it.**

The three relationship tiers (the sharpening from OKF):

1. **`under`** — containment. Cheap. Builds the tree and the cascade.
2. **`relates: [ref] (qualifier)`** — light lateral. A link + one-word handle
   (`contrasts` / `reinforces` / `variant`) for the machinery; the *why* is brief
   prose.
3. **relationship-node** — when the *why* is rich, the relationship becomes a
   node: a title, its two endpoints, and a body explaining the tension and what
   it protects. This is where design rationale lives.

---

## Scenario A — a simple dashboard

Analytics, views, settings, profiles, item-detail. Single medium (web), so no
node ever writes `medium`. The model should be nearly invisible.

```
.ghost/
  manifest.yml
  core.md
  analytics.md
  item-detail.md
  rel/density-tension.md          # a relationship-node (tier 3)
  checks/numbers-first.md
```

`manifest.yml`
```yaml
package: "@acme/console"
medium: web                # the default; nodes omit medium entirely
```

`core.md` — the root. The brand soul. No `under`.
```markdown
---
id: core
---
# Intent
This is a working tool, not a marketing surface. People are here to scan,
compare, and act — reward fast eyes. We are calm, dense, and honest; we never
decorate a number we can't stand behind.

# Composition
Default to information density. Whitespace earns its place only when it speeds
comprehension, never for "breathing room."
```

`analytics.md`
```markdown
---
id: analytics
under: core
---
# Intent
The headline metric is legible in under a second. The chart explains the
number; it never replaces it.

# Inventory
- One hero metric, period-over-period delta beside it.
- Chart below the fold of the number, not above.

# Composition
Numbers before charts. Default to the last meaningful period, not the
prettiest range.
```

`item-detail.md` — note it deliberately *breaks* the global density rule.
```markdown
---
id: item-detail
under: core
relates: [analytics] (contrasts)
---
# Intent
One item, fully expressed. This is the one place the product is allowed to
breathe — the user has chosen this thing and deserves its whole story.

# Composition
Lead with identity + status; details on demand. Generous spacing here is
correct, not a violation.
```

`rel/density-tension.md` — the relationship-node (tier 3). The *most teachable
content in the whole fingerprint*: it explains why two surfaces disagree on
purpose.
```markdown
---
id: rel/density-tension
relates: [analytics, item-detail]
---
# The tension
Analytics and item-detail pull opposite directions on density, and that is
intentional. Analytics serves comparison across many things — density wins.
Item-detail serves attention on one thing — space wins.

# What it protects
If a future contributor "fixes" item-detail to match the dashboard's density,
they will have destroyed the one place the product slows down. This node exists
so that divergence reads as a decision, not an inconsistency.
```

`checks/numbers-first.md` — a check is just a node whose body is an assertion,
placed `under` what it governs.
```markdown
---
id: checks/numbers-first
under: analytics
---
The hero metric is rendered as a number before any chart in the DOM order, and
is legible without interaction.
```

**`gather analytics`** walks up: `core` → `analytics`, pulls the `contrasts`
neighbor's headline + the density-tension relationship-node (because it touches
analytics), and the check under analytics. The packet an agent gets:

> Calm, dense, honest (core). Numbers before charts, hero metric in <1s,
> last meaningful period (analytics). Note: density here deliberately contrasts
> item-detail — see the tension (don't homogenize). Check: hero metric is a
> number before any chart, legible without interaction.

**What A teaches now:** the model is genuinely invisible at small scale — five
content nodes, zero `medium`, one tiny tree. And the first real payoff is the
**relationship-node**: the dashboard's hardest-won knowledge ("these two
disagree on purpose") finally has a home that a flat rules list or a bare typed
edge could never give it.

---

## Scenario B — a monorepo: 3 products, shared visuals

Three products doing different things, one shared visual language. The shared
brand is its own contract; each product *consumes* it and links across the
package boundary.

```
packages/
  brand/.ghost/                 # @acme/brand  (published, shared)
    core.md                     #   voice, color, trust DNA
    table-language.md
  ops/.ghost/                   # @acme/ops    (data-dense tool)
    core.md
    data-table.md
  studio/.ghost/                # @acme/studio (creative canvas)
    core.md
    canvas.md
```

`packages/brand/.ghost/core.md`
```markdown
---
id: core
---
# Intent
One company speaking. Calm, direct, never breathless. Trust is shown by
provenance, not by badges. This holds in every product that consumes this brand.
```

`packages/ops/.ghost/core.md` — a product root that links *into* the brand
package (the cross-package ref grammar, `package#ref`).
```markdown
---
id: core
relates: ["@acme/brand#core"] (inherits)
---
# Intent
Ops is the data-dense end of the brand. We inherit the company voice and trust
stance, and push information density harder than any sibling — operators live
here all day.
```

`packages/ops/.ghost/data-table.md`
```markdown
---
id: data-table
under: core
relates: ["@acme/brand#table-language"] (variant)
---
# Intent
The shared table language, pushed to maximum density: tighter rows, inline
sparklines, no decorative padding.

# Composition
Inherit the brand's column rhythm and sort affordances; override only spacing.
Provenance stays visible on every figure (brand trust stance).
```

**What B teaches now:** "one contract per package" (one-road) holds — but the
**cross-package `relates` link** (`@acme/brand#table-language`) is what lets
siblings share DNA without copy-paste. The `(variant)` qualifier tells `drift`
these are *meant* to be related-but-different, so divergence between ops's table
and the brand table reads as intentional. `compare @acme/ops @acme/studio` can
now ask "do both still sound like one company?" by comparing what each links to
in `@acme/brand`.

---

## Scenario C — marketing: email, flyer, billboard, slides

No "pages." A node is a *bounded message* that renders into several media. This
is where `medium` becomes the heart of the value.

```
.ghost/
  manifest.yml
  core.md
  launch.md                       # the message (medium-agnostic intent)
  launch.email.md                 # rendered for email
  launch.billboard.md             # rendered for billboard
  launch.slides.md                # rendered for a deck
  rel/glance-discipline.md        # relationship-node across media
  checks/billboard-brevity.md
```

`manifest.yml`
```yaml
package: "@acme/marketing"
# multi-medium: nodes carry their own medium; no single default
```

`launch.md` — the intent. `medium: any`, so it cascades to every rendering.
```markdown
---
id: launch
under: core
medium: any
---
# Intent
One idea, stated with confidence: what changed and why it matters to *you*.
Never a feature list. Tone is assured, not breathless.
```

`launch.billboard.md` — a child rendering, medium-bound. (This is what we
*almost* invented a `projects` edge for — it's just `under` + a `medium` tag.)
```markdown
---
id: launch.billboard
under: launch
medium: billboard
---
# Composition
Six words maximum. One focal image. Readable at 70mph from 100 meters. If it
needs explaining, it is not a billboard.
```

`launch.email.md`
```markdown
---
id: launch.email
under: launch
medium: email
---
# Composition
Subject line is the headline — it must stand alone in an inbox. One CTA above
the fold. The deep story is a click away, never in the body.
```

`rel/glance-discipline.md` — a relationship-node tying the billboard rendering
to a constraint that, surprisingly, recurs elsewhere in the brand.
```markdown
---
id: rel/glance-discipline
relates: [launch.billboard, launch.slides]
---
# The shared discipline
The billboard and the opening slide are the same problem: one idea, read in a
glance, no second chance. They are not "a billboard" and "a slide" — they are
two expressions of *glanceability*. Treat a change to one as a question about
the other.
```

`checks/billboard-brevity.md` — a medium-scoped check.
```markdown
---
id: checks/billboard-brevity
under: launch
medium: billboard
---
≤ 6 words of copy. Exactly one focal element. No URL longer than the brand name.
```

**`gather launch --medium billboard`** walks `core` → `launch` (medium: any,
included) → `launch.billboard` (medium matches), pulls the glance-discipline
relationship-node and the billboard-only check, and **excludes** `launch.email`
(wrong medium). The agent generating the billboard never sees "above the fold."

**What C teaches now:** "a node = a place" is fully dead — `launch` renders into
zero screens; it's pure intent. The `medium` tag does all the routing, and the
cascade (`launch` is `medium: any`) carries the shared voice into every medium
while each child holds its own discipline. The relationship-node captures a
non-obvious brand truth (billboard ≈ opening slide) that no per-medium rule list
could surface.

---

## Scenario D — a generative voice-first super app

Voice-driven; the AI generates screens on the fly; it infers context and can act
proactively. There is no fixed screen inventory. The fingerprint stops
*describing surfaces* and starts *governing generation*.

```
.ghost/
  manifest.yml
  core.md
  voice.md                        # the primary modality
  generated-screen.md             # ephemeral visual, summoned by voice
  proactive.md                    # system-initiated, no prompt
  rel/screen-is-an-aside.md
  checks/never-proactive-transact.md   # when: runtime
```

`core.md`
```markdown
---
id: core
---
# Intent
We respect attention as the scarcest resource. We state what is true and what
matters, then get out of the way — whether spoken, shown, or offered unasked.
```

`proactive.md` — this is the new center of gravity for D: a *stance*, not a
description. (Deferred `governs` link noted; modelled as `relates (governs)` for
now.)
```markdown
---
id: proactive
under: core
medium: voice
relates: [generated-screen] (governs)
---
# Intent (stance)
The system may act before being asked only when all three hold: confidence is
high, the action is reversible, and the cost of being wrong is low. Otherwise it
*offers*; it does not *do*.

# Composition
Never proactively transact. Interrupt only at the user's stated thresholds,
never the system's convenience.
```

`generated-screen.md`
```markdown
---
id: generated-screen
under: core
medium: generated-screen
---
# Intent
A summoned screen is read in the gap between two spoken sentences. One answer,
one optional action. It is a visual aside to a conversation, not a destination.

# Composition
Design for transience: it disappears when the conversation moves on. No
navigation, no dwelling.
```

`checks/never-proactive-transact.md` — a **runtime** check, evaluated at
generation time, not in CI.
```markdown
---
id: checks/never-proactive-transact
under: proactive
medium: voice
when: runtime
---
No generated action that moves money or makes a commitment fires without an
explicit, in-the-moment user confirmation.
```

**`gather proactive --medium voice`** at runtime returns: core's attention
stance → the proactive stance (the three-part rule) → the governs link to
generated-screen → the runtime check. The generating system uses this packet as
the *grammar* for the action it is about to take.

**What D teaches now:** the contract's job inverts — it *governs generation at
runtime*. Two new needs surface honestly: a **runtime check mode** (`when:
runtime`) and a real **`governs`** relationship (deferred; faked as a qualified
`relates`). The node-and-link model holds; it just gets consumed live instead of
at review time. Surfaces here are *classes* the runtime instantiates — the tree
holds the types, the runtime makes the instances.

---

## Scenario E — all of the above are one brand (the superset)

Dashboard + sibling apps + marketing + voice future, one design soul. Realized
as a **fleet with a shared brand contract**: each regime is its own package,
all consuming `@acme/brand`, all linking back to the one root.

```
packages/
  brand/.ghost/          # @acme/brand — the soul. core/voice, core/trust, core/clarity
  console/.ghost/        # Scenario A
  ops|studio/.ghost/     # Scenario B
  marketing/.ghost/      # Scenario C
  super/.ghost/          # Scenario D
```

`packages/brand/.ghost/core.md` — medium-agnostic, the ancestor of everything.
```markdown
---
id: core/voice
---
# Intent
Calm, direct, never breathless. We respect attention as the scarcest resource.
This holds whether it is a billboard, a settings toggle, an email subject, or a
proactive voice nudge.
```

The power move — one intent, expressed across four regimes, all traceable to it.
In `marketing`, `super`, and `console`, a node links to the *same* brand node:

```markdown
# packages/marketing/.ghost/launch.billboard.md
relates: ["@acme/brand#core/clarity"] (expresses)
```
```markdown
# packages/super/.ghost/generated-screen.md
relates: ["@acme/brand#core/clarity"] (expresses)
```

And the relationship-node that *only* E can express — kinship across the
marketing↔voice boundary, the single most valuable node in the whole fleet:

`packages/brand/.ghost/rel/glanceable-everywhere.md`
```markdown
---
id: rel/glanceable-everywhere
relates:
  - "@acme/marketing#launch.billboard"
  - "@acme/super#generated-screen"
---
# The shared idea
The billboard and the AI-generated screen are the same problem at opposite ends
of the brand: one idea, read in a glance, no second chance. They inherit the
billboard's discipline, not the dashboard's density. This kinship is a brand
truth — when one changes, ask whether the other should.
```

**`compare`/`drift` find their highest purpose here:** because the marketing
billboard and the voice screen both `relates → @acme/brand#core/clarity`, drift
can ask *"have these two expressions of clarity drifted apart?"* — a question
only askable because they share a parent intent in the graph. That is the entire
thesis of Ghost, shown at full scale: **provably consistent (one source node),
appropriately varied (per-medium children), and traceable (every expression
links home).**

**What E teaches now:** the brand soul *must* live at a medium-agnostic root and
everything else expresses it via cross-package links. The fleet is not one giant
file or one giant tree — it is **many small contracts sharing one root**, held
together by `relates` links across package boundaries and a handful of
relationship-nodes that capture cross-regime brand truths. The model scales by
*staying small per package and linking*, never by growing one monolith.

---

## What we are building (the read-back across all five)

- **A node is design expression** — a body written through intent / inventory /
  composition, not a row in a schema.
- **The tree (`under`) carries the cascade** — brand soul → regime → message →
  rendering. Consistency comes for free from inheritance.
- **`medium` is the one Ghost-native tag** — absent at small scale (A), central
  for marketing/voice (C, D), and the thing that lets one intent render many
  ways (E).
- **Relationships come in three tiers** — cheap `under`, light qualified
  `relates`, and rich **relationship-nodes** where design *rationale* lives. The
  relationship-nodes are where Ghost's editorial depth actually sits.
- **Cross-package `relates` (`package#ref`)** is how a brand spans repos, teams,
  and release cadences without merge or stacks (B, E).
- **Checks are nodes** placed `under` what they govern, optionally `medium`-
  scoped, optionally `when: runtime` (D). They map back to the fingerprint
  structurally — a violation names the node it broke.
- **`gather` is a traversal** — walk up the tree, filter by medium, pull
  relationship-nodes and checks, hand the agent a packet. The context grabber,
  unchanged in spirit from relay.
- **Nobody hand-authors the graph** — a skill discovers nodes, proposes
  placement and links, weaves them into prose (OKF's authorship discipline), and
  lint guards the invariants tolerantly.

The shape, in one sentence: **a fleet of small, linked, markdown design-context
graphs that an agent traverses to assemble exactly the right design guidance for
the thing it is about to generate — in any medium, traceable all the way back to
one brand soul.**
