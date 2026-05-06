# ghost-ui

**Reference design system for the Ghost project. 97 components, shadcn registry, not published to npm.**

`ghost-ui` is the reference component system Ghost uses to exercise registry and agent-integration workflows. It's distributed as a shadcn registry (`registry.json`) for drop-in consumption, not as an npm package. If you're looking for the drift-detection tool, that's [`ghost-drift`](../ghost-drift).

## Registry convention

This package intentionally does not carry package-local Ghost scan artifacts (`map.md`, `survey.json`, or `fingerprint.md`). It stays a component registry. Agents should read this README, `registry.json`, `.shadcn/skills.md`, and source files when integrating components.

The shadcn `registry.json` can carry opportunistic, namespaced item metadata:

- **`meta.fingerprint_dimensions`** per item — declares which embedding dimensions a component primarily expresses (`palette`, `spacing`, `typography`, `surfaces`). Drift tooling can use this for higher-confidence per-component attribution; absent the field, consumers fall back to file content and registry categories.

Shape-aware examples can add two more optional `meta` fields:

- **`meta.exemplar_kind`** — `atom` for primitive controls such as badge, button, cell, or input; `shape` for composed outputs.
- **`meta.response_shapes`** — the composed shape(s) an example demonstrates: `article`, `tracker`, `comparison`, or `card`.

That distinction helps generators pick relevant references instead of treating every example as a card. `card` is one response shape; it is not the default form of all intelligence.

## What's here

- **Components** — 49 UI primitives (Radix-based) + 48 AI elements (chat, streaming, agent UI) + theme + hooks.
- **Tokens** — `src/styles/` CSS custom properties consumed by the registry and components.
- **Registry** — `registry.json`, shadcn-compatible catalogue with optional `meta.fingerprint_dimensions` extensions. Rebuilt by `just build-registry`.
- **Agent context** — `.shadcn/skills.md`, generated from the registry and component sources for AI assistants.

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
