---
status: exploring
---

# Polish Cut C plan: collapse to one check format (remove ghost.validate/v1)

Decision (settled by the user): **two check formats make no sense — default down
to one, the markdown `ghost.check/v1`.** This escalates Cut C from the roadmap's
"keep the deterministic gate" (Option 1) to **full removal of `ghost.validate/v1`
and the `ghost check` deterministic-gate command** (Option 2).

Governance is now entirely: `ghost checks` (route + ground markdown checks) and
`ghost review` (the advisory packet over the same). The agent evaluates; Ghost
never runs a detector.

## What dies

- **`ghost.validate/v1`**: `ghost-core/checks/{schema,types,lint,routing}.ts`,
  `GhostValidateSchema`, `GhostCheck`, `routeGhostValidateForPath`, the
  `validate.yml` facet and its file-kind/dispatch.
- **`ghost check`** (the deterministic gate) and **`ghost drift ... check`'s**
  detector path — `core/check.ts`'s detector evaluation, `runGhostDriftCheck`,
  `inline-color-literals`, `gate.ts` if detector-only.
- The **`./govern`** public export and `govern.ts` (it re-exports the check
  runner).
- `validate.yml` from `ghost init` scaffolding and the package paths/loader.

## The two things to rescue first (read before deleting)

1. **`parseUnifiedDiff` lives in `core/check.ts`** and is imported by the *new*
   `review-packet.ts` and `checks-command.ts`. It is generic diff parsing, not
   validate logic. **Move it** to a neutral home (e.g. `scan/diff.ts` or
   `core/diff.ts`) before deleting `core/check.ts`, and repoint the two callers.
2. **`drift` is two things.** `ghost drift status` / `ghost drift check` operate
   on the **stance ledger** (`.ghost-sync.json`, tracked-fingerprint identity) —
   that is *not* the detector gate and must survive. Only the
   `validate.yml`-detector evaluation inside `core/check.ts` dies. Confirm which
   parts of `core/` are detector-only vs. drift-ledger before cutting.

## Open decision in this cut

**Does `ghost check` (the command name) survive, repurposed?** Today `check`
runs deterministic detectors against a diff. With detectors gone, the natural
"check a diff" verb is `ghost checks` (markdown routing + grounding).
Recommendation: **delete `ghost check`** (singular, the detector gate) and let
`ghost checks` (plural, the markdown router) be the diff-checking verb. Note the
near-collision in the changeset; it is intentional (the plural replaces the
singular).

## Steps

1. **Rescue `parseUnifiedDiff`** to a neutral module; repoint `review-packet` and
   `checks-command`; drop it from the `core` public surface if it was exported.
2. **Delete the detector gate:** `ghost check` command block in `cli.ts`,
   `core/check.ts`'s detector path, `inline-color-literals.ts`, and any
   detector-only helpers in `core/`. Preserve the drift-ledger path
   (`drift status` / `drift check` over `.ghost-sync.json`).
3. **Delete `ghost-core/checks/`** (schema, types, lint, routing) and its
   `#ghost-core` re-exports.
4. **Remove `validate.yml`** from `ghost init` scaffolding, `FingerprintPackagePaths`,
   the loader, file-kind detection + dispatch, scan-status/contribution, and
   verify-package.
5. **Remove the `./govern` export** from `package.json` and delete `govern.ts`;
   update `public-exports.test.ts`.
6. **Update the skill bundle / docs** to state one check format: markdown
   `ghost.check/v1`, routed by surface and grounded by the fingerprint.
7. Regenerate the manifest; fill the major changeset.

## Scope boundary (what Cut C does NOT do)

- **Keeps `ghost checks` / `ghost review` / `ghost.check/v1`** — the surviving
  governance surface.
- **Keeps `drift` (stance ledger)** — unrelated to detectors.
- **Keeps `ghost-core/survey`** — still its own deferred excavation.
- No new check behavior; this is removal + the diff-parser rescue.

## Tests

- Delete `ghost check` / `validate.yml` test cases (`checks.test.ts`,
  `checks-grounding.test.ts`, the cli detector cases).
- `public-exports.test.ts`: drop `./govern` and validate exports.
- Confirm `review` / `checks` still parse diffs after the `parseUnifiedDiff`
  move.
- `drift status` / `drift check` (ledger) stay green.
- Full `pnpm test` + `pnpm check` green.

## Changeset

`major` — removes the `ghost check` command, the `./govern` export, the
`ghost.validate/v1` schema and `validate.yml` facet. Note that `ghost checks`
(markdown) is the single remaining check format.

## Process notes

- **Rescue `parseUnifiedDiff` first, as its own step**, so the new commands never
  break during the deletion.
- Separate the drift-ledger code from the detector code in `core/` before
  cutting — the compiler is the worklist once the gate command is gone.
- This is the largest polish cut (~24 files reference the surface); expect a
  Phase-3-style ripple. Delete, then chase to green.
- Mind the terminology guard on changeset/skill prose.

## Read-back

Cut C succeeds if `ghost.validate/v1`, `validate.yml`, the `ghost check`
detector gate, and the `./govern` export are gone; `parseUnifiedDiff` survives in
a neutral home so `review`/`checks` still work; the drift stance ledger is
untouched; and Ghost has exactly one check format — markdown `ghost.check/v1`.
