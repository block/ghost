# ghost-ui

**Reference design system for the Ghost project. 97 components, shadcn registry, not published to npm.**

`ghost-ui` is the design language Ghost dogfoods its fingerprint against. It's distributed as a shadcn registry (`registry.json`) for drop-in consumption, not as an npm package. If you're looking for the drift-detection tool, that's [`ghost-drift`](../ghost-drift). This package exists so the fingerprint has a real, evolving system to describe.

## What's here

- **Components** — 49 UI primitives (Radix-based) + 48 AI elements (chat, streaming, agent UI) + theme + hooks.
- **Tokens** — `src/styles/` CSS custom properties consumed by the registry and the fingerprint.
- **Registry** — `registry.json`, shadcn-compatible catalogue. Rebuilt by `just build-registry`.
- **Fingerprint** — `fingerprint.md`, the canonical design description this system evolves by.

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
