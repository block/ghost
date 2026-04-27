# ghost-ui

**Reference design system for the Ghost project. 97 components, shadcn registry, not published to npm.**

`ghost-ui` is the design language Ghost dogfoods its expression against. It's distributed as a shadcn registry (`registry.json`) for drop-in consumption, not as an npm package. If you're looking for the drift-detection tool, that's [`ghost-drift`](../ghost-drift). This package exists so the expression has a real, evolving system to describe.

## Canonical fixtures (the convention)

This package ships its own `expression.md` and `map.md` at the package root as canonical fixtures — the reference every other repo profiles against, the one CI runs map → expression → drift on. The shadcn `registry.json` is extended with two opportunistic, namespaced fields:

- **`meta.expression`** at the registry root — points at the package's `expression.md`. Drift consumers can resolve a registry to its design language without coupling to Ghost.
- **`meta.expression_dimensions`** per item — declares which embedding dimensions a component primarily expresses (`palette`, `spacing`, `typography`, `surfaces`). Drift uses this for higher-confidence per-component attribution; absent the field, drift falls back to repo-wide vectors.

Both extensions live under `meta` so they stay invisible to shadcn's schema. Other registries can adopt the convention without coordinating with Ghost — drop in `meta.expression`, point at any `expression.md`, and Ghost tools light up. Absence is fine; presence is progressive enhancement.

## What's here

- **Components** — 49 UI primitives (Radix-based) + 48 AI elements (chat, streaming, agent UI) + theme + hooks.
- **Tokens** — `src/styles/` CSS custom properties consumed by the registry and the expression.
- **Registry** — `registry.json`, shadcn-compatible catalogue with `meta.expression` + `meta.expression_dimensions` extensions. Rebuilt by `just build-registry`.
- **Expression** — `expression.md`, the canonical design description this system evolves by.
- **Map** — `map.md`, the navigation card (identity / topology / conventions) that downstream Ghost tools read as the topology cache.

## Use

Consume via the shadcn registry (the intended path — not npm):

```bash
npx shadcn add <registry-url>/<component>
```

Or build the library locally for workspace linking:

```bash
pnpm --filter ghost-ui build:lib
```

See [`apps/docs`](../../apps/docs) for the live component catalogue.

## MCP server

`ghost-ui` also ships a `ghost-mcp` bin — a Model Context Protocol server that re-exposes the component registry to AI assistants (Claude Code, Cursor, etc.) so they can discover and install components without a human in the loop. 5 tools, 2 resources. Source lives in `src/mcp/`, built separately via `tsconfig.mcp.json` → `dist-mcp/`.

```bash
pnpm --filter ghost-ui build:mcp
node packages/ghost-ui/dist-mcp/bin.js   # stdio server
```

Wire it into your MCP host by pointing at the `ghost-mcp` bin.

## License

Apache-2.0
