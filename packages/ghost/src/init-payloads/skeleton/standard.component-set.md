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

One view is an anecdote. A view read as an exemplar teaches its structure
and its deviations at the same time, and the deviation is invisible from
inside the file. So the exemplar shows how the pattern is expressed, while
what the pattern *is* comes from counting across the area. Where the nearest
view and the wider count disagree, the count wins: a component used across
many views is the decision, and a single file departing from it is that
file's exception to justify, not a precedent to copy.

The sharpest form of this: a cluster of utility classes doing structural
work — dividers, spacing rhythm, elevation, grouping — is a component that
was not reached for. Before hand-writing one, search the component set for
those exact classes. When a shared component contains them, that component
owns the concern, and writing the classes directly forks it in place. This
is how a set silently loses its grip: not by anyone rejecting a component,
but by copying the classes out of a view that had already done so.

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
- Establish what the pattern is by counting across the area, not from the
  one view read as the exemplar.
- When the exemplar departs from what the count shows, follow the count.
- Before hand-writing utility classes that do structural work, search the
  component set for those classes; when a shared component carries them, use
  that component.
- Style one-off needs at the call site.

## Never

- Never rely on a written list of what the set contains — read the set.
- Never infer a component's behavior from its name alone — open it and read
  the props.
- Never take a large view as the pattern reference when a smaller one covers
  the same composition; large views carry accumulated exceptions.
- Never treat one view as evidence of the pattern — count across the area
  before following what a single file does.
- Never reproduce structural utility classes copied out of an exemplar
  without checking whether a shared component already carries them; that
  forks the component instead of using it.
- Never add a variant or prop to a shared component for a single screen —
  style at the call site until a second and third caller want the same
  thing.
- Never introduce a second way to assemble a surface the repo already
  assembles one way — follow the existing structure or change it everywhere.
