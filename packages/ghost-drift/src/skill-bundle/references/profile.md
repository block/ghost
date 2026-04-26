---
name: profile
description: Write expression.md from a project's design sources.
handoffs:
  - label: Compare against another expression
    skill: compare
    prompt: Compare the expression.md I just wrote against another expression
  - label: Emit a project-scoped drift review command
    command: ghost-drift emit review-command
    prompt: Emit a per-project review command derived from this expression.md
---

# Recipe: Profile a project into expression.md

**Goal:** produce a valid `expression.md` that captures the project's visual language. Explore the project and synthesize the result, then hand it to `ghost-drift lint` for validation.

## How to read this recipe

Steps describe **intent**, not **files**. When a step says "find where the design language is codified," it means find that thing in whatever shape this project keeps it in. The recipe does not enumerate platform or framework conventions and shouldn't need to. Map intent to source using what you know about the stack. Read what's actually there; don't assume a convention.

## Who reads this file

Three downstream agents will consume your output. Every line you write should serve at least one of them. If a line serves none, drop it.

- A **generator** produces UI from this expression. It leans on `roles[]`, the structured tokens (`palette`, `spacing`, `typography`, `surfaces`), the `# Signature` bullets, and the `# Character` paragraph for prompt-budget orientation.
- A **reviewer** flags drift in PRs against this expression. It leans on `decisions[]` and the structured tokens.
- A **comparator** computes drift distance across a fleet. It uses only the structured tokens — the embedding is derived from those four blocks.

The expression has to be portable across implementations. A brand may have a web app, an iOS app, and an Android app — each with its own expression.md, all comparable against a canonical parent. State everything at a level that survives porting.

## Steps

### 0. Decide whether you can profile

If the project has no UI (backend-only, library, CLI, …), say so and stop. Do not fabricate an expression — a placeholder poisons every downstream comparison, generation, and review.

### 1. Visceral pass — feel before tokens

Look at the project as a user would: rendered output, screenshots, the deployed product, the marketing site, the README hero, the most prominent component. Form a holistic read **before opening any styling source file**.

Capture:

- A 2–4 sentence `# Character` paragraph: what is this design language, how does it feel.
- A short list of `# Signature` bullets in **X instead of Y** form: what makes this expression visually recognizable as itself, and what it deliberately is not. Include load-bearing absences. The X-instead-of-Y shape is critical — a generator can act on it ("emit X, not Y"), and a reviewer can flag a violation ("PR added Y") without translation.
- 3–6 personality adjectives.
- 1–3 well-known references this resembles.

The visceral pass is the layer least corrupted by platform conventions and the most portable. Anchor here before tokens pull you toward whatever framework's defaults the project happened to inherit.

### 2. Locate where the design language is codified

Find the places the project _names_ its design language — where colors, typography, spacing, radii, and shadows are defined as shared vocabulary, not used inline. Use broad Glob/Grep on intent words (`color`, `theme`, `token`, `palette`, `typography`, `spacing`, `radius`, `shadow`). The exact filenames vary by stack; intent is constant. Read what's there.

### 3. Resolve references end-to-end

If a value points to another value, follow it: `--btn-bg → --color-primary → --brand-500 → #0066cc`. Record the resolved concrete value. Stopping at the first indirection produces useless expressions.

### 4. Read enough rendering to populate roles[]

Read enough component or view files to see how the design language _renders_. Find typography primitives, the most common interactive control, the most common container, the most common input. Record which tokens bind to which semantic slot — this is `roles[]`.

Use slot names that read cleanly to someone who has never seen this stack. Names that only make sense on one platform (`h1`, `LargeTitle`, `DisplayLarge`) defeat portability. Choose names that describe the slot's role across platforms (`title-xl`, `body`, `button-primary`, `card`).

After recording what you observed, audit for coverage. A generator consuming this expression will reach for slots like `title-xl`, `body`, `label`, `caption`, `button-primary`, `input`, `card`, `surface`, `divider`, `focus-ring`. For each, ask: can a generator ground here? If the project genuinely has no convention for one of these, **don't fabricate a roles entry** — record the absence as a decision in Step 5 (e.g. `### no-card-pattern` with prose like "Content sits directly on the page surface; generators should not introduce cards."). A silent missing slot forces the generator to invent; a stated absence steers it.

A project with no rendering surface produces no roles — that's truthful. A project _with_ a rendering surface but no observed bindings is a sign you didn't read enough; go back.

### 5. Name decisions, then operationalize them

For each pattern you see, write the decision at the level of **visual phenomenon** or **compositional pattern**, not implementation mechanism. If your wording would only parse for someone reading this codebase's source, raise the abstraction.

- ✗ Mechanism: "Use `box-shadow: 0 0 0 1px ...` for elevation."
- ✓ Phenomenon: "Frame elevation through narrow rings of color, not blurred drop-shadows."
- ✓ Composition: "Cards sit on muted surfaces, never directly on white. Forms use 24 between groups, 8 within."

Composition is a first-class kind of decision — spatial relationships, what-sits-on-what, hierarchy rules — alongside element-surface properties. Look for both.

A decision is strongest when it states **the pattern** _and_ **how to spot a violation** — that single shape serves both generators (which way to lean when picking) and reviewers (what to flag in a diff):

> ### warm-only-neutrals
>
> Every gray carries a yellow-brown undertone. Reviewers: flag grays in the cool quadrant (hue 180–270°) as drift.

Pick whatever dimensions actually fit. There is no fixed list. Absences are decisions ("no animation — interactions are immediate", "no cards — content sits directly on the page surface") if you observed the absence. Don't invent decisions to justify colors. Don't restate categories ("Spacing follows a 4px grid") without naming the consequence.

### 6. Record the structured tokens

Populate `palette`, `spacing`, `typography`, `surfaces` from what you resolved in Step 3. Use unit-normalized numeric magnitudes — the schema treats them as platform-neutral; implementations translate (web px / iOS pt / Android dp align at 1× display density). Output colors as hex; the CLI computes oklch automatically.

### 7. Write the file (body first, then frontmatter)

Copy [../assets/expression.template.md](../assets/expression.template.md) as a starting point. Write in this order:

1. **Body first.** `# Character` (the paragraph from Step 1), `# Signature` (the X-instead-of-Y bullets from Step 1), `# Decisions` (one `### <dim>` block per decision from Step 5, each containing pattern + operationalization).
2. **Frontmatter second.** Derive the structured fields from the body and the steps above: `observation.personality`, `observation.resembles`, `decisions[].dimension` (slug-match your `### <dim>` headings), `decisions[].evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`.

Body-first avoids orphan-prose lint errors and keeps the prose primary. See [schema.md](schema.md) for which field lives where — the partition is strict.

### 8. Calibrate against known anchors

Before validating, sanity-check your personality tags by comparing against 1–2 well-known systems:

    ghost-drift compare expression.md path/to/known/expression.md --semantic

If you tagged "editorial / restrained" but the comparator says you're closer to Material than to Notion, the tags are wrong. See [discover.md](discover.md) for finding anchors.

### 9. Validate

    ghost-drift lint expression.md

Fix any errors. Common ones:

- Prose in frontmatter → move to body.
- `### dim` block in body with no matching `decisions[]` entry, or vice versa → align or remove.
- Evidence cites a hex with no matching palette entry → fix or drop.

### 10. Sanity check

    ghost-drift compare expression.md expression.md    # self-distance should be 0
