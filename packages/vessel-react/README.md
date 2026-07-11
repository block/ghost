# vessel

**Reference design system for the Ghost project. 100 components, shadcn registry, not published to npm.**

`vessel` is the reference component system Ghost uses to exercise registry
and agent-integration workflows. It's distributed as a generated shadcn registry
(`public/r/registry.json`) for drop-in consumption, not as an npm package. If you're
looking for the brand-fingerprint CLI and skill bundle, that's
[`@design-intelligence/ghost`](../ghost).

## Registry convention

Vessel is Ghost's agnostic, agent-safe reference body: a coherent implementation
vocabulary a product fingerprint can inhabit, not the brand truth for every
Ghost consumer. A consuming repo owns its product stance, flows, copy, trust
obligations, and visual-language decisions through its own `.ghost/`
fingerprint; Vessel supplies reusable materials and safe authoring paths, not
universal brand law.

Vessel is not latest shadcn with a logo, not an extracted product UI kit, and
not a sealed design system. It follows shadcn's copy-and-own model: upstream
syncs adopt mechanical improvements (accessibility, ARIA, keyboard behavior)
and adapt useful anatomy through Vessel's own token contract, but reject
generic visual decisions that widen the authoring surface (raw palette
classes, arbitrary values, component-local theme hacks). Downstream product
forks are evidence to mine for reusable discipline, never a source to copy
wholesale.

Two invariants govern changes to Vessel's design-system direction:

- **Token contract.** `primitive values -> semantic roles -> narrow Vessel
  extensions -> Tailwind utility bridge`. Primitive values are the only broad
  place for literal color material; shared UI authors against semantic roles
  first (`background`, `foreground`, `card`, `muted`, `accent`, `primary`,
  `destructive`, `border`, `ring`, …); Vessel extensions stay narrow and
  job-named (composer surfaces, message surfaces, tool/reasoning status).
  Never reintroduce broad duplicate aliases (`background-alt`, `surface-card`).
- **Escape hatches are governed, not banned.** Prefer variants, slots, and
  tokens before `className`; promote a recurring override into a named Vessel
  decision instead of repeating the override; keep arbitrary values and raw
  palette utilities out of normal component source without a documented
  reason; back hard rules with a check that can count or reject the unsafe
  path, rather than relying on review prose alone.

Registry metadata on high-impact items should name intent, when to use it,
when not to, safe variants, common misuses, and token roles — decision
metadata, not just source.

This workspace carries a repo-local `.ghost/` fingerprint (a flat corpus of
prose nodes plus checks) governing Vessel itself: the token contract,
agent-safety discipline, registry shape, and the boundary between reference
vocabulary and product brand truth. It does not define product-specific flows,
copy, trust obligations, or business intent for consuming apps. New products
should reference this package and the generated `public/r/registry.json`, then
author their own brand fingerprint separately. It doubles as a living exemplar
of the Ghost format. Start with the cover declared in `.ghost/manifest.yml`.

Agents should read this README, `.ghost/`,
`public/r/registry.json`, `registry.json`, `.shadcn/skills.md`, and source files
when integrating components.

The shadcn registry entries can carry opportunistic, namespaced item metadata:

- **`meta.agent_decision`** per high-impact item — the Orbit-style decision packet agents should read before source. It names the component's intent, when to use it, when not to use it, safe variants, common misuses, and token roles.
- **`meta.fingerprint_dimensions`** per item — declares which embedding dimensions a component primarily expresses (`palette`, `spacing`, `typography`, `surfaces`). Drift tooling can use this for higher-confidence per-component attribution; absent the field, consumers fall back to file content and registry categories.

Shape-aware examples can add two more optional `meta` fields:

- **`meta.exemplar_kind`** — `atom` for primitive controls such as badge, button, cell, or input; `shape` for composed outputs.
- **`meta.response_shapes`** — the composed shape(s) an example demonstrates: `article`, `tracker`, `comparison`, or `card`.

That distinction helps generators pick relevant references instead of treating every example as a card. `card` is one response shape; it is not the default form of all intelligence.

## What's here

- **Components** — 52 UI primitives (Radix-based) + 48 AI elements (chat, streaming, agent UI) + theme + hooks.
- **Tokens** — `src/styles/` CSS custom properties consumed by the registry and components.
- **Registry** — `public/r/registry.json`, generated shadcn-compatible catalogue for consumption. Source entries live in `registry.json`; rebuilt by `just build-registry`.
- **Ghost reference context** — `.ghost/`, used as reference-registry context by consuming products.
- **Agent context** — `.shadcn/skills.md`, generated from the registry and component sources for AI assistants.

## Use

Consume via the shadcn registry (the intended path — not npm):

```bash
npx shadcn add <registry-url>/<component>
```

Or build the library locally for workspace linking:

```bash
pnpm --filter @design-intelligence/vessel-react build:lib
```

See [`apps/docs`](../../apps/docs) for the live component catalogue.

## MCP server

`vessel` also ships a `vessel-mcp` bin — a Model Context Protocol server that re-exposes the component registry to AI assistants (Claude Code, Cursor, etc.) so they can discover and install components without a human in the loop. 5 tools, 2 resources. Source lives in `src/mcp/`, built separately via `tsconfig.mcp.json` → `dist-mcp/`.

```bash
pnpm --filter @design-intelligence/vessel-react build:mcp
node packages/vessel-react/dist-mcp/bin.js   # stdio server
```

Wire it into your MCP host by pointing at the `vessel-mcp` bin.

## License

Apache-2.0
