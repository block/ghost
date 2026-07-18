# ghost-docs

**Documentation site for the ghost project.**

`ghost-docs` is the deployed documentation for ghost: how agents author and use brand guidance from a `.ghost/` package, plus the supporting CLI reference. It is a Vite + MDX app that consumes [`vessel-react`](../../packages/vessel-react) as a workspace dependency.

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
