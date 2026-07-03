# Vessel: Agent-Safe Reference System

> **Phase 0 invariant doc.** This document sets the rules that future Vessel
> work must preserve while reconciling latest shadcn sources, learning from
> downstream product forks, and baking in Orbit-style LLM-safe design-system
> discipline. It intentionally changes no runtime behavior.

Vessel is Ghost's reference body: a portable, shadcn-compatible component
registry that agents can use to compose AI/product interfaces. It should have
taste, constraints, and safe defaults. It must not become the brand truth for
every Ghost consumer.

## North star

> Vessel is an agnostic, agent-safe reference implementation. It provides a
> coherent body a product's Ghost fingerprint can inhabit; it does not replace
> that product's fingerprint.

A consuming repo owns its product stance, flows, copy, trust obligations, and
visual-language decisions through its local `.ghost/` fingerprint and whatever
implementation checks it chooses to run. Vessel supplies reusable materials and
safe authoring paths, not universal brand law.

## What Vessel is

- **A shadcn-compatible source-owned registry.** Components are copied into the
  consuming repo through the shadcn registry model and may be owned there.
- **A reference implementation.** Vessel demonstrates one coherent way to build
  AI/product surfaces with tokens, primitives, AI elements, and interaction
  patterns.
- **An agent-facing system.** Registry metadata, generated skills, examples, and
  component APIs should help agents choose named decisions instead of inventing
  local styling.
- **A safe default.** The baseline language should be restrained, legible,
  workbench-like, and useful for dense AI/product interfaces.

## What Vessel is not

- **Not Ghost's brand model.** Brand truths live in fingerprint prose, not in
  Vessel's registry or tokens.
- **Not an extracted product UI kit.** Downstream product forks are useful
  evidence and stress tests, not the visual source of truth for Vessel.
- **Not latest shadcn with a logo.** Upstream shadcn is raw material for
  accessibility, anatomy, and compatibility; Vessel keeps its own token contract
  and agent-safe authoring rules.
- **Not a sealed design system.** Consumers can own the code they install, but
  Vessel should make the safe path obvious and the escape path visible.

## Relationship to Ghost

| Layer | Owns | Vessel's obligation |
| --- | --- | --- |
| Ghost fingerprint | Product truth: intent, stance, composition, conditions, material locators, and optional review checks | Do not encode this into Vessel as universal law. Provide materials a fingerprint can select, interpret, and review against. |
| Vessel | Reusable implementation vocabulary: tokens, primitives, AI elements, and registry metadata | Provide coherent defaults and safe decisions without becoming product-specific. |

The seam matters: Vessel can make some low-level decisions harder to get wrong;
Ghost covers the high-altitude product truths that cannot be compiled into
component props or lint rules.

## Relationship to shadcn

Vessel follows the shadcn **copy-and-own** model. Syncing with upstream shadcn is
upstream hygiene, not visual direction.

When reconciling latest shadcn components:

1. **Adopt** mechanical improvements: accessibility fixes, Radix wiring, ARIA,
   keyboard behavior, `data-slot` conventions, React compatibility, and Tailwind
   4-compatible structure.
2. **Adapt** useful anatomy through Vessel's token contract and component API.
3. **Reject** generic visual decisions that widen the authoring surface: raw
   palette classes, arbitrary values, broad aliases, component-local theme hacks,
   or styling that bypasses Vessel's semantic roles.

Latest shadcn is a baseline to compare against. It is not authority over
Vessel's visual language.

## Relationship to downstream product forks

Real product forks show what happens when a copied registry lives inside a
shipping product and accumulates pressure. Vessel should mine that history for
reusable discipline, not copy any product wholesale.

**Take spiritually:**

- one semantic authoring contract;
- narrow product-extension tokens instead of broad alias sprawl;
- calm, dense, legible product surfaces;
- token checks that reject deleted families and raw palette drift;
- generated design-system manifests and agent-facing docs;
- real-world AI elements such as messages, tools, reasoning, code, files,
  terminals, and prompt input.

**Do not automatically copy:**

- app chrome;
- desktop-shell assumptions;
- project-specific canvas tinting unless generalized;
- profile/editor specifics;
- every glass/composer surface token;
- any brand/licensed font requirement without an explicit distribution decision;
- product surfaces that the downstream product itself excludes as precedent.

Downstream products are evidence. Vessel's job is synthesis.

## Orbit lessons Vessel adopts

Orbit's transferable lesson is: **make off-system output hard to express, not
merely discouraged in prose.** For Vessel, that means:

1. **Decision names beat values.** Prefer props, variants, tokens, and registry
   metadata that name intent (`surface=card`, `tone=muted`, `density=compact`)
   over open-ended class strings and raw values.
2. **Docs are probability; checks are contracts.** If a rule can be deterministic
   — no raw palette utilities, no deleted token aliases, no unapproved theme
   bridge names — encode it as a script/lint/check.
3. **Escape hatches must be visible.** `className`, inline `style`, arbitrary
   values, and local forks are sometimes necessary, but they should be easy to
   grep, count, and review.
4. **Theme behavior belongs in tokens.** Components should consume semantic
   roles; light/dark differences should live in the token/theme layer wherever
   possible.
5. **Registry metadata is part of the API.** Agents need to know when to use a
   component, when not to, which variants are safe, and what mistakes to avoid —
   not just its source code.

## Token contract invariants

Future token work should preserve this shape:

```text
primitive values
  -> semantic roles
    -> narrow Vessel extensions
      -> Tailwind utility bridge
```

- Primitive values are the only broad place for literal color material.
- Shared UI authors against semantic roles first: `background`, `foreground`,
  `card`, `popover`, `muted`, `accent`, `primary`, `secondary`, `destructive`,
  `border`, `input`, `ring`, and sidebar roles.
- Vessel extensions must be narrow and job-named: composer surfaces, message
  surfaces, tool/reasoning/status, chips, canvas, code/terminal affordances.
- Do not reintroduce broad duplicate aliases such as `background-alt`,
  `text-alt`, `border-strong`, or `surface-card`.
- Bridge a token into Tailwind only when component code should author it as a
  utility class. Raw-CSS-only hooks should remain raw CSS variables.

## Registry invariants

Every high-impact registry item should eventually expose decision metadata:

- intent;
- when to use;
- when not to use;
- safe variants and what they mean;
- common misuses;
- related components;
- token roles;
- optional Ghost node or check reference ids when a consuming repo provides them.

## Escape hatch policy

Vessel remains source-owned and shadcn-compatible, so escape hatches are not
banned categorically. They are governed:

- Prefer variants, slots, tokens, and safe primitives before `className`.
- Prefer adding a named decision to Vessel when the same override recurs.
- Keep arbitrary values, inline styles, and raw palette utilities out of normal
  component source unless there is a documented technical reason.
- Add checks that can count or reject unsafe paths before relying on review prose.

## Migration order this document protects

1. Reconcile with latest shadcn for upstream hygiene.
2. Normalize the agnostic token contract.
3. Re-apply Vessel's own restrained reference stance.
4. Add Orbit safety: checks, metadata, and safer component APIs.
5. Mine downstream product forks selectively for reusable AI/product patterns.

Do not invert this into "copy a product fork" or "accept latest shadcn
wholesale." Both would erase the reason Vessel exists.
