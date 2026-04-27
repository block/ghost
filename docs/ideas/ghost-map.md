---
status: exploring
---

# ghost map

## Why it's interesting

The cash-android profile pass is a forcing function. ~1,580 Gradle modules. No agent can discover topology from scratch in that repo — the existing fleet works around it with hand-authored YAML manifests at `ghost-fleet/manifests/cash-android.yaml` (27 feature areas, convention plugin IDs, include/exclude globs). Those manifests are accurate and load-bearing, but they're hardcoded — every new repo means a human pre-curates the navigation map before the profile recipe runs.

`ghost map` is the verb that generates that map automatically and writes it to disk as `map.md`. Downstream tools (`expression`, `drift`, `fleet`) read map.md as their topology cache, so none of them re-derive "where does the design system live" or "which folders are customer UI." The map becomes the narrow waist between any frontend repo (irrespective of language or stack) and the rest of Ghost.

This is one of five decentralized tools (`map`, `expression`, `drift`, `fleet`, `ui`). Map is upstream of the other four.

## What map.md is — and is not

A **navigation card**, not an extraction. It answers *where* and *what kind*, never *how it feels*.

- Not a profile (no design-language judgement — that's expression).
- Not exhaustive (six feature areas beat thirty if six are the ones a sampling agent should actually visit).
- Not aspirational (records what the repo is, not what it should be).
- Language-agnostic by design (web, iOS, Android, Flutter, desktop, mixed).

## Architecture — mirrors expression

The verb is LLM-driven; the CLI is deterministic scaffolding.

| Layer | What it does | Where it lives |
|---|---|---|
| `ghost map` (skill) | LLM-driven recipe the host agent runs to produce map.md | `packages/ghost-map/src/skill-bundle/` |
| `ghost map inventory` (CLI) | Deterministic facts: manifest files, language histogram, registry presence, top-level dir tree, candidate config files | CLI |
| `ghost map lint` (CLI) | Validate map.md against `ghost.map/v1`, flag missing sections | CLI |
| `ghost map describe` (CLI) | Print sections + token estimates for selective loading | CLI |

Same shape as `ghost expression` (profile drives, lint/describe support). BYOA invariant holds at the CLI line.

## Schema — `ghost.map/v1`

Frontmatter is the machine layer (consumed by other Ghost tools). Body is three sections in fixed order.

### Frontmatter fields

| Field | Type | Notes |
|---|---|---|
| `schema` | `ghost.map/v1` | required |
| `id` | slug | filesystem key; matches fleet target IDs |
| `repo` | `org/repo` or path | source of truth for the map |
| `mapped_at` | ISO date | absolute, not relative |
| `platform` | enum or `enum[]` | `web` / `ios` / `android` / `desktop` / `flutter` / `mixed` / `other`. Array form preferred when a repo genuinely spans multiple platforms (`platform: [ios, android, web]`). `mixed` is kept for backcompat. |
| `languages` | `[{name, files, share}]` | ordered desc by share |
| `build_system` | enum or `enum[]` | `gradle` / `bazel` / `xcode` / `pnpm` / `npm` / `yarn` / `cargo` / `go` / `maven` / `sbt` / `cmake` / `style-dictionary` / `vite` / `webpack` / `parcel` / `rollup` / `turbopack` / `esbuild` / `nx` / `turbo` / `mixed` / `other`. Array form when several coexist (`build_system: [pnpm, vite, nx, style-dictionary]`). |
| `package_manifests` | `string[]` | canonical manifests at the root and any expanded workspace dirs (`packages/*`, `apps/*`, `libs/*`, `common/*`). Root entries are basenames; workspace entries are POSIX-relative. |
| `composition.frameworks` | `[{name, version?}]` | detected frameworks |
| `composition.rendering` | string | primary rendering layer |
| `composition.styling` | `string[]` | ordered; first is primary, rest coexist meaningfully. For token-pipeline repos where the source-of-truth is JSON/YAML and no rendering style is "primary," list the *output* styles ordered by source-style first (e.g. `[design-tokens-json, css-custom-properties, swift-uikit, kotlin-compose]`). |
| `composition.navigation` | string? | optional |
| `registry` | `{path, components}?` | shadcn-style registry; null when absent |
| `design_system.paths` | `string[]` | directories holding tokens/theme/primitives |
| `design_system.entry_files` | `string[]?` | files that resolve a token end-to-end (the source-of-truth). Optional in 4b — at least one of `entry_files` / `derived_files` should be set in practice. |
| `design_system.derived_files` | `string[]?` | built artifacts other tools may consume (e.g. `dist/colors.ts` generated from `tokens/colors.json`). Distinct from `entry_files` so drift can point at the right reference. |
| `design_system.token_source` | enum? | `inline` (declared in-tree) / `external` (pulled from an upstream package) / `mixed`. Optional. |
| `design_system.upstream` | string or `string[]`? | upstream token reference(s) when `token_source` is `external` or `mixed`. Free-form: npm package, SPM ref, sibling path, …. Array form when a consumer pulls from multiple packages (`upstream: ["@org/tokens", "@org/components", "@org/icons"]`). |
| `design_system.status` | enum | `active` / `mixed` / `unclear` |
| `ui_surface.include` | glob[] | where customer UI lives |
| `ui_surface.exclude` | glob[] | infra/tests/legacy to skip |
| `feature_areas` | `[{name, paths, sub_areas?}]` | product surfaces; 6–30 typical |
| `orientation_files` | `string[]` | first-read order |

### Body sections (required, in order)

1. **Identity** — what this repo is, scale, constraints. If two design systems coexist, name them and say which is current.
2. **Topology** — where everything lives, in prose. Must cover: design system + token resolution; customer UI + the *why* of include/exclude (platform-specific texture lands here — convention plugins, rule kinds); feature surfaces with sampling rationale; orientation files in reading order. Annotates frontmatter, never restates it.
3. **Conventions** — naming, layout, patterns an agent will encounter (module suffixes, where hooks/tests/generated code live).

## Preamble — `map.md` recipe

Lives at `packages/ghost-map/src/skill-bundle/references/map.md`. Loaded when the host agent invokes the skill. Walks the agent through:

1. Run `ghost map inventory` for raw signals.
2. Read every package manifest the inventory found.
3. Read 2–5 orientation candidates; choose reading order.
4. Locate the design system; if multiple, decide current via import counts, commit recency, READMEs.
5. Find customer UI; confirm by sampling one or two files per candidate include pattern.
6. Detect feature surfaces; use product-meaningful names; record sub-areas where they matter for sampling.
7. Write the body — three sections, prose annotates the frontmatter.
8. `ghost map lint map.md` — fix errors, loop until clean.

Heuristics worth codifying in the preamble:
- When in doubt, open the file. Filenames lie; imports don't.
- Two theme files → read both. Don't pick alphabetically.
- Product surfaces over technical ones.
- Excludes matter as much as includes in large monorepos.
- `composition.styling` is ordered; only list a second entry if it meaningfully coexists.
- Orientation files are prioritized, not exhaustive. Five is plenty.

## CLI surface

```bash
ghost map inventory [path]        # deterministic raw signals (JSON)
ghost map lint map.md           # validate against ghost.map/v1
ghost map describe map.md       # section ranges + token estimates
ghost map emit skill              # install the skill into the host agent
```

The skill itself isn't invoked from the Ghost CLI — it's installed into the host agent's skill directory and invoked there. `ghost map emit skill` mirrors `ghost-drift emit skill`.

## Inventory output (sketch)

The deterministic step the recipe leans on. JSON, machine-shape, no judgement.

```json
{
  "platform_hints": ["android"],
  "language_histogram": [{ "name": "kotlin", "files": 12450 }, ...],
  "package_manifests": ["settings.gradle.kts", "build.gradle.kts"],
  "candidate_config_files": [
    "tsconfig.json", "tailwind.config.ts", "Theme.kt", "Color.kt", "tokens.css"
  ],
  "registry_files": ["registry.json"],
  "top_level_tree": [
    { "path": "arcade/", "kind": "dir", "child_count": 142 },
    { "path": "banking/", "kind": "dir", "child_count": 18 },
    ...
  ],
  "git_remote": "git@github.com:squareup/cash-android.git",
  "git_default_branch": "main"
}
```

The recipe consumes this, opens what it needs to open, and synthesizes map.md.

## Cross-tool payoff

- **expression** consumes map.md → profile recipe skips topology discovery, focuses on interpretation. Significant cost reduction on large repos.
- **drift** uses `ui_surface.include`/`exclude` and `feature_areas` to scope comparison. With `registry` present, drift can attribute to specific components instead of repo-wide vectors.
- **fleet** groups repos by `composition` and `platform` axes orthogonal to design language ("how do all SwiftUI apps cluster in expression-space?").
- **ghost-ui** ships an exemplary map.md as the canonical fixture for testing the other tools.

## Open questions

- **`registry` reach.** Drafted as `{path, components}` with shadcn in mind. Fine for now; revisit if a second registry format ever shows up.
- **`ui_surface.signals` was removed.** Convention plugins and name suffixes now land in Topology prose. Revisit only if a downstream tool needs structured access to that texture (none currently does).
- ~~**Multi-platform repos.** `platform: mixed` covers it but is coarse. Worth allowing `platform: [ios, android]` if Tidal-style mixed repos prove it useful.~~ Resolved in Phase 4b — `platform` and `build_system` now both accept arrays.
- **Re-map cadence.** map.md is more stable than expression.md (topology shifts slowly), but it does drift. No formal answer yet — likely "agent re-runs map when it notices a stale signal" rather than a schedule.

## Out of scope

- Pure-deterministic map as a fallback (decided against in conversation — heuristics fail on real repos with legacy/active coexistence; LLM in the loop is essential).
- Hardcoded `deprecated` field in frontmatter (decided against — ages badly; agents re-derive when sampling).
- Platform-specific signal slots (`ui_surface.signals`) in frontmatter (decided against — keeps `ui_surface` truly platform-agnostic; texture lives in prose).

## Next steps

1. Sketch `ghost map inventory` output schema in detail (JSON shape, what platforms detect what).
2. Decide package layout: `packages/ghost-map/` as sibling to `ghost-drift`, with shared core in an internal `@ghost/core` package.
3. Plan the meta-`ghost` CLI dispatcher that routes to whichever sub-tool is installed.
4. Draft an exemplary map.md for `packages/ghost-ui` as the first fixture.
