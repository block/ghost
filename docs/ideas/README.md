# Ideas

Loose space for concepts that aren't ready to be docs or a changeset but shouldn't be lost to chat history.

Read older decomposition and drift notes through
`fingerprint-first-architecture.md`: Ghost's durable artifact is the portable
fingerprint package, and map, drift, fleet, UI, adapters, and generation
workflows are tools around that contract.

Conventions:

- One file per idea, kebab-case slug (`guided-migration.md`, not `migration-rewrite.md`).
- No obligation to ship. Most of these won't.
- Optional frontmatter: `status: exploring | deferred | shipped | dropped`. Omit if it's too early to tell.
- Capture *why* it's interesting, not a full spec. Open questions are fine — often the point.

When an idea graduates, move it into `docs/` proper (or into a skill-bundle reference) and delete the stub here. When it's clearly dead, mark `status: dropped` and leave it — the dead branches are useful context later.
