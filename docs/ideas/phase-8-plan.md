---
status: exploring
---

# Phase 8 plan: command + skill + docs reconciliation

Execution spec for the final phase of `implementation-plan.md`. The command
fates were settled long ago (the "desire-survives" test); Phase 8 is **execution,
not decision** — delete the absorbed/dead commands and their relay-only modules,
update the skill bundle to teach surfaces, regenerate the manifest, and fill in
the major changeset.

## What dies (settled by command fate)

| Command | Desire now served by | Action |
| --- | --- | --- |
| `relay` | `gather` (Phase 5) | delete command + relay-only `context/` modules |
| `stack` | path→surface binding (Phase 7a) | delete `scan-stack-command.ts` |
| `survey <op>` | nothing in the new model | delete command surface |
| `diff` | dead direct-markdown path | delete command |
| `describe` | dead direct-markdown path | delete command |
| `emit` (`scan-emit`) | reassess — see below | decide |

## The entanglement to resolve first (read before deleting)

A full read shows two snags the plan's one-liner hid:

1. **`relay` and `review` share `context/` machinery.** `relay.ts` imports the
   relay-only modules (`relay-config`, `relay-config-loader`, `relay-context`,
   `relay-modes`, `relay-request`, `request-resolution`) **and** the shared ones
   (`entrypoint`, `package-context`, `projection`, `selected-context`).
   `review-packet.ts` *also* uses `entrypoint` + `selected-context`. So the
   deletion set is: **relay-only modules die; the shared context/entrypoint/
   selected-context modules stay** (review still needs them). Do not delete
   `context/` wholesale — partition it.

2. **`survey` is a command *and* a `ghost-core/survey` module** referenced by
   `fingerprint-package`, `comparable-fingerprint`, `patterns/lint`, and others.
   Command fate kills the **`survey` command surface**, not necessarily the whole
   module. **Scope decision:** delete the `survey <op>` CLI command and its
   registration; leave the `ghost-core/survey` schema/types in place if other
   modules still import them, and flag full survey-module removal as a separate
   follow-up. Deleting the module is a deeper cut than "remove a command."

## The `emit` / `review` question (decide in this cut)

- `scan-emit-command.ts` (`emit review-command`) and `review` both build on the
  Phase 7b-Cut-1 contract model now. They are **not** on the original delete
  list. `review` is the legacy advisory packet flagged for eventual replacement
  (Cut 4 note), but it still works on the contract.
- **Recommendation:** keep `review` and `emit` for now (they function on the new
  contract), and defer their replacement-by-`gather`/`checks` to a later cut.
  Phase 8 deletes only what command fate named (`relay`/`stack`/`survey`/`diff`/
  `describe`). Do not expand scope to `review`/`emit` here.

## Steps

1. **Delete the dead command sources + registrations:**
   - `relay-command.ts`, `relay.ts`, `scan-stack-command.ts`; remove their
     `register*` calls from `cli.ts`.
   - Remove the `describe`, `diff`, and `survey <op>` command blocks from
     `fingerprint-commands.ts`.
   - Remove the dead entries from `command-discovery.ts` (`stack`, `describe`,
     `diff`, `survey`).
2. **Delete the relay-only `context/` modules:** `relay-config.ts`,
   `relay-config-loader.ts`, `default-relay-config.ts`, `relay-context.ts`,
   `relay-modes.ts`, `relay-request.ts`, `relay-request-input.ts`,
   `request-resolution.ts`, `request-stack-document.ts`. Keep `entrypoint.ts`,
   `package-context.ts`, `projection.ts`, `selected-context.ts`,
   `selection-reasons.ts`, `graph.ts` (review + the resolver still use them).
   Verify each "keep" is still imported after the relay deletion; delete any that
   become orphaned.
3. **Remove the `./relay` public export** from `package.json` and the
   `GHOST_RELAY_*` / relay re-exports from the public surface. This is a breaking
   export removal — the major changeset covers it.
4. **Delete the now-skipped relay tests** (`relay.test.ts`, the
   `context-entrypoint`/`context-sandbox` skips if they only tested the dead
   path) and any `survey`/`diff`/`describe` CLI test cases.
5. **Skill bundle:** update references that still teach the old relay/scope
   surface to teach surfaces + placement + `gather`/`checks` (the `voice.md` fix
   was the preview). Audit `references/*.md` for `relay`, `scope`, `topology`,
   `applies_to` mentions.
6. **Regenerate** `pnpm dump:cli-help`; **fill in** the major changeset body with
   the full list of removed commands/exports.

## Scope boundary (what Phase 8 does NOT do)

- **No `review` / `emit` removal** — they work on the contract; their
  replacement is a later cut.
- **No `ghost-core/survey` module removal** — only the `survey` command surface;
  module removal is a flagged follow-up.
- **No `ghost.validate/v1` removal** — the legacy detector deprecation is its own
  later cut (7b parking lot).
- **No new behavior** — pure deletion + skill/docs catch-up.

## Tests

- `cli.test.ts`: remove dead-command cases; the suite must stay green with the
  smaller command set.
- `public-exports.test.ts`: drop `./relay` and the relay exports from the
  asserted surface.
- Full `pnpm test` (hook-enforced) green; `pnpm check` manifest in sync.

## Changeset

Fold into the existing `major` changeset (the cutover release). List the removed
commands (`relay`, `stack`, `survey`, `diff`, `describe`) and the removed
`./relay` export / `GHOST_RELAY_*` surface.

## Process notes

- **Partition `context/` before deleting** — confirm which modules are
  relay-only vs. shared with `review`/resolver; the compiler is the worklist for
  orphans (Phase 3/4 rhythm).
- Delete sources, then chase compile + test failures to green.
- The skill-bundle audit is prose work — grep for the dead vocabulary, rewrite to
  surfaces, mind the terminology guard (it scans shipped text; "cascade"/"layer"
  are out of public prose).
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 8 succeeds if `relay` / `stack` / `survey` / `diff` / `describe` and the
relay-only `context/` modules are gone, the shared context modules `review` still
needs survive, the `./relay` export is removed, the skill bundle teaches surfaces,
the manifest is regenerated, and the major changeset lists the removals — with
`review`/`emit`/`validate-v1`/the survey module explicitly left for later cuts.
