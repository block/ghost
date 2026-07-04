---
description: CLI exactness condition — gather when editing command docs, generated CLI help, examples, flags, exit codes, or install instructions.
materials:
  - apps/docs/src/content/docs/cli-reference.mdx
  - apps/docs/src/generated/cli-manifest.json
  - packages/ghost/src/commands/**
  - scripts/dump-cli-help.mjs
---

This condition applies whenever docs mention command names, flags, exit codes,
JSON shape, install commands, or generated help output.

When it applies:

- Treat the CLI as the source of truth. Check `ghost --help`, command-specific
  help, or `apps/docs/src/generated/cli-manifest.json` before editing examples.
- If a command or flag changed, run `pnpm dump:cli-help` so the docs manifest
  matches the CLI.
- Keep examples minimal and copy-pastable. Prefer one direct command over a
  shell story with hidden setup.
- Do not document speculative flags, adapter behavior, or workflow aliases that
  are only in the skill. If it is not in the CLI, call it an agent workflow, not
  a command.

This condition is narrower than the general docs voice. It optimizes for exact
mechanics over rhetorical smoothness.
