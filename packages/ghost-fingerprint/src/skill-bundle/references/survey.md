---
name: survey
description: Scan a target and produce a survey.json — the observed catalogue of design values, with no interpretation.
handoffs:
  - label: Interpret the survey into fingerprint.md
    command: (next stage — interpreter recipe)
    prompt: Interpret the survey I just wrote into fingerprint.md
  - label: Validate the survey
    command: ghost-fingerprint lint survey.json
    prompt: Lint the survey I just wrote
---

# Recipe: Survey a target into survey.json

**Goal:** produce a valid `survey.json` (`ghost.survey/v2`) that catalogues every concrete design value and implemented UI surface the target ships, with structured specs, occurrence counts, and surface evidence. **You are the surveyor, not the interpreter.** Record what is there. Do not assign meaning. Do not write prose. Do not invent.

`survey.json` is the middle artifact in a three-stage scan: map (`map.md`) → survey (`survey.json`) → express (`fingerprint.md`). The interpreter reads your survey as evidence and writes the compact fingerprint. If you skip values or fabricate them here, the fingerprint downstream is wrong.

The survey is exhaustive evidence, not prompt context. It should be large enough to support interpretation; the profile stage decides what becomes generation-facing fingerprint.

## Pre-requisite

A `map.md` for the target must exist (Phase 0 — see `references/map.md`). It tells you where the design system lives and where implemented UI can be observed — `design_system.entry_files`, `design_system.paths`, `surface_sources`, `feature_areas[].paths`, `composition.styling`, `composition.frameworks`. Without it you waste cycles re-discovering what the topology already specifies. **If `map.md` is missing, stop and run the map stage first.**

## Survey schema

A `survey.json` is `ghost.survey/v2`:

```json
{
  "schema": "ghost.survey/v2",
  "sources": [{ "target": "...", "commit": "...", "scanned_at": "..." }],
  "values":     [...],
  "tokens":     [...],
  "components": [...],
  "ui_surfaces": [...]
}
```

Each row carries an `id` (deterministic SHA-256 prefix you do **not** compute by hand — see Step 7) and a `source` object (denormalize the same source entry you put in `sources[]`). Sections:

- **`values[]`** — every concrete literal that ships in the design language. `kind` is open; recommended values: `color`, `spacing`, `typography`, `radius`, `shadow`, `breakpoint`, `motion`, `layout-primitive`. Other kinds (`z-index`, `opacity`, `cursor`, `gradient`, `iconography`, `aspect-ratio`) get a `value-kind-unknown` warning but are accepted — emit them when they matter.
- **`tokens[]`** — every named token declared in source (CSS variables, theme keys, design-token entries). Each row has `name`, `alias_chain` (path through any indirection — `["--button-bg", "--color-brand-primary"]` for a two-step chain; `[]` for a leaf defined inline), `resolved_value` (end-of-chain literal), optional `by_theme` for light/dark variants.
- **`components[]`** — every named component you can confidently identify (registry entries, exported PascalCase components with variants/sizes). Loose schema: `name`, `discovered_via` (`registry.json` / `heuristic` / etc.), optional `variants[]` and `sizes[]`.
- **`ui_surfaces[]`** — implemented UI specimens the design language can be inferred from. Each row has `name`, `kind` (`route`, `story`, `screen`, `fixture`, `doc-example`, `screenshot`, `source`), `locator`, `renderability` (`rendered`, `screenshot`, `source-only`, `unknown`), `files[]`, optional soft `classification`, and factual `signals`.

External libraries (icon sets, primitive collections, motion libs, charting, etc.) are intentionally *not* a survey section. Whether a system uses Radix or hand-rolls primitives doesn't change what its design language *is*. When a library matters to the design language (icon family, font sourcing), surface it in the interpreter stage as prose evidence under the relevant decision dimension instead.

Every row needs `occurrences` (total count across the scan) and (for values) `files_count` (distinct files that contain the value). Optional `usage` breaks down by context: `{className: 30, css_var: 17}`. Optional `role_hypothesis` is a single tentative role tag (`brand-primary`, `surface-elevated`); **leave it empty if you are not sure** — the interpreter does role assignment, not you.

`ui_surfaces[].classification` is a retrieval lens, not design truth. `intent` and `surface_type` are open strings; `density`, `layout_shape`, and `confidence` should be omitted unless evidence is clear. `ui_surfaces[].signals` contains observed facts only: `dominant_components`, `layout_patterns`, `breakpoint_behavior`, `value_refs`, and short factual `notes`.

When a value is observed in the primary source but resolved through a resolver source, keep both pieces of provenance. The row's `source` is where usage was observed; `resolution` is where the concrete meaning came from:

```json
{
  "source": { "id": "cash-ios", "role": "primary", "target": "github:squareup/cash-ios", "scanned_at": "..." },
  "raw": "CashTheme.Color.background",
  "value": "#ffffff",
  "resolution": {
    "status": "resolved",
    "source_id": "arcade-ios-package",
    "target": "github:squareup/arcade-ios-package",
    "symbol": "ArcadeColor.background",
    "chain": ["CashTheme.Color.background", "ArcadeColor.background"]
  }
}
```

If the resolver is unavailable or the symbol cannot be followed, still record the primary usage as a `tokens[]` row with `resolution.status: "unresolved-external"` and a `symbol` or `message`. Do not invent the concrete value.

## Steps

### 1. Read map.md and orient

Open `map.md`. Note:

- `composition.styling` — Tailwind, CSS modules, styled-components, scss, swift-tokens, etc. Drives your extraction strategy.
- `composition.frameworks` — react, next, swiftui, compose, …
- `design_system.entry_files` — start here. These declare the canonical token set.
- `sources[]` — scan source graph when the target needs upstream packages to resolve symbols. `primary` supplies usage; `resolver` supplies values.
- `design_system.paths` — directories where the design system lives.
- `surface_sources.render_strategy` — how implemented UI can be observed.
- `surface_sources.include` / `.exclude` — globs that bound surface discovery.
- `feature_areas[].paths` — sampling clusters for implemented surfaces and usage counts.

Decide your extraction strategy from these signals — see Step 2.

## The exhaustiveness rule

Recall is the failure mode and the only one. A survey missing 90% of a section's rows is a failed scan, even if every row that *is* there is well-formed — the interpreter downstream cannot recover what you didn't record.

For every section (`values[]`, `tokens[]`, `components[]`, `ui_surfaces[]`):

1. **Identify the strongest signal in this repo.** Where is this kind of value most reliably declared or used? It will be different in every repo — a manifest, a registry, a barrel export, a CSS declaration block, a naming convention. Use the strongest signal the repo offers.
2. **Enumerate, don't sample.** If you can count entries from the canonical signal independently, your row count must match. 6 components when the canonical signal lists 100 is a lie.
3. **Cross-check by a second method when one exists** (e.g., file count by glob vs. enumerated entries vs. import graph). If the two counts disagree by more than ~10%, you're missing entries — investigate before recording.
4. **Honest absence beats partial truth.** If the section has no canonical signal in this repo, leave the array empty rather than recording a sample. Empty is honest; sampled is misleading.

This applies regardless of dialect. The recipe doesn't tell you what the canonical signal is — it depends on the repo. Your job is to find it and enumerate it.

### 2. Choose your extraction strategy per dialect

**You write your own greps and regexes. There is no pre-built parser.** Adapt to what's actually in the repo:

- **Tailwind (Tailwind v3 / v4 with `@theme`)** — class atoms are important survey evidence. The declared `--spacing-*` / `--text-*` / `--color-*` tokens in `@theme` are only half the picture; the other half is which atoms components actually use, because Tailwind synthesizes most of the rendered scale from the `--spacing` modular base (`p-2` → `padding: calc(var(--spacing) * 2)` → 8px when `--spacing: 0.25rem`). A survey built from declarations alone undercounts spacing/typography/color systematically — see the `## Tailwind class-atom pass` section below.
- **CSS / SCSS / CSS modules** — `rg -oN '#[0-9a-fA-F]{3,8}\b' -g '*.{css,scss,sass}'` for hex; `rg -oN '\b(rgba?|hsla?|oklch|color)\([^)]+\)' -g '*.{css,scss}'` for color functions; `rg -oN '\b[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw|fr|ch|svh|dvh)\b' -g '*.{css,scss}'` for scalars; `rg -oN -- '--[a-z0-9-]+\s*:' -g '*.{css,scss}'` for custom properties.
- **CSS-in-JS (styled-components, emotion, vanilla-extract)** — same regex set but expand `-g '*.{ts,tsx,js,jsx}'`. Watch for template literals split across lines.
- **iOS / Swift** — `rg -oN 'Color\([^)]+\)|UIColor\([^)]+\)|\.(red|blue|green|orange|brand[A-Za-z]*)\b' -g '*.swift'` for color sites; `rg -oN '\b[0-9]+(\.[0-9]+)?\b' -g '*.swift' | sort | uniq -c | sort -rn | head -50` for likely scalars (lots of noise; keep top-N by frequency).
- **Android / Compose** — `rg -oN 'Color\(0x[0-9a-fA-F]+\)|colorResource\(R\.color\.[a-z_]+\)' -g '*.kt'`; same scalar approach.
- **Token JSON / YAML** — read directly with `cat`/Read tool. Token files are usually small and structured — parse them as data, don't grep.

If the repo mixes dialects (e.g. `swiftui` + `arcade`), run extraction per dialect and merge into one survey.

## Resolver pass for source graphs

For split repos, a local app scan is not complete until symbolic usage has been resolved through the declared resolver sources where possible. This is still an app scan: the primary source decides salience, resolver sources only supply meaning.

Run this pass when `map.md` has `sources[]` with a `resolver` role, or when `design_system.token_source` is `external` / `mixed`.

Procedure:

1. **Scan primary usage first.** Record every local token/symbol/class usage in the primary target with occurrences and files_count. These counts are the only salience signal.
2. **Open resolver sources.** Read the upstream package/source/build artifact named by `sources[].role: resolver` or `design_system.upstream`. Find the exported token tables, generated Swift/Kotlin/TS accessors, CSS variables, registry metadata, or other symbol definitions.
3. **Join symbols to definitions.** Follow `CashTheme.color.background → ArcadeColor.background → #ffffff` (or equivalent) as far as source permits. Preserve the chain in `resolution.chain`.
4. **Emit resolved rows only for observed usage.** If a resolver defines 400 colors and the primary app uses 12, the app survey gets the 12 observed values. Unused resolver inventory belongs in the resolver's own fingerprint, not the app's.
5. **Mark gaps honestly.** For unresolved external symbols, emit token rows with `resolution.status: "unresolved-external"` plus `symbol` / `message`; add a scratchpad coverage note with unresolved counts by kind.

Coverage gate: before declaring done, report resolved vs unresolved counts for each resolver-backed kind (color, spacing, typography, radius, shadow). Weak resolver coverage lowers confidence downstream; it is not a reason to fabricate literals.

## Tailwind class-atom pass

For Tailwind targets, the rendered design language lives at the intersection of *declared tokens* (`@theme {}` / `tailwind.config.*`) and *consumed atoms* (`p-2`, `bg-orange-500`, `text-sm` in components). Skipping the atom pass produces a survey where the spacing/typography/color sections look sparse and irregular even though the live UI is on a clean modular grid. **Run this pass for every Tailwind target.**

The atom-to-literal resolver depends on the Tailwind version:

- **Tailwind v4** — atoms resolve through `@theme {}` directives. The spacing scale is *calculated* from `--spacing` (default `0.25rem`): `p-N`, `m-N`, `gap-N`, `w-N`, `h-N`, `space-x-N`, `space-y-N`, `inset-N` all resolve to `N * --spacing`. Type scale lives in `--text-*` keys; colors in `--color-*` keys; radii in `--radius-*` keys. Custom `--spacing-N` declarations override the calculation for that N.
- **Tailwind v3** — read `theme.spacing` / `theme.colors` / `theme.fontSize` / `theme.borderRadius` from `tailwind.config.{ts,js}`. The defaults (when keys are unset) follow the published v3 scale; pull them from `node_modules/tailwindcss/stubs/config.full.js` or the docs.

Procedure:

1. Grep class atoms across the UI surface: `rg -oN '\b(bg|text|border|fill|stroke|ring|outline|from|to|via|p[lrtbxy]?|m[lrtbxy]?|w|h|gap|space-[xy]|inset(-[xy])?|top|right|bottom|left|rounded(-[lrtb][lr]?)?|shadow|z|opacity)-[a-z0-9.]+(\[[^\]]+\])?' -g '*.{tsx,jsx,ts,js,html,vue,svelte}' | sort | uniq -c | sort -rn`.
2. Resolve each atom to its literal via the table above. Skip arbitrary-value atoms (`p-[13px]`) — those don't belong to the modular scale; record them separately under `usage: { arbitrary: N }` so the interpreter can flag drift.
3. Each distinct literal becomes a `values[]` row with `usage.className` set to the atom-occurrence count. Sum across atoms that resolve to the same literal (`p-2` and `gap-2` both → 8px).
4. Each Tailwind-default token consumed by class atoms also becomes a `tokens[]` row, with `name` set to the canonical key (`--spacing-2`, `--color-orange-500`) and `alias_chain` empty (it's a leaf default).

If a literal is produced *both* by a declared `--spacing-N` token *and* by class-atom usage, merge into one `values[]` row with `usage: { className: N, css_var: M }`. The interpreter reads both signals; the row carries the full picture.

### 3. Run extraction passes — apply the exhaustiveness rule per section

The exhaustiveness rule (above) governs every section. The dialect-specific tactics here are how you implement it for `values[]` and `tokens[]`. For `components[]`, the rule is the same: find the canonical signal in *this* repo and enumerate it.

For values + tokens, sloppy grep undercounts silently. Discipline:

- **Multiple passes per kind.** Don't trust your first regex. After your color pass, run a second pass with a slightly different pattern and check the delta. New rows = your first pass missed.
- **Cross-check counts.** When you record a row with `occurrences: 47`, run `rg -c '\b#f97316\b' .` against the full repo and verify. If the count differs by more than ~10%, your regex is missing something — refine and re-pass.
- **Frequency clustering.** After the first sweep, list candidate values by frequency: `rg -oN '#[0-9a-fA-F]{6}' -g '*.css' | sort | uniq -c | sort -rn`. The top values are almost always real palette entries. Long-tail values are often comments, hashes, or test fixtures — verify before recording.
- **Spread check.** If a value appears in `files_count: 1`, it's likely incidental, not part of the design language. Note the count but don't promote with `role_hypothesis`.
- **Resolve aliases exhaustively.** Every named token declared in the canonical token source becomes a `tokens[]` row. Don't sample tokens — count the declarations and match the row count. When a token's value is `var(--other)`, follow the chain to the literal; record the **token row** with the chain, and the **value row** for the resolved literal.
- **Resolve external aliases when the source graph provides resolvers.** Primary usage rows keep `source.role: primary`; upstream definitions appear under `resolution`, not as salience by themselves.

For components:

- **Components are countable.** Count them by whatever signal the repo offers (manifest entries, barrel exports, naming pattern under a known directory). If you can count to 50 and your survey has 6 rows, you've sampled — go back and enumerate.

### 4. Record implemented UI surfaces

Use `surface_sources` and `feature_areas[]` from `map.md` to enumerate representative implemented surfaces. This section is required in `ghost.survey/v2`. If no implemented surface can be observed, write `ui_surfaces: []`, ensure `map.md` uses `surface_sources.render_strategy: unknown`, and carry the coverage gap in your scratchpad for the interpreter.

Surface rows are evidence, not exemplars and not prose. Record facts that a later profiler can cluster:

```json
{
  "id": "",
  "source": { "target": "github:block/ghost", "commit": "abc123", "scanned_at": "2026-04-29T12:00:00Z" },
  "name": "Account settings",
  "kind": "route",
  "locator": "/settings/account",
  "renderability": "source-only",
  "files": ["src/routes/settings/account.tsx"],
  "classification": {
    "intent": "configure",
    "surface_type": "settings",
    "density": "standard",
    "layout_shape": "control-surface",
    "confidence": 0.75
  },
  "signals": {
    "dominant_components": ["Tabs", "Input", "Button"],
    "layout_patterns": ["sectioned-form", "persistent-actions"],
    "breakpoint_behavior": ["mobile stacks sections vertically"],
    "value_refs": ["<value-row-id-after-fix-ids-if-known>"],
    "notes": ["Compact controls sit inside generous section spacing."]
  }
}
```

Discovery guidance:

- For `browser`, `storybook`, or `docs`, enumerate routes/stories/examples first, then sample the source files that back them.
- For `native-screenshot`, record the screenshot or fixture locator and the source files when known.
- For `static-source`, use route files, screens, stories, examples, or feature entrypoints as the observable specimens.
- Prefer 1–3 high-signal surfaces per feature area. This is not exhaustive in the same way components are; it is coverage of implemented composition families.
- Keep `signals.notes` factual. "Sectioned settings form with persistent action row" is survey evidence. "Feels professional and calm" belongs in profile interpretation.

### 5. Sample feature areas for usage counts

For each `feature_areas[]` entry in `map.md`, walk a few files to measure how the values you found in `entry_files` actually get used. This produces the `occurrences` and `files_count` numbers. Don't sample exhaustively — 3–5 files per feature area is usually enough; the goal is a representative count, not a perfect one.

Update the `usage` breakdown when context matters. Examples: `{className: 30, css_var: 17}` for a hex used in both Tailwind classes and CSS variables; `{token-resolution: 1, inline: 46}` for a hex defined once and copy-pasted everywhere (a smell worth flagging via `role_hypothesis: "ad-hoc"` or similar).

### 6. Write rows with empty IDs

Build the survey file. For every row, leave `id` as an empty string `""`. You don't compute SHA-256 hashes by hand. Example value row:

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

Same shape per token, component, and UI-surface row, just different content fields. **Every row gets the same `source` object** (denormalized so the row survives merges with its origin attribution). Fill `sources[]` at the top of the survey with the same single source.

### 7. Populate IDs

Run:

    ghost-fingerprint survey fix-ids survey.json -o survey.json

This recomputes every row's `id` from its content fields. Idempotent — running it again does nothing.

### 8. Validate

    ghost-fingerprint lint survey.json

Fix everything `lint` flags as an error. Warnings (unknown `kind`, `id-mismatch` if you skipped Step 7, etc.) are signals — investigate them, but they don't block.

### 9. Coverage check (gate before declaring done)

Before declaring the survey done, walk each section and confirm exhaustiveness:

- **`components[]`** — what's the canonical signal in this repo? Count it independently. If your row count is below that count, you've under-recorded. Either add the missing rows or, if the section truly isn't enumerable here, leave the array empty.
- **`ui_surfaces[]`** — compare rows against `surface_sources` and `feature_areas[]`. Every major implemented surface family should have at least one row, or the coverage gap should be explicit.
- **`tokens[]`** — count the named-token declarations in the canonical token source(s) named in `map.md`. Your row count should match.
- **`values[]`** — frequency-cluster again with a fresh grep. New top-N entries that aren't in your survey = missed.
  For resolver-backed scans, also check unresolved symbols by kind; top unresolved symbols should either be resolved or explicitly surfaced as coverage gaps.
The survey is **saturated** when another exhaustiveness pass adds fewer than ~2 new rows across all sections AND your component/token row counts match (or come very close to) an independent count of the canonical signal. If exhaustiveness disagrees with what you have, exhaustiveness wins — re-pass.

Hard stop conditions:

- ~100 files read total, OR
- ~20 minutes wall, OR
- ~200k tokens consumed.

If you hit a hard stop with exhaustiveness *not* met, write a `# Coverage` note in your scratchpad listing exactly which sections fall short and by how much. Surface it to the interpreter — it tells them which decisions are well-grounded and which aren't. **Do not pad the survey with sampled rows to look exhaustive.**

## Always

- Use `survey.json` as the canonical filename.
- Every value/token row carries `source`, `occurrences`, and (for values) `files_count`.
- Every UI-surface row carries `source`, `name`, `kind`, `locator`, `renderability`, `files`, and factual `signals`.
- Resolve token alias chains end-to-end. The `alias_chain` array captures the path.
- Validate with `ghost-fingerprint lint survey.json` before declaring success.
- After authoring rows with empty IDs, run `survey fix-ids` exactly once.
- **Cross-check your component and token counts against an independent count of the canonical signal in this repo.** Disagreement = re-pass.

## Never

- **Never write prose.** No `description`, no rationale fields. Factual UI-surface notes are okay; interpretation prose is the interpreter's job.
- **Never invent values.** If you didn't observe it in source, it doesn't go in the survey.
- **Never sample.** Either enumerate exhaustively or leave the section empty. A survey with 6 components when the canonical signal has 100 is worse than no `components[]` at all.
- **Never assign roles confidently.** `role_hypothesis` is a *hint*, optional, and tentative. The interpreter has the final word. If you're not sure, leave it empty.
- **Never undercount silently.** If your coverage is weak (mobile dialects, custom DSLs, no canonical signal in this repo), surface it in a `# Coverage` scratchpad note and tell the interpreter.
- **Never compute IDs by hand.** Use `survey fix-ids`.
- **Never use placeholder/glob names.** A component row with `name: "*Button"` or `name: "<various>"` is sampling-disguised-as-a-row. Enumerate concretely.
- **Never edit a survey after the interpreter has used it.** If you find a missed value later, re-run survey end-to-end. Treat the survey used for a profile as frozen evidence.
