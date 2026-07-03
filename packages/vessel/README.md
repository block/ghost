# vessel

**Reference design system for the Ghost project. 100 components, shadcn registry, not published to npm.**

`vessel` is the reference component system Ghost uses to exercise registry
and agent-integration workflows. It's distributed as a generated shadcn registry
(`public/r/registry.json`) for drop-in consumption, not as an npm package. If you're
looking for the fingerprint capture and drift-review tool, that's
[`@anarchitecture/ghost-fingerprint`](../ghost).

## Registry convention

Vessel is Ghost's agnostic, agent-safe reference body: a coherent implementation
vocabulary a product fingerprint can inhabit, not the brand truth for every
Ghost consumer. Before changing its design-system direction, read the Phase 0
invariants in [`../../docs/vessel-agent-safe-reference-system.md`](../../docs/vessel-agent-safe-reference-system.md).
They define how Vessel relates to upstream shadcn, downstream product forks,
Ghost, and Orbit-style LLM-safe design-system discipline.

This workspace carries a repo-local Ghost reference bundle in `.ghost/`.
`.ghost/intent.yml` and `.ghost/inventory.yml` describe Ghost UI as implementation vocabulary: tokens,
component families, registry shape, and reference-registry boundaries. It does
not define product-specific flows, copy, trust obligations, or business intent
for consuming apps. New products should reference this bundle and the generated
`public/r/registry.json`, then fill their own surface-composition fingerprint
separately.

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
pnpm --filter @anarchitecture/ghost-vessel build:lib
```

See [`apps/docs`](../../apps/docs) for the live component catalogue.

## MCP server

`vessel` also ships a `vessel-mcp` bin — a Model Context Protocol server that re-exposes the component registry to AI assistants (Claude Code, Cursor, etc.) so they can discover and install components without a human in the loop. 5 tools, 2 resources. Source lives in `src/mcp/`, built separately via `tsconfig.mcp.json` → `dist-mcp/`.

```bash
pnpm --filter @anarchitecture/ghost-vessel build:mcp
node packages/vessel/dist-mcp/bin.js   # stdio server
```

Wire it into your MCP host by pointing at the `vessel-mcp` bin.

## License

Apache-2.0
