---
name: verify
description: Verify generated UI or fingerprint edits against Ghost.
---

# Recipe: Verify Ghost Work

1. Run `ghost lint .ghost` and `ghost verify .ghost --root <target>` after
   fingerprint edits.
2. Run `ghost check --base <ref>` after implementation changes.
3. For advisory review, run `ghost review --base <ref>`.
4. For generation setup, run `ghost relay gather <target> --format json` when
   a target path is known. For prompt-shaped work, create a
   `ghost.relay-request/v1` and run
   `ghost relay gather --request-stdin --format json`.
5. Consume the full `ghost.relay.gather/v2` result: `context`,
   `selected_context`, `targetPaths`, `source`, `stackDirs`, gaps, and trace.
6. If Relay config lives outside `.ghost/relay.yml`, pass
   `ghost relay gather --config <file>` or set
   `GHOST_RELAY_CONFIG=<relative-file>`.
7. If `context.config.base.kind` is `none`, expect sparse `selected_context`
   and verify the request-selected sections/extras, source, gaps, and trace.
8. Inspect generated UI manually or with screenshots when visual fidelity
   matters.

Report:

- Active-check failures and repairs.
- Advisory surface-composition drift with citations.
- Missing or unreachable evidence and exemplar paths.
- Provisional local reasoning where fingerprint facets are silent.
- Any fingerprint edits the user requested.

Fingerprint edits should be validated before handoff. Implementation-only work
does not need Ghost package edits unless the user asks for them.
