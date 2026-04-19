---
name: CLI Consolidation Plan
status: draft — 2026-04-19
owner: nahiyan
branch: refactor/fingerprint (or a follow-up branch)
---

# Ghost CLI consolidation — 18 verbs → 9

## Target surface

```
# Produce
ghost profile [targets]        # extract expression.md from target(s) (unchanged)
ghost emit <kind>              # derive static artifacts from expression.md
                               #   kinds: review-command, context-bundle
ghost generate <prompt>        # LLM-produce UI artifact from expression (unchanged)

# Check
ghost review [scope]           # unified drift detection
                               #   scopes: files (default), project, suite

# Compare
ghost compare <a> <b> [...]    # N-way expression comparison
                               #   flags: --semantic, --cluster, --temporal

# Govern
ghost ack                      # acknowledge drift stance (kept at top level — coherent trio)
ghost adopt <source>
ghost diverge <dim>

# Utility
ghost lint [expression]        # expression.md hygiene (unchanged)
ghost discover [query]         # find public systems (unchanged)
ghost viz <...>                # 3D visualization (unchanged)
```

**9 top-level verbs.** Three removed (`scan`, `expr-diff`, `fleet`), three absorbed (`comply`, `verify`, `context`), one absorbed (`diff` — the component-vs-registry one, see phase 5).

---

## Old → new mapping

| Old | New | Notes |
|---|---|---|
| `scan` | **removed** | Legacy; required `ghost.config.ts`. Supersed by `review project`. |
| `profile` | `profile` | unchanged |
| `compare a b` | `compare a b` | unchanged |
| `compare a b --temporal` | `compare a b --temporal` | unchanged |
| `expr-diff a b` | `compare a b --semantic` | merged |
| `fleet a b c …` | `compare a b c … [--cluster]` | merged; N ≥ 2 auto-fleet |
| `diff [component]` | `compare --components [component]` | merged (rarely used) |
| `comply [target] [--against]` | `review project [target] [--against]` | merged into review |
| `verify [expression]` | `review suite [expression]` | merged into review |
| `review [files]` | `review [files]` or `review files [files]` | kept as default scope |
| `discover [query]` | `discover [query]` | unchanged |
| `ack` | `ack` | unchanged |
| `adopt <source>` | `adopt <source>` | unchanged |
| `diverge <dim>` | `diverge <dim>` | unchanged |
| `viz <…>` | `viz <…>` | unchanged |
| `context [expr]` | `emit context-bundle [--expression …]` | merged into emit |
| `emit <kind>` (currently only `review`) | `emit <kind>` | kind renamed `review` → `review-command` for clarity |
| `generate <prompt>` | `generate <prompt>` | unchanged |
| `lint [expr]` | `lint [expr]` | unchanged |

---

## Phase breakdown

Each phase is one PR. Phases are independent; stopping at any point leaves the CLI coherent.

### Phase 1 — Low-risk wins (delete + merge diff-verbs)

**Removes:** `scan`, `expr-diff`, `fleet`, `diff` as top-level verbs.

**Changes:**
- Delete `scan` command and its `src/scan.ts` codepath.
  - Guard: check no test or doc depends on `scan`. Grep shows CLI doc page references it.
- Extend `compare` to accept N arguments.
  - When N=2: pairwise (current behavior).
  - When N≥3 or `--cluster`: fleet comparison (current `compareFleet`).
- Add `--semantic` flag to `compare`: dispatches to `diffExpressions` instead of `compareExpressions` (vector).
- Add `--components` flag to `compare`: dispatches to the existing `diff()` codepath (local vs registry).
- Remove old files: `expr-diff-command.ts`, fleet bits in `evolution-commands.ts` (keep ack/adopt/diverge), scan logic.

**Touched files:**
- `packages/ghost-cli/src/bin.ts` — remove scan block, expand compare block
- `packages/ghost-cli/src/expr-diff-command.ts` — delete
- `packages/ghost-cli/src/evolution-commands.ts` — remove `registerFleetCommand`
- `packages/ghost-core/src/scan.ts` — delete (verify no imports)
- `packages/ghost-core/src/index.ts` — drop `scan` export
- Docs: `README.md`, `apps/docs/src/app/docs/cli/page.tsx`, `skills/ghost-profile/SKILL.md`
- Tests: remove/update scan tests, expr-diff tests; add compare-with-N tests

**Public API note:** `scan` is exported from ghost-core. Removing it is a breaking change at the library level. Since ghost is 0.2.0, acceptable. Flag in release notes.

**Exit criteria:** `pnpm check && pnpm test && pnpm build` green; help text shows 14 verbs (was 18).

---

### Phase 2 — Emit consolidation (context + emit → one verb)

**Merges:** `context` into `emit`.

**Changes:**
- Rename `emit` kinds for clarity:
  - `emit review` → `emit review-command` (explicit: produces `.claude/commands/design-review.md`)
  - Add `emit context-bundle` → current `context` behavior (writes `ghost-context/` dir)
- Keep `context` as a deprecated alias for one release that prints a warning and forwards to `emit context-bundle`.
- Delete `context-command.ts`; fold logic into `emit-command.ts`.

**Touched files:**
- `packages/ghost-cli/src/emit-command.ts` — expand kind dispatch
- `packages/ghost-cli/src/context-command.ts` — delete (or keep as thin deprecated shim)
- `packages/ghost-cli/src/bin.ts` — remove `registerContextCommand` import/call
- Docs, SKILL.md

**Rationale for not folding `generate`:** `generate` takes a user prompt, does LLM calls, has its own retry/review loop. It's a runtime command, not a static derivation. Keep separate.

**Exit criteria:** `ghost emit review-command`, `ghost emit context-bundle` work; `ghost context` still works with deprecation warning; 13 verbs (or 12 once `context` is removed next release).

---

### Phase 3 — Drift consolidation (the big one)

**Merges:** `comply` and `verify` into `review` as scopes.

**Changes:**
- Introduce scope subcommands on `review`:
  - `ghost review` / `ghost review files [files]` — current review behavior (code drift in files)
  - `ghost review project [target] [--against parent.md]` — current comply behavior
  - `ghost review suite [expression] [--suite …]` — current verify behavior
- First positional is treated as scope name if it matches `files|project|suite`; otherwise treated as file list (backward compat for bare `ghost review src/`).
- Keep `comply` and `verify` as deprecated aliases for one release.

**Flag surface for `review`:**
```
Common:
  --format <fmt>          cli | json | github | sarif (not all scopes support all)
  --expression <path>     override expression source

review files [files]
  --staged                staged changes only
  --base <ref>            git diff base
  --dimensions <list>     palette,spacing,typography,surfaces
  --all                   all lines, not just changed

review project [target]
  --against <parent.md>   drift check against parent
  --max-drift <n>         threshold (default: 0.3)
  --verbose               agent reasoning

review suite [expression]
  --suite <path>          custom suite json
  -n <count>              subsample
  --concurrency <n>
  --retries <n>
```

**Touched files:**
- `packages/ghost-cli/src/review-command.ts` — major rewrite: scope dispatch
- `packages/ghost-cli/src/verify-command.ts` — delete or shim
- `packages/ghost-cli/src/bin.ts` — remove comply block; remove verify registration
- Core: `packages/ghost-core/src/review/pipeline.ts` stays; `verify/` stays; the Director's `comply` method stays (library API preserved)
- Docs: biggest rewrite here — review is now three pages, not three commands
- Tests: expand review test to cover scope dispatch; keep verify/comply tests targeting the library APIs

**Library API invariant:** `review()`, `verify()`, and `Director.comply()` all stay exported from `@ghost/core`. This is what the GitHub Action uses. The CLI restructure is presentation-layer only.

**Exit criteria:** 10 verbs (9 after removing deprecation shims). The four drift verbs are now one.

---

### Phase 4 — Flag hygiene on `profile`

Not verb-level but worth doing while the CLI is unstable.

**Changes:**
- Unify output flags:
  - Drop `--emit-legacy` (legacy format is read-only supported; don't write it).
  - Keep `--emit` as "write expression.md to project root" convenience.
  - Keep `--output <file>` for explicit path; extension (.md / .json) picks format.
  - Drop `--format` on profile — it conflicts with `--output`. Use `--output -.json` or `-.md` if a user really wants to choose.

Actually, the above reduces to: keep `--emit` (convenience) and `--output` (explicit). Drop `--emit-legacy` and `--format`.

**Touched files:** `bin.ts` profile block, `profile.ts`, docs.

**Exit criteria:** `ghost profile` has 6 flags instead of 9.

---

### Phase 5 — Optional: governance grouping

**Deferred.** Not worth the churn.

`ack` / `adopt` / `diverge` are already a coherent trio, three verbs with clear meanings. Grouping under `ghost evolve <stance>` would cost a migration for no readability win. Skip unless user feedback says otherwise.

---

## Documentation surface to update

Per phase, rewrite:
- `README.md` — CLI reference table
- `CLAUDE.md` — CLI commands table
- `packages/ghost-ui/src/app/docs/cli/page.tsx` — full CLI docs page
- `skills/ghost-profile/SKILL.md`
- Any mentions in `docs/*.md`

Docs rewrite is the single biggest non-code task per phase. Roughly 1:1 time with the code work.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Library API changes break GitHub Action | API untouched — only CLI presentation changes. Verify `action/index.ts` imports still resolve after each phase. |
| User muscle memory on old verbs | Keep deprecated aliases for one release with console warnings. Remove in v0.3.0 or v0.4.0. |
| Docs drift behind code | Treat doc rewrites as blocking for each PR, not follow-up. |
| Phase 3 is invasive | Ship phases 1–2 first; they stand alone. Phase 3 can be its own focused PR. |
| Hidden consumers | Grep `ghost-cli` and `ghost profile|compare|review|comply|verify|scan|diff|expr-diff|fleet|context|emit|generate|ack|adopt|diverge|lint|viz|discover` across the repo before each phase. |

---

## Recommended order

1. **Phase 1** (delete scan, merge diff verbs) — ship now, standalone win.
2. **Phase 4** (profile flag cleanup) — ride along with phase 1 or just after. Tiny.
3. **Phase 2** (emit consolidation) — ship next, self-contained.
4. **Phase 3** (drift consolidation) — ship last, most invasive, highest payoff.
5. **Phase 5** — skip.

Total code time estimate: ~1–2 days per phase including docs and tests. Phase 3 is closer to 2 days.

---

## Not in scope

- Renaming `profile` (parked — keeping `profile`).
- Renaming `expression.md`.
- New commands.
- Changing the library API (`@ghost/core` exports).
- Touching the Director orchestration layer.

The scope is CLI surface only. Core stays stable.
