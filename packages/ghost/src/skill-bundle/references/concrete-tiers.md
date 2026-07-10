---
name: concrete-tiers
description: Decide which concrete code tiers a fingerprint carries — tokens, skeletons, components, exemplars — and justify every absence.
handoffs:
  - label: Audit what the package carries today
    command: ghost gather
    prompt: Which nodes carry concrete material, and which of the four tiers does the package cover?
---

# Recipe: Choose The Concrete Code Tiers

**Goal:** decide, deliberately, which tiers of concrete code material a
fingerprint carries — and be able to say why any tier is absent. Absence
should be a decision, not a default.

Prose states a truth; concrete code makes it the cheapest continuation. A
package can carry code at four tiers, and each does a different job during
generation:

| Tier | Form | What it buys |
| --- | --- | --- |
| Tokens | `materials/tokens.css`, linked from nodes | Named values — the agent stops inventing colors, sizes, and durations. |
| Skeletons | `## Skeleton` HTML blocks inside pattern nodes | The opening structure — layout is committed before the generic default can win the first tokens. |
| Components | primitive classes or a class vocabulary in `materials/` | Reusable styling decisions — padding, variants, and states compress into names. |
| Exemplars | a complete surface with load-bearing moves annotated | Cross-node interactions — the constraints no single node states, demonstrated working together. |

Two properties decide whether a tier steers, and they are not the same thing:

- **Scope** — what the tier constrains: a token constrains one value, a
  skeleton one block, an exemplar one whole surface.
- **Delivery** — whether the material is guaranteed to reach the agent.
  Skeleton blocks live in node bodies, so `ghost pull` delivers them with the
  truth. Files behind `materials:` locators reach only agents that spend a
  turn reading them. A tier the agent never sees contributes nothing;
  presence in the package is not presence in context.

## The floor and the earned tiers

**Tokens are the floor.** Every package that steers visual output carries a
token vocabulary, and every other tier repeats those token names. That
repetition is the one redundancy worth keeping: the same name appearing in
prose, skeleton, and exemplar is what stops the agent from inventing
plausible near-miss values.

The other three tiers are earned by the package's shape:

- **Skeletons** pay when the package specifies few, composition-critical
  surfaces — where the first structural commitment decides everything
  downstream — and when consuming agents may read only pulled bodies.
- **Components** pay when the package covers many diverse surfaces generated
  often, and the consuming agent reads material files. A class vocabulary
  amortizes across surfaces; for a single surface shape it is dead weight.
- **Exemplars** pay almost everywhere: they are the cheapest way to show
  tiers interacting. One per distinct surface shape; a package with one
  exemplar and many surface shapes pulls every task toward the demonstrated
  shape.

## Every tier is a copy that can drift

Each tier repeats the token truth, and a stale copy steers harder than the
prose that corrects it. A hardcoded value in an exemplar where a token
exists is a lie waiting for a rename. Before adding a tier, accept its
maintenance bill; after any token change, sweep every tier for stranded
literals.

A tier can also fight the package's stance. A package whose truth is
"compose each surface fresh from the tokens" contradicts itself by shipping
a component kit; a package whose truth is "compose from the grammar, the
refs are examples not a framework" hardens toward template convergence if
every pattern carries a mandatory skeleton. When a tier and the stance
conflict, the stance wins — that absence is the package expressing itself.

## Annotate whatever code ships

Un-annotated code teaches content along with structure. Whatever tier the
package carries, split the annotation two ways: name the load-bearing moves
(what makes it this brand — copy these) and mark the incidental content
(domain, figures, labels — swap these). An exemplar without this split
teaches the agent that the example's subject matter is the brand.

## The self-check

For any package, answer four questions:

1. Where does the value vocabulary live? (If not a token file: why?)
2. What forces the opening structure of the package's most
   composition-critical surface? (If nothing: is that surface's structure
   genuinely open?)
3. What demonstrates the cross-node constraints working together? (If
   nothing: which interactions is the agent left to infer?)
4. For every tier present: will the consuming agent actually have it in
   context when it generates?

Any answer may legitimately be "absent, because" — the recipe's only
requirement is that the "because" exists.
