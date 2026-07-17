---
name: capture
description: Author repo-local ghost packages as a flat set of prose nodes.
handoffs:
  - label: Inspect the package
    command: ghost validate
    prompt: Does this ghost package validate, and what is absent?
---

# Recipe: Author ghost Package

**Goal:** record durable brand guidance in `.ghost/` as a flat set of prose
**nodes**. If a change is uncommitted, it is draft work. If it is checked in,
ghost treats the `.ghost/` package as canonical.

```text
.ghost/
  manifest.yml          # schema + id
  glossary.md           # the kind vocabulary + what each kind means
  principle.trust.md    # guidance of kind `principle`
  pattern.invoice.md    # a pattern with an optional ## Skeleton
  anti-goal.generic.md  # a review-critical replacement rule
  voice.md              # guidance without a kind
```

A **node** is a markdown file: a `description`, optional `materials`, and a
prose body. The package is **flat** — no hierarchy, no inheritance, no edges. A
node's kind comes from its filename prefix; the glossary declares the kinds.

## Lead with an annotated exemplar over a complete artifact

The strongest steering artifact is not a summary; it is a complete on-brand
artifact with annotation. Capture the whole thing, then name what the agent
should preserve and what is incidental.

`exemplar.status-card.md`:

````markdown
---
description: Complete status card exemplar — normative for density, evidence placement, and action language.
materials:
  - src/components/status-card.tsx
---

Normative for the opening fact, square edge, evidence placement, and accountable
action. The exact invoice count and dates are incidental.

```tsx
<section className="border-l border-[#D8DED8] bg-[#F7F5EF] p-6 text-[#17201B]">
  <p className="text-xs uppercase tracking-[0.14em] text-[#2F6F4F]">Bank sync</p>
  <h1 className="mt-3 text-2xl font-semibold">3 deposits need matching</h1>
  <p className="mt-2 max-w-prose text-sm">
    They total $8,410 and arrived between Jul 12 and Jul 15.
  </p>
  <button className="mt-6 border border-[#17201B] px-4 py-2 text-sm">
    Match deposits — about 4 minutes
  </button>
</section>
```

What makes it ours: the surface opens with an accountable fact, keeps evidence
next to the claim, uses square structure instead of floating cards, and prices
the user's next action in time. Do not copy the exact amounts, dates, or class
names unless the implementation path confirms them.
````

The annotation is load-bearing. A bare sample teaches form; the annotation
teaches which features of the form are intentional, which stops an agent from
copying incidental details.

Protect exact voice artifacts the same way. A real on-brand error message
out-steers a paragraph about error-message voice:

`exemplar.error-voice.md`:

```markdown
---
description: A verbatim on-brand error message — the voice at failure moments.
---

Normative for rhythm and stance at failure moments; match its form, not its words.

> We couldn't save your changes. Your work is still here — try again, and if it
> keeps failing, we'll hold onto everything while you sort it out.

What makes it ours: leads with what happened, not with apology. States what is
safe before what to do. One calm next step. No "Oops," no exclamation points,
no blame on the user or the network.
```

## Write patterns as bound and open

A pattern node binds part of a reusable structure and leaves the rest open.
State both explicitly:

- **Bound** — what the agent should not redecide: the structural moves fixed
  regardless of task (what renders first, what appears exactly once, what may
  never compete for attention).
- **Open** — where the agent may choose, within limits (which evidence shape
  fits, how tone flexes, where secondary content may go).

If everything is bound, the node is a template, not a pattern. If nothing is
bound, it is vibes, not steering. A pattern may also `Refines:` a broader
principle by id; when the two conflict, the principle wins.

## Add Skeletons when the opening structure matters

A `## Skeleton` section contains the literal opening structure the agent should
start from. Use it on a pattern node when the first tokens determine whether the
surface lands in the right shape.

Rules:

- Put exactly one fenced block in each `## Skeleton` section. `ghost validate`
  warns when there are zero or multiple fences.
- Make the block complete enough to begin from, but not so complete that it
  invents task-specific facts.
- Keep explanation above the `## Skeleton`; `ghost pull` extracts skeleton
  fences and emits them dead last under the banner to begin from this structure.
- If a pulled skeleton matches the requested surface, write it first verbatim,
  then fill it with the task's facts and materials.

## Write rules only after concrete artifacts

Rules are useful when they name the decision that survives across examples.
Keep them short, specific, and attached to concrete objects whenever possible:

- exact values when the agent keeps inventing values;
- never/always invariants when a hard line is crossed;
- conditions in prose when guidance applies only in a situation;
- decision traces when two plausible choices keep competing.

Do not turn every observation into a rule. Stale or generic rules average
against the exemplars and pull the packet back toward the median.

## Write anti-goals as replacement, not as blacklist

An anti-goal is ordinary node prose whose kind the glossary defines as a
review-critical replacement rule.

A good anti-goal states **not X; instead Y; recognize the switch by Z**. The
replacement matters because negation alone raises the salience of the rejected
thing.

`anti-goal.generic-ui.md`:

```markdown
---
description: Review-critical replacement for the generic AI dashboard default.
---

Not: rounded-xl cards on gray-50, indigo primary buttons, gradient hero text,
emoji headings, and "You're crushing it" optimism.

Instead: flat paper surfaces, one restrained accent, square alignment, and a
next action backed by the number or source that justifies it.

Recognize the switch: if removing the logo would make the surface look like any
SaaS template, the anti-goal failed even when every token is technically valid.
```

The strongest anti-goal is silent: purged from exemplars, absent from starter
structures, and enforced by a probe-backed check in review. Use anti-goal prose
to name the replacement; use checks and `probe:` commands to catch regressions.

## The node shape

A node at `principle.trust.md` (id `principle.trust`, kind `principle`):

```markdown
---
description: Trust at the payment moment.  # the retrieval payload
# optional: materials, audience, stage, or other free-form keys
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness...
```

- **`description`** is how an agent finds the node: a compact retrieval payload
  naming what the node governs, the observable condition under which it applies,
  and what it contributes when useful. `ghost gather` emits id, kind,
  description, concrete coverage, payload labels, and material count; the agent matches the ask
  against applicability.
- **Kind is the filename prefix** and must be a kind the glossary declares. A
  bare name (`voice.md`) has no kind.
- **Altitude lives in the prose.** State universal guidance plainly; give a
  narrower guidance a **condition** — the situation it applies in — in the prose
  and usually in the description. Do not use broad universal imperatives unless
  universal retrieval is intended. Never file a node by destination
  (`for-emails.md`).
- **Concreteness is derived.** A node carries concrete material when it has
  `materials`, a substantial fenced example, or a `## Skeleton`. You do not
  declare a separate type.

## What a node body answers

While drafting, ask three questions of every node — *why* (the stance), *with
what* (the materials), and *how it is assembled* (the patterns). These are
drafting prompts, never frontmatter keys, node types, or required sections, and
a node may answer only one. Each answer lands as a steering dimension the
machinery already scores:

- **why** lands as stance prose — read first in `ghost pull`, weakest at
  moving output form on its own; it is the yardstick every later selection is
  measured against.
- **with what** lands as `materials` and concreteness — affects pull packet
  order and `ghost review` matching. See [blocks.md](blocks.md) for authoring
  material-backed nodes.
- **how it is assembled** lands as patterns and `## Skeleton` sections — the
  strongest steering; Skeleton fences are extracted and emitted dead last so
  generation starts from them.

Keep a node **purpose-coherent**: one coherent decision, any length. Split only when it
contains a separate decision with different applicability.

## Node prose stances

Node prose is steering payload. A generic sentence in a node body averages every
future generation toward the median, so hold drafts to these stances before the
human sees them.

Two carve-outs come first, because they invert ordinary prose advice:

- **Anti-goals keep their negation.** "Not X; instead Y; recognize the switch
  by Z" is the required anti-goal form. Naming the rejected thing is the
  anti-goal's job; never "improve" one by stating only the replacement.
- **Invariants keep their absolutes.** "Never" and "always" are correct in an
  invariant when the hard line is real and human-ratified. Absolutes are lazy
  only when they stand in for an uncurated stance.

Everywhere else:

- **No aspirational abstractions.** "We value clarity and trust" steers
  nothing. Name the decision the guidance forces: what gets picked when two goods
  compete, and what gets given up.
- **Descriptions must discriminate.** Read the description alone. If it also
  fits a competitor's brand, it is retrieval-dead; rewrite it until it could
  belong to no one else.
- **Cut unratified hedges.** "Generally," "where possible," and "consider" in a
  node body mean the human never picked a side. Get the ratification or cut the
  sentence.
- **Ban brand-deck filler.** "Elevate," "delight," "seamless," "best-in-class,"
  "empower." When a brand doc supplies these words, they are testimony to
  distill, never prose to keep.
- **Settle the altitude on purpose.** Every node is either claimed universal
  or given its condition in the prose. A node body that does neither was never
  curated for altitude; ask the human which it is.

## Score drafts before curation

Before handing drafts to the human (step 5), rate each node 1 to 5 per
dimension:

| Dimension | Question |
| --- | --- |
| Testimony | Can you quote the human words or artifact this node came from? |
| Discrimination | Does the description fit only this brand? |
| Force | Does the node body decide something, or merely describe something? |
| Altitude | Is it universal on purpose, or given its condition? |
| Residue | Is it free of starter-demo prose and brand-deck filler? |

Below 20 of 25, the node goes back to the interview, not into the package. The
score is a drafting gate for the agent; the human's keep/soften/reject verdict
in curation still decides what becomes canonical.

## Author through steering jobs

The steering jobs are questions, not mandatory fields. Encode the guidance in the
strongest form that fixes the observed failure.

| If the agent keeps... | Author... |
| --- | --- |
| missing the guidance | sharper `description`; move universal guidance to the cover |
| inventing values | `asset.*` node with materials and exact names |
| producing generic output | `anti-goal.*` replacement plus annotated `exemplar.*` |
| choosing the wrong structure | `pattern.*` with bound/open and a `## Skeleton` |
| crossing hard lines | invariant prose plus a check, optionally with `probe:` |
| applying guidance too broadly | condition in prose |
| making bad tradeoffs | `decision.*` trace |
| producing correct but forgettable work | scoped `concept.*` |

A `concept.*` node holds a one-time creative move — a launch hook, a
campaign idea, a specific non-median leap the corpus would not have produced
by recombining its other guidance. Scope it explicitly to the task or surface
it was written for, keep it distinct from invariants, and do not generalize
it into permanent brand law. If it proves reusable later, promote it into an
exemplar or pattern deliberately; do not let a one-off default into durable
guidance through accumulation.

Ask while authoring:

- What complete artifact shows the brand at its best?
- What should be copied from this exemplar, and what is incidental?
- What generic output would an agent probably produce?
- What does this brand refuse, and what replaces it?
- What real material should the agent inspect?
- What opening structure should be preserved?
- What hard line would you block in review?
- When would this guidance reverse?

## Steps

### 1. Classify the authoring scenario

Decide which posture fits before scaffolding. Follow
[authoring-scenarios.md](authoring-scenarios.md) when setting up or substantially
revising a ghost package. Human intent anchors the guidance; what the human says and
shows — words, images, links, exemplars — is the evidence; agent synthesis is
draft work until a human curates it and Git review accepts it.

Monorepos and product suites run **one contract per package**.

### 2. Initialize

```bash
ghost init            # scaffolds the steering starter
ghost validate
```

`ghost init` seeds the skeleton starter: the manifest, a starter
`glossary.md`, a `brand.md` cover, foundation chapters with open questions, and
the model cliche floor. Replace open questions with real product guidance before
using it to steer generation. Use `ghost init --template minimal` for a
manifest, glossary, cover, and cliche floor.

Write the manifest-declared cover as the human-curated front door:
non-negotiables that apply to every task, what the package covers, and any
stricter silence posture. `ghost gather` inlines it before the menu, so anything
that must never be missed belongs there.

Nodes may carry a `materials` list in frontmatter: repo-relative paths/globs or
HTTPS URLs for the concrete materials the prose governs. Put brand-owned
materials that should survive export or refactors under `materials/`; point at
living app code where the implementation itself should stay in place. Optional
review checks live under `.ghost/checks/` (`ghost checks init`) and are
feed-back only; they are never gathered.

### 3. Shape the glossary

Declare the kinds you will use in `glossary.md` — the frontmatter `kinds` list
plus a `#` section per kind explaining its meaning and normative weight. Kinds
are your choice; ghost ships no fixed vocabulary. A node's filename prefix must
match a declared kind (or the node has no kind).

The glossary is a dictionary of every term with defined meaning in the corpus.
A root `voice.md` with a `voice` glossary entry declares the scope for future
`voice.<slug>.md` nodes; declaring a kind with zero or one users is good
hygiene, not over-structure.

### 4. Orient

Elicit the brand from the human, not from a codebase. Interview for stance,
audience, anti-goals, and exemplars; ask for the material they can show —
screenshots, links, exemplar products, brand docs, copy they love or hate. Treat
every artifact as evidence to curate, never guidance to copy verbatim. Repo-bound
reality can be recorded as `materials` on the node whose prose explains its
purpose.

### 5. Write sparse nodes

Add the smallest useful set of nodes, each carrying purpose-coherent prose guidance
answering why, with what, or how it is assembled, named `<kind>.<slug>.md` or a
bare slug. Draft only what the
human said or showed. State conditions as situations in the prose. Prefer a small amount of focused, well-grounded guidance over a noisy catalog. Hold each draft to the node prose
stances and score it before curation; a node below the gate returns to the
interview. Ask the human to keep, soften,
reject, or re-title important claims before treating draft nodes as durable.

### 6. Validate

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, glossary kind prefixes,
material locators, check references, and Skeleton fence counts.
Undeclared kind prefixes and malformed Skeleton sections are warnings.

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never derive brand guidance from repo code alone; what a codebase repeats may
  be legacy, not stance. Use repo paths as `materials` only when the prose guidance
  has been curated.
- Never draft a node the human neither said nor showed.
- Never invent a hierarchy, inheritance, or cross-node edges — the package is
  flat.
- Never file a node by destination; state its condition in the prose.
- Never ship a blacklist-only anti-goal; state the replacement and enforce the
  hard line in review.
