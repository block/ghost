---
for: Building or changing a view in a repo that already has a shared set of components.
---

## Usage

A repo with a shared component set has already answered most composition
questions in code. The set is the answer; this node is only how to read it.

Two questions come before writing anything. What already exists? How is it
already assembled? Both are answered by looking, not by asking for a list.
No node enumerates the set, because a written list goes stale the day a
component is added and lies quietly from then on. The source files are the
only description that cannot drift.

Read the component before using it. Its props are its contract: names,
optionality, and the union of allowed values state what it accepts more
precisely than prose about it ever would. A component that composes another
is a specialization of it — prefer the thing it composes unless the wrapper
is the reason you are there.

How often a component is used is the strongest signal the repo emits. A
component imported across many views is the paved road, whatever else is
available. A component imported two or three times is special-purpose: read
it before assuming it fits, and expect a constraint that is not in its
props.

Assembly is learned the same way. Before building a screen, find the screens
nearest it — same feature area, same kind of surface — and see which
components they import together. A set that recurs across several views is
the established pattern, and the smallest view using most of it is the one
to read. Large views accumulate exceptions; small ones show the pattern with
nothing else in the way.

When nothing in the set fits, compose from what does. A new variant on a
shared component is a change to every view that uses it, made on behalf of
one screen that has not yet proven the need.

## Rules

- Read a component's source before its first use in a change; the props are
  the contract.
- Prefer the components the repo already uses most for the ordinary case.
- Treat a component with only a handful of uses as special-purpose and read
  it fully before reaching for it.
- When a component composes another, use the composed one unless the
  wrapper's specialization is what the task needs.
- Before assembling a new view, read the smallest nearby view that shares
  most of the composition, and follow its structure.
- Match the assembly already in the repo before introducing another one.
- Style one-off needs at the call site.

## Never

- Never rely on a written list of what the set contains — read the set.
- Never infer a component's behavior from its name alone — open it and read
  the props.
- Never take a large view as the pattern reference when a smaller one covers
  the same composition; large views carry accumulated exceptions.
- Never add a variant or prop to a shared component for a single screen —
  style at the call site until a second and third caller want the same
  thing.
- Never introduce a second way to assemble a surface the repo already
  assembles one way — follow the existing structure or change it everywhere.
