# ghost-docs

**Documentation site for the Ghost project.**

`ghost-docs` is the deployed docs for everything in this monorepo: the `ghost` CLI, the fingerprint memory format, the generation loop, and the live `ghost-ui` component catalogue. A Vite + MDX app that consumes [`ghost-ui`](../../packages/ghost-ui) as a workspace dependency.

## Run

```bash
just dev
# or
pnpm --filter ghost-docs dev
```

Build:

```bash
pnpm --filter ghost-docs build
```

Not published; deployed as a static site.
