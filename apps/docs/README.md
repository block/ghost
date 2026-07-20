# ghost site

Public thesis site for ghost. It is a Vite app that consumes
[`vessel-react`](../../packages/vessel-react) as a workspace dependency.

The site does not publish product documentation or expose a navigation menu.
Current command behavior lives in `ghost --help` and `ghost <command> --help`.

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

Not published as a package; deployed as a static site.
