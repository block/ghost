# Invariants

Properties that must hold across all valid states of this repo. These are not preferences — they are constraints that shape what Ghost is.

**For agents:** treat violations as conflicts to surface, not tradeoffs to weigh. If a requested change contradicts an invariant, say so before proceeding.

**For humans:** invariants are amendable, but amending one is a distinct act. A commit that changes an invariant should say so explicitly in the message, and should land in its own PR — not bundled with feature work.

---

## 1. The CLI is deterministic.

No CLI verb calls an LLM. No CLI verb takes an API key as a required input. Outputs must be reproducible from inputs plus the code at a given SHA.

**Why:** Ghost is BYOA. The contract with consumers is that the CLI gives ground truth (math, parsing, validation) and the host agent provides judgement. A verb that calls an LLM breaks that contract — outputs stop being reproducible, and the "deterministic primitives" thesis collapses.

**Override:** Never inside a verb. If an LLM-dependent capability is needed, add it as a library export (pattern: `computeSemanticEmbedding`). The CLI stays clean.

---

## 2. expression.md is the single canonical artifact.

One on-disk format per expression. No parallel JSON/YAML/TOML/DTCG representations. No compiled variants. Readers parse `expression.md` directly.

**Why:** Expressions are meant to be read by humans, edited by LLMs, and diffed in PRs. Multiple formats fracture all three. The artifact lives where design decisions already live — in the repo, versioned with code.

**Override:** Never for storage. Ephemeral runtime artifacts (composite centroids, cached embeddings) may exist in memory but must not be checked in or loaded as expressions.

---

## 3. The frontmatter / body partition is strict.

Frontmatter holds the machine layer: identity, tokens, dimension slugs, evidence paths. Body holds the prose layer: Character, Signature, decision rationale. Prose does not leak into frontmatter; structured data does not leak into prose.

**Why:** The partition is what makes expressions simultaneously human-readable and machine-comparable. Blurring it forces one audience to do the other's work. The linter enforces it at the boundary; this invariant enforces it in spirit.

**Override:** Never. New fields are placed by layer, not by convenience.

---

## 4. Judgement lives in the skill bundle, not the CLI.

Profile, review, verify, generate, and discover are recipes the host agent executes. They are guidance in Markdown, not automation in code. The CLI does not wrap them.

**Why:** BYOA means harnesses vary — Claude Code, Codex, Cursor, Goose, whatever ships next. A Markdown recipe is portable; a `ghost profile` verb that assumes a specific LLM is not. Keeping judgement out of the CLI is also what keeps the CLI small enough to trust.

**Override:** New verbs may *support* recipes with new read modes (like `describe`) or new outputs. But no verb subsumes a recipe's judgement loop.

---

## 5. Expressions evolve by deliberate act, not by schedule.

An expression changes when a human or agent deliberately edits it — in a design PR, an `track`, or a `diverge`. There is no background re-profile. There is no drift-triggered auto-update.

**Why:** An expression that silently re-profiles is no longer a contract. The whole point of `track` / `ack` / `diverge` is that drift becomes *a visible act with a stance*. Automatic updates hide the act and collapse governance into noise.

**Override:** Never. Tooling may suggest re-profiling (e.g., after a major refactor), but the act itself is always explicit and human-authored.

---

## 6. CLI verbs are orthogonal.

Each verb does one thing. No verb subsumes another. No `--mode` flag swaps a verb to a different conceptual operation.

**Why:** A small orthogonal surface is a product; a large overlapping surface is an accumulation. The current surface (`compare`, `lint`, `ack`, `track`, `diverge`, `emit`, `describe`) is a principled minimum — any addition must justify itself against merging with an existing verb.

**Override:** New verbs are fine when they capture a genuinely new operation. New flags are fine when they refine behavior within the same operation. Rule of thumb: if explaining the flag requires "if X, the verb actually does Y," it's a new verb.
