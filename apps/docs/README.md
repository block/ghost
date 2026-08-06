# ghost site

Public thesis site and development log for ghost. Astro renders the site as
static HTML and keeps the gather example as a small React island. The site
consumes [`vessel-react`](../../packages/vessel-react) for its shared styles.

The site does not publish product documentation. Current command behavior lives
in `ghost --help` and `ghost <command> --help`.

## Run

```bash
pnpm --filter ghost-docs dev
```

Build and preview:

```bash
pnpm --filter ghost-docs build
pnpm --filter ghost-docs preview
```

GitHub Pages builds with `DEPLOY_BASE=/ghost/`.

## Write a log entry

Add `src/content/log/YYYY-MM-DD-slug.mdx` with exactly these fields:

```yaml
---
title: what changed
date: YYYY-MM-DD
summary: one sentence for the index and feed.
---
```

The log is a development record. State what materially changed and why. Do not
turn an entry into product documentation or a speculative roadmap. Preview the
entry locally, then run `pnpm check:terminology` from the repository root.
