---
name: materials
description: Bind ghost guidance to concrete material in formats agents can use directly.
---

# Recipe: Bind Guidance To Concrete Material

**Goal:** make the intended continuation cheaper than the generic one without
turning the package into a second implementation or a fixed template library.

Concrete material commonly does three jobs:

| Form | What it constrains | What it buys |
| --- | --- | --- |
| Tokens | values and role names | stops plausible near-miss colors, sizes, and durations |
| Skeletons | opening structure | commits layout before a generic structure wins the first tokens |
| Components | reusable decisions | compresses variants, states, spacing, and behavior into names |

## Scope is not delivery

Scope says how much a material constrains. Delivery says whether the agent actually
receives it. Skeletons live in node bodies and `ghost pull` emits them last.
Files behind `materials` arrive only when pulled or inspected. Material the
agent never reads contributes nothing.

Anything that must never be missed belongs in prose or a Skeleton. Anything
behind `materials` must repay the inspection turn: explicit, skimmable, and
contract-first.

## Ship the syntax the agent emits

Every transform between what the agent reads and writes is an error
opportunity. If it reads `color.background.default: "#fafafa"` in nested JSON
but must write `var(--background)`, the model must reconstruct the mapping under
attention pressure. Near-miss names are priors filling that gap.

When a build pipeline owns the source of truth, point `materials` at the output
the agent writes against, not an upstream representation. Name each file;
glob patterns are invalid because a live repo can make them capture unintended
content.

## Choose only what helps

**Tokens are the visual floor.** Use one flat, contract-first file in the
emission syntax. For CSS, lead with a comment such as `/* style only with these
custom properties; never hardcode colors or timing. */`, then group flat
`--name: value` pairs by role. In a utility codebase, name the emitted classes
in prose and point to the built stylesheet. Avoid markdown token tables and
nested source JSON when the output uses neither.

**Skeletons are earned by composition-critical openings.** Put exactly one
fenced block under `## Skeleton`, in the target medium, with real token or class
names and `{placeholders}` for task facts. Include only enough structure to
commit the shape. A Skeleton in a materials file forfeits guaranteed delivery.

**Components are earned by repeated, diverse surfaces.** The source is the API
reference. Point to each component file explicitly and keep prose to usage
grammar: purpose, reach-when, neighboring alternative, and never. Do not copy
props into markdown. For a class vocabulary, lead each class block with a
one-line contract comment so a skimming agent can recover the grammar.

Examples are ordinary materials. When a complete runnable surface helps, point
to it and follow the example guidance in [nodes.md](nodes.md). Name the file for
the shape it shows, such as `composition.form.html`, not for arbitrary content.

Absence can be the correct stance. A package that asks agents to compose fresh
from tokens may reject a component kit. A package that values variation may use
few Skeletons. The reason for absence must be explicit.

## Bind a component library

An OSS component library should ship its own `.ghost/` packet beside the code,
then let adopters copy and own both. The packet is a taste floor, not the
consumer's brand.

1. Vendor or install the components and packet together.
2. Repoint every `materials` locator to the receiving repo's exact files.
3. State in the cover that local brand guidance overrides the vendored floor.
4. Give prose only to components whose purpose or divergence is not generic.
5. Put token and theming invariants in contract nodes.
6. Add checks only for countable, review-critical invariants.
7. Run `ghost validate`; dead-locator warnings identify paths that moved.

For a familiar library, the model may already know the API. Guidance still
matters for restraint and choice: which variant when, what not to combine, and
which neighboring component fits instead. For a novel library, the component
source supplies missing API knowledge; prose supplies the usage decision.

Do not add a component schema, registry mirror, or prop manifest to ghost. Those
copies drift. `materials` locates implementation; the node body explains why
and when.

## Bundle or reference

Put brand-owned artifacts that must travel through export or survive refactors
under `.ghost/materials/`: token output, logos, type files, motion data, and
portable examples. Reference living components, stories, tests, and styles at
their repository paths. Guidance stays in prose in both cases.

Use external locators when the authoritative material remains external. Add a
short `note` only when the locator itself does not tell the agent what it will
find.

## Copies drift

Concrete material repeats decisions from the prose. After changing guidance,
tokens, or component contracts, sweep Skeletons, components, examples, and
checks for stranded names or literals. Delete any copy whose maintenance cost
exceeds its steering value.

`ghost pull` inlines each distinct local material once per pull. Later nodes
keep a pointer to the first copy, so sharing a material across nodes is safe and
does not inflate its salience.

## Concrete self-check

1. Where does the emitted value vocabulary live?
2. What commits the most composition-critical opening?
3. Which reusable decisions are compressed into source-backed names?
4. What material shows decisions working together when prose is not enough?
5. Will the agent actually receive or inspect each material?
6. Is each material in the syntax the agent will emit?
7. Which copy goes stale when the underlying decision changes?

Any answer may be "absent, because." An unexplained absence is the gap.

## Never

- Never point materials at globs, directories, or generated junk.
- Never duplicate component APIs or pipeline source formats in prose.
- Never add concrete material only because a design-system convention says to.
