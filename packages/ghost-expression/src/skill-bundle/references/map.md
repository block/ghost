---
name: map
description: Author the map.md for a target — Ghost's topology card. The first stage of a scan.
handoffs:
  - label: Survey values into bucket.json
    command: (next stage — survey recipe)
    prompt: Survey the target's design values into bucket.json
  - label: Validate the map
    command: ghost-expression lint map.md
    prompt: Lint the map.md I just wrote
---

# Recipe: Author a target's map.md

**Goal:** produce a valid `map.md` (`ghost.map/v1`) that captures the *topology* of the target — what platform it ships on, what it builds with, where the design system lives, what feature areas matter for sampling. `map.md` is the first stage of a scan: every later stage (`survey.md` → `bucket.json`, `profile.md` → `expression.md`) reads it to skip rediscovery.

This recipe is *your* job. Ghost's CLI provides `ghost-expression inventory` (deterministic raw signals) and `ghost-expression lint <map.md>` (validation), but you do the synthesis.

## Steps

### 1. Gather raw signals

Run `ghost-expression inventory [path]` from (or pointed at) the target root. It returns deterministic JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, git remote, plus best-effort platform and build-system hints. Read it as the foundation — reproducible from inputs.

### 2. Resolve the schema fields

The `ghost.map/v1` frontmatter requires:

- **`schema: ghost.map/v1`** (literal)
- **`id`** — slug (lowercase alphanumeric plus `.` `_` `-`, leading alphanumeric). For fleet scans, this is the fleet target id.
- **`repo`** — GitHub `org/repo`, or any source identifier that uniquely names this target.
- **`mapped_at`** — current ISO date (`YYYY-MM-DD`) or full datetime.
- **`platform`** — one of `web`, `ios`, `android`, `desktop`, `flutter`, `mixed`, `other`, or an array spanning multiple. The inventory's `platform_hints` is your starting point — accept it when consistent, override when you have evidence.
- **`languages`** — array of `{name, files, share}` from the inventory histogram. `share` is fraction in [0,1].
- **`build_system`** — one of `gradle`, `bazel`, `xcode`, `pnpm`, `npm`, `yarn`, `cargo`, `go`, `maven`, `sbt`, `cmake`, `style-dictionary`, `vite`, `webpack`, `parcel`, `rollup`, `turbopack`, `esbuild`, `nx`, `turbo`, `mixed`, `other`, or an array. The inventory's `build_system_hints` plus lockfile presence (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `package-lock.json` → `npm`) usually answers this.
- **`package_manifests`** — array of paths from the inventory.
- **`composition.frameworks`** — array of `{name, version?}` (e.g. `react`, `next`, `swiftui`, `compose`, `style-dictionary`).
- **`composition.rendering`** — short slug (`react-spa`, `next-app-router`, `swiftui`, `compose`, `static`, `mixed`, …).
- **`composition.styling`** — array (e.g. `["tailwindcss"]`, `["scss-modules"]`, `["styled-components"]`).
- **`composition.navigation`** — optional short slug (`next-router`, `react-router`, `swiftui-navigation`, …).
- **`registry`** — optional `{path, components}` if a shadcn-style registry exists.
- **`design_system`** — `{paths[], entry_files?, derived_files?, path_patterns?, token_source?, upstream?, status}`. `token_source` is `inline` / `external` / `mixed`. `status` is `active` / `mixed` / `unclear`. Set `upstream` when `token_source` is `external` or `mixed`.
- **`ui_surface`** — `{include[], exclude[]}` — globs for sampling scope.
- **`feature_areas`** — array of `{name, paths[], sub_areas?[]}` describing the surfaces worth sampling. 3–8 areas is typical; fewer is fine for small repos.
- **`orientation_files`** — array of files an agent should read first to understand the target.

### 3. Use a manifest if one is provided

If a `manifest.yaml` is present in CWD (some fleet orchestrators inject hand-curated sampling manifests for big repos), treat it as authoritative for `feature_areas`, `module_signals`, and `design_system.path_patterns`. Don't contradict it without evidence.

If no manifest is provided, derive `feature_areas` from the inventory's `top_level_tree` and your own brief exploration: which directories represent product surfaces (e.g. `apps/dashboard`, `packages/ui`, `src/features/*`)?

### 4. Body sections

`map.md` requires a short prose body with three sections — keep them tight, two-to-four sentences each. The body is interpretation; the frontmatter is ground truth. Sections must appear in this order:

- `## Identity` — what is this repo, what does it produce, who consumes it?
- `## Topology` — how is the codebase organized? Where does the design system live relative to product code?
- `## Conventions` — notable patterns (token pipelines, registry, framework choices, language mixes) that shape how someone navigates.

### 5. Validate

    ghost-expression lint map.md

Fix any errors. Lint passing is the success gate — do not declare done until it exits 0. Common errors:

- Body section out of order (`## Identity` must precede `## Topology` etc.)
- Missing `entry_files` AND `derived_files` under `design_system` (warning — fine if neither exists, but check)
- `token_source: external` without `upstream` set
- `id` not a slug

## Always

- Cite real paths the inventory returned. Do not invent files.
- Prefer the array form (`platform: [web, ios]`) over `mixed` when the repo genuinely spans multiple platforms.
- If there is no design system in the repo (a backend-only app, a marketing site without a tokens layer), say so in `## Identity`, set `design_system.status: unclear`, and omit `entry_files`. Don't fabricate a design-system structure.
- For fleet scans, resolve `id` and `repo` from environment variables when the orchestrator passes them (`TARGET_ID`, `TARGET_REPO`).

## Never

- Never put prose into frontmatter or structural data into the body — the partition is load-bearing.
- Never duplicate the inventory's content in the body. The body is interpretation, not data.
- Never declare done before `ghost-expression lint map.md` exits 0.
