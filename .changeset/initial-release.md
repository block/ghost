---
"ghost-drift": minor
---

Initial public release. Deterministic design drift detection for agent-authored UI:

- **Six CLI verbs** — `compare` (pairwise + fleet over 49-dim fingerprints, with `--semantic` and `--temporal` enrichment), `lint`, `ack`, `adopt`, `diverge`, and `emit` (derives `review-command`, `context-bundle`, or the `ghost-drift` skill).
- **`fingerprint.md` format** — human-readable Markdown with a YAML machine layer (49-dim embedding + palette/spacing/typography/surfaces/roles) and a three-layer prose body (Character, Signature, Decisions). Parse, lint, diff, compose, and compare programmatically via the library export.
- **Library API** — `parseFingerprint`, `lintFingerprint`, `diffFingerprints`, `compareFingerprints`, `compareFleet`, `loadFingerprint`, `defineConfig`, and the full `@ghost-drift` core usable headlessly from any Node app.
- **Agent skill bundle** — `ghost-drift emit skill` installs an [agentskills.io](https://agentskills.io)-compatible bundle (`profile`, `review`, `verify`, `generate`, `discover`, `compare` recipes + schema reference) into your host agent of choice. The CLI never calls an LLM; the host agent owns all interpretive work.
