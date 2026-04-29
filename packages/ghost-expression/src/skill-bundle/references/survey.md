---
name: survey
description: Scan a target and produce a bucket.json — the objective catalogue of design values, with no interpretation.
handoffs:
  - label: Interpret the bucket into expression.md
    command: (next stage — interpreter recipe)
    prompt: Interpret the bucket I just wrote into expression.md
  - label: Validate the bucket
    command: ghost-expression lint bucket.json
    prompt: Lint the bucket I just wrote
---

# Recipe: Survey a target into bucket.json

**Goal:** produce a valid `bucket.json` (`ghost.bucket/v1`) that catalogues every concrete design value the target ships, with structured specs and per-value occurrence counts. **You are the surveyor, not the interpreter.** Record what is there. Do not assign meaning. Do not write prose. Do not invent.

`bucket.json` is the middle artifact in a three-stage scan: topology (`map.md`) → objective (`bucket.json`) → subjective (`expression.md`). The interpreter (next stage) reads your bucket as ground truth and writes the prose. If you skip values or fabricate them here, the expression downstream is wrong.

## Pre-requisite

A `map.md` for the target must exist (Phase 0 — see `references/map.md`). It tells you where the design system lives — `design_system.entry_files`, `design_system.paths`, `feature_areas[].paths`, `composition.styling`, `composition.frameworks`. Without it you waste cycles re-discovering what the topology already specifies. **If `map.md` is missing, stop and run topology first.**

## Bucket schema

A `bucket.json` is `ghost.bucket/v1`:

```json
{
  "schema": "ghost.bucket/v1",
  "sources": [{ "target": "...", "commit": "...", "scanned_at": "..." }],
  "values":     [...],
  "tokens":     [...],
  "components": [...],
  "libraries":  [...]
}
```

Each row carries an `id` (deterministic SHA-256 prefix you do **not** compute by hand — see Step 6) and a `source` object (denormalize the same source entry you put in `sources[]`). Sections:

- **`values[]`** — every concrete literal that ships in the design language. `kind` is open; recommended values: `color`, `spacing`, `typography`, `radius`, `shadow`, `breakpoint`, `motion`, `layout-primitive`. Other kinds (`z-index`, `opacity`, `cursor`, `gradient`, `iconography`, `aspect-ratio`) get a `value-kind-unknown` warning but are accepted — emit them when they matter.
- **`tokens[]`** — every named token declared in source (CSS variables, theme keys, design-token entries). Each row has `name`, `alias_chain` (path through any indirection — `["--button-bg", "--color-brand-primary"]` for a two-step chain; `[]` for a leaf defined inline), `resolved_value` (end-of-chain literal), optional `by_theme` for light/dark variants.
- **`components[]`** — every named component you can confidently identify (registry entries, exported PascalCase components with variants/sizes). Loose schema: `name`, `discovered_via` (`registry.json` / `heuristic` / etc.), optional `variants[]` and `sizes[]`.
- **`libraries[]`** — every external dependency that contributes design surface (icon libraries, charting, animation, typography). `kind` is open: `icons`, `charts`, `animation`, `motion`, `fonts`, etc.

Every row needs `occurrences` (total count across the scan) and (for values) `files_count` (distinct files that contain the value). Optional `usage` breaks down by context: `{className: 30, css_var: 17}`. Optional `role_hypothesis` is a single tentative role tag (`brand-primary`, `surface-elevated`); **leave it empty if you are not sure** — the interpreter does role assignment, not you.

## Steps

### 1. Read map.md and orient

Open `map.md`. Note:

- `composition.styling` — Tailwind, CSS modules, styled-components, scss, swift-tokens, etc. Drives your extraction strategy.
- `composition.frameworks` — react, next, swiftui, compose, …
- `design_system.entry_files` — start here. These declare the canonical token set.
- `design_system.paths` — directories where the design system lives.
- `feature_areas[].paths` — surfaces worth sampling for usage counts.

Decide your extraction strategy from these signals — see Step 2.

## The exhaustiveness rule

Recall is the failure mode and the only one. A bucket missing 90% of a section's rows is a failed scan, even if every row that *is* there is well-formed — the interpreter downstream cannot recover what you didn't record.

For every section (`values[]`, `tokens[]`, `components[]`, `libraries[]`):

1. **Identify the canonical signal in this repo.** Where does the source of truth for this kind of thing actually live? It will be different in every repo — a manifest, a registry, a barrel export, a CSS declaration block, a naming convention. Use the strongest signal the repo offers.
2. **Enumerate, don't sample.** If you can count entries from the canonical signal independently, your row count must match. 6 components when the canonical signal lists 100 is a lie.
3. **Cross-check by a second method when one exists** (e.g., file count by glob vs. enumerated entries vs. import graph). If the two counts disagree by more than ~10%, you're missing entries — investigate before recording.
4. **Honest absence beats partial truth.** If the section has no canonical signal in this repo, leave the array empty rather than recording a sample. Empty is honest; sampled is misleading.

This applies regardless of dialect. The recipe doesn't tell you what the canonical signal is — it depends on the repo. Your job is to find it and enumerate it.

### 2. Choose your extraction strategy per dialect

**You write your own greps and regexes. There is no pre-built parser.** Adapt to what's actually in the repo:

- **Tailwind (Tailwind v3 / v4 with `@theme`)** — `rg -oN '\b(bg|text|border|fill|stroke|ring|outline|from|to|via|p[lrtbxy]?|m[lrtbxy]?|w|h|gap|space-[xy]|rounded(-[lrtb][lr]?)?|shadow|z|opacity)-[a-z0-9-]+(\[[^\]]+\])?' -g '*.{tsx,jsx,ts,js,html,vue,svelte}'` for class atoms. Then read `tailwind.config.{ts,js}` and any `@theme {}` block in CSS to map class atoms to literal values.
- **CSS / SCSS / CSS modules** — `rg -oN '#[0-9a-fA-F]{3,8}\b' -g '*.{css,scss,sass}'` for hex; `rg -oN '\b(rgba?|hsla?|oklch|color)\([^)]+\)' -g '*.{css,scss}'` for color functions; `rg -oN '\b[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw|fr|ch|svh|dvh)\b' -g '*.{css,scss}'` for scalars; `rg -oN -- '--[a-z0-9-]+\s*:' -g '*.{css,scss}'` for custom properties.
- **CSS-in-JS (styled-components, emotion, vanilla-extract)** — same regex set but expand `-g '*.{ts,tsx,js,jsx}'`. Watch for template literals split across lines.
- **iOS / Swift** — `rg -oN 'Color\([^)]+\)|UIColor\([^)]+\)|\.(red|blue|green|orange|brand[A-Za-z]*)\b' -g '*.swift'` for color sites; `rg -oN '\b[0-9]+(\.[0-9]+)?\b' -g '*.swift' | sort | uniq -c | sort -rn | head -50` for likely scalars (lots of noise; keep top-N by frequency).
- **Android / Compose** — `rg -oN 'Color\(0x[0-9a-fA-F]+\)|colorResource\(R\.color\.[a-z_]+\)' -g '*.kt'`; same scalar approach.
- **Token JSON / YAML** — read directly with `cat`/Read tool. Token files are usually small and structured — parse them as data, don't grep.

If the repo mixes dialects (e.g. `swiftui` + `arcade`), run extraction per dialect and merge into one bucket.

### 3. Run extraction passes — apply the exhaustiveness rule per section

The exhaustiveness rule (above) governs every section. The dialect-specific tactics here are how you implement it for `values[]` and `tokens[]`. For `components[]` and `libraries[]`, the rule is the same: find the canonical signal in *this* repo and enumerate it.

For values + tokens, sloppy grep undercounts silently. Discipline:

- **Multiple passes per kind.** Don't trust your first regex. After your color pass, run a second pass with a slightly different pattern and check the delta. New rows = your first pass missed.
- **Cross-check counts.** When you record a row with `occurrences: 47`, run `rg -c '\b#f97316\b' .` against the full repo and verify. If the count differs by more than ~10%, your regex is missing something — refine and re-pass.
- **Frequency clustering.** After the first sweep, list candidate values by frequency: `rg -oN '#[0-9a-fA-F]{6}' -g '*.css' | sort | uniq -c | sort -rn`. The top values are almost always real palette entries. Long-tail values are often comments, hashes, or test fixtures — verify before recording.
- **Spread check.** If a value appears in `files_count: 1`, it's likely incidental, not part of the design language. Note the count but don't promote with `role_hypothesis`.
- **Resolve aliases exhaustively.** Every named token declared in the canonical token source becomes a `tokens[]` row. Don't sample tokens — count the declarations and match the row count. When a token's value is `var(--other)`, follow the chain to the literal; record the **token row** with the chain, and the **value row** for the resolved literal.

For components + libraries:

- **Components are countable.** Count them by whatever signal the repo offers (manifest entries, barrel exports, naming pattern under a known directory). If you can count to 50 and your bucket has 6 rows, you've sampled — go back and enumerate.
- **Libraries are countable too.** Read the manifest's dependencies. Each external library that contributes design surface (icons, fonts, motion, charts, primitives) is a row. Don't roll up by family — `@radix-ui/react-dialog` and `@radix-ui/react-popover` are two different surfaces and two different rows. (One row with a count is fine if the manifest groups them; two rows is also fine. A "..." in the name is not.)

### 4. Sample feature areas for usage counts

For each `feature_areas[]` entry in `map.md`, walk a few files to measure how the values you found in `entry_files` actually get used. This produces the `occurrences` and `files_count` numbers. Don't sample exhaustively — 3–5 files per feature area is usually enough; the goal is a representative count, not a perfect one.

Update the `usage` breakdown when context matters. Examples: `{className: 30, css_var: 17}` for a hex used in both Tailwind classes and CSS variables; `{token-resolution: 1, inline: 46}` for a hex defined once and copy-pasted everywhere (a smell worth flagging via `role_hypothesis: "ad-hoc"` or similar).

### 5. Write rows with empty IDs

Build the bucket file. For every row, leave `id` as an empty string `""`. You don't compute SHA-256 hashes by hand. Example value row:

```json
{
  "id": "",
  "source": { "target": "github:block/ghost", "commit": "abc123", "scanned_at": "2026-04-29T12:00:00Z" },
  "kind": "color",
  "value": "#f97316",
  "raw": "bg-orange-500",
  "spec": { "space": "srgb", "hex": "#f97316" },
  "occurrences": 47,
  "files_count": 12,
  "usage": { "className": 30, "css_var": 17 }
}
```

Same shape per token / component / library row, just different content fields. **Every row gets the same `source` object** (denormalized so the row survives merges with its origin attribution). Fill `sources[]` at the top of the bucket with the same single source.

### 6. Populate IDs

Run:

    ghost-expression bucket fix-ids bucket.json -o bucket.json

This recomputes every row's `id` from its content fields. Idempotent — running it again does nothing.

### 7. Validate

    ghost-expression lint bucket.json

Fix everything `lint` flags as an error. Warnings (unknown `kind`, `id-mismatch` if you skipped Step 6, etc.) are signals — investigate them, but they don't block.

### 8. Coverage check (gate before declaring done)

Before declaring the bucket done, walk each section and confirm exhaustiveness:

- **`components[]`** — what's the canonical signal in this repo? Count it independently. If your row count is below that count, you've under-recorded. Either add the missing rows or, if the section truly isn't enumerable here, leave the array empty.
- **`tokens[]`** — count the named-token declarations in the canonical token source(s) named in `map.md`. Your row count should match.
- **`values[]`** — frequency-cluster again with a fresh grep. New top-N entries that aren't in your bucket = missed.
- **`libraries[]`** — read the manifest's dependencies. Every external library that contributes design surface (icons, fonts, motion, charts, primitives, command-palette, toast, animation) is a row.

The bucket is **saturated** when another exhaustiveness pass adds fewer than ~2 new rows across all sections AND your component/token row counts match (or come very close to) an independent count of the canonical signal. If exhaustiveness disagrees with what you have, exhaustiveness wins — re-pass.

Hard stop conditions:

- ~100 files read total, OR
- ~20 minutes wall, OR
- ~200k tokens consumed.

If you hit a hard stop with exhaustiveness *not* met, write a `# Coverage` note in your scratchpad listing exactly which sections fall short and by how much. Surface it to the interpreter — it tells them which decisions are well-grounded and which aren't. **Do not pad the bucket with sampled rows to look exhaustive.**

## Always

- Use `bucket.json` as the canonical filename.
- Every value/token row carries `source`, `occurrences`, and (for values) `files_count`.
- Resolve token alias chains end-to-end. The `alias_chain` array captures the path.
- Validate with `ghost-expression lint bucket.json` before declaring success.
- After authoring rows with empty IDs, run `bucket fix-ids` exactly once.
- **Cross-check your component, token, and library counts against an independent count of the canonical signal in this repo.** Disagreement = re-pass.

## Never

- **Never write prose.** No `description`, no rationale fields. Prose is the interpreter's job.
- **Never invent values.** If you didn't observe it in source, it doesn't go in the bucket.
- **Never sample.** Either enumerate exhaustively or leave the section empty. A bucket with 6 components when the canonical signal has 100 is worse than no `components[]` at all.
- **Never assign roles confidently.** `role_hypothesis` is a *hint*, optional, and tentative. The interpreter has the final word. If you're not sure, leave it empty.
- **Never undercount silently.** If your coverage is weak (mobile dialects, custom DSLs, no canonical signal in this repo), surface it in a `# Coverage` scratchpad note and tell the interpreter.
- **Never compute IDs by hand.** Use `bucket fix-ids`.
- **Never use placeholder/glob names.** A library row with `name: "@radix-ui/react-*"` is sampling-disguised-as-a-row. Enumerate or roll up explicitly with a count.
- **Never edit a bucket after the interpreter has used it.** If you find a missed value later, re-run survey end-to-end. The bucket is the frozen ground truth between scan and interpretation.
