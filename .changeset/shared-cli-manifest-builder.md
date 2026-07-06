---
"@design-intelligence/ghost": minor
---

Add a `ghost manifest --format json` command that emits a self-describing manifest of every command and flag, so a host agent can discover the CLI in one call instead of scraping `--help`. The terminal help, docs-site manifest, and this command all derive from one shared `buildCliManifest()` (also exported from `@design-intelligence/ghost/cli`).
