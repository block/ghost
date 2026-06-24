---
name: brief
description: Build a concise pre-generation brief from Relay JSON context.
---

# Recipe: Brief Work From Ghost Fingerprint

1. Run `ghost relay gather <target> --format json` when a target path is known.
2. For prompt-shaped work with no clear path, turn the ask into a `ghost.relay-request/v1` and run `ghost relay gather --request-stdin --format json`.
3. If the host framework stores Relay config outside `.ghost/relay.yml`, pass `ghost relay gather --config <file>` or set `GHOST_RELAY_CONFIG=<relative-file>`.
4. Treat the full `ghost.relay.gather/v2` JSON result as the agent contract.
5. Read `context`, `selected_context`, `targetPaths`, `source`, `stackDirs`, gaps, and trace fields from JSON.
6. Start from the Relay stack, selected intent, and active obligations when `context.config.base.kind` is `fingerprint`.
7. Use request-selected `context.sections` and `context.extras` directly when `context.config.base.kind` is `none`.
8. Express that intent through selected composition.
9. Inspect matching `inventory.exemplars` as concrete generation anchors.
10. Run `ghost signals <path>` when raw repo observations would help you find evidence.
11. Skim active checks so generation avoids deterministic failures.
12. Treat Relay gaps as prompts to inspect full facet files or label local reasoning provisional.

Plain `ghost relay gather <target>` is a compact human preview. Do not scrape
that markdown as the primary agent interface; projected Relay config sources may
only be present in JSON.

The host agent owns natural-language extraction into request selectors such as
customer, brand, system, moment, medium, and capability. Ghost resolves those
selectors deterministically from declared Relay config resolvers.

`base.kind: none` means Relay is intentionally not loading a `.ghost`
fingerprint package. Expect `selected_context` to be sparse and read declared
request context from `context.sections`, `context.extras`, source, gaps, and
trace.

`ghost.relay-context/v1` includes section items, source paths, skipped context,
gaps, and selection trace. Extra project files only count as Ghost context when
they are declared as Relay config sources.

Return a short human-facing brief synthesized from JSON: relevant fingerprint
refs, product obligations, inventory exemplars and building blocks to inspect,
active checks to avoid, local evidence, and provisional assumptions when facets
are silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package.
