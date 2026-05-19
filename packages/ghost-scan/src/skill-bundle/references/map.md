---
name: map
description: Author the map.md for a target — Ghost's topology card. The first stage of a scan.
handoffs:
  - label: Survey values into survey.json
    command: (next stage — survey recipe)
    prompt: Survey the target's design values into survey.json
  - label: Validate the map
    command: ghost-scan lint map.md
    prompt: Lint the map.md I just wrote
---

# Recipe: Author a target's map.md

**Goal:** produce a valid `.ghost/map.md` (`ghost.map/v2`) that captures the *topology* of the target — what platform it ships on, what it builds with, where the design system lives, and where implemented UI can actually be observed. `map.md` is the topology stage of a package scan: later stages (`survey.json`, `patterns.yml`, and optional `checks.yml`) read it to skip rediscovery and route changes.

This recipe is *your* job. Ghost's CLI provides `ghost-scan inventory` (deterministic raw signals) and `ghost-scan lint <map.md>` (validation), but you do the synthesis.

## Steps

### 1. Gather raw signals

**Preferred (CLI present):**

Run `ghost-scan inventory [path]` from (or pointed at) the target root. It returns deterministic JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, git remote, plus best-effort platform and build-system hints. Read it as the foundation — reproducible from inputs.

**Prose fallback (no CLI):**

Build the inventory yourself with `Glob` / `Read` / `Bash`:

- **Package manifests:** `Glob: **/{package.json,pnpm-workspace.yaml,Cargo.toml,go.mod,Package.swift,build.gradle*,pyproject.toml,requirements.txt}` — exclude `node_modules`. Read each; record `name` and top-level dep names.
- **Language histogram:** `Bash: find . -type f -name '*.tsx' -o -name '*.ts' -o -name '*.swift' -o -name '*.kt' …` (extension list per the kinds you care about) and count. Convert to `{name, files, share}` rows where `share = files / total`.
- **Candidate config files:** `Glob` for `tailwind.config.*`, `tsconfig*.json`, `vite.config.*`, `next.config.*`, `tokens/**`, `theme/**`, etc.
- **Registry presence:** check `Read: <path>/registry.json` — if it parses and has `name` + `items[]`, record its path.
- **Top-level tree:** `Bash: ls -la <path>` for one level deep.
- **Git remote:** `Bash: git -C <path> remote get-url origin` (best-effort, fine if absent).

Format as a JSON object so the rest of the recipe can quote from it. Skip fields you can't determine; partial inventory is fine.

### 2. Resolve the schema fields

The `ghost.map/v2` frontmatter requires:

- **`schema: ghost.map/v2`** (literal)
- **`id`** — slug (lowercase alphanumeric plus `.` `_` `-`, leading alphanumeric). For fleet scans, this is the fleet target id.
- **`repo`** — GitHub `org/repo`, or any source identifier that uniquely names this target.
- **`subject`** — optional `{id, target}` that names the single thing this bundle will describe. Use it when the scan needs multiple sources; `subject` stays the primary claim.
- **`sources`** — optional scan source graph. Each source is `{id?, role, target, resolves?, paths?}` where `role` is `primary` or `resolver`. `primary` supplies usage/salience; `resolver` supplies concrete meaning for imported symbols. Declare exactly one primary when `sources[]` is present.
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
- **`design_system`** — `{paths[], entry_files?, derived_files?, path_patterns?, token_source?, upstream?, status}`. `token_source` is `inline` / `external` / `mixed`. `status` is `active` / `mixed` / `unclear`. Set `upstream` when `token_source` is `external` or `mixed`, and prefer representing each upstream as a `sources[]` resolver when the scan author can inspect it.
- **`surface_sources`** — `{render_strategy, include[], exclude[], coverage_gaps?}` — globs for implemented UI plus how the surveyor can observe it. `render_strategy` is one of `browser`, `storybook`, `docs`, `native-screenshot`, `static-source`, `mixed`, or `unknown`.
- **`feature_areas`** — array of `{name, paths[], sub_areas?[]}` describing sampling clusters for implemented surfaces. These are product or documentation surfaces, not just folders. 3–8 areas is typical; fewer is fine for small repos.
- **`orientation_files`** — array of files an agent should read first to understand the target.

### 3. Use a manifest if one is provided

If a `manifest.yaml` is present in CWD (some fleet orchestrators inject hand-curated sampling manifests for big repos), treat it as authoritative for `feature_areas`, `module_signals`, and `design_system.path_patterns`. Don't contradict it without evidence.

If no manifest is provided, derive `feature_areas` and `surface_sources` from the inventory's `top_level_tree` and your own brief exploration: which directories represent observable product surfaces (e.g. `apps/dashboard`, `apps/docs`, `src/routes`, `src/features/*`, `stories/**`, native screenshot fixtures)?

#### Render strategy

Choose the strongest observation path the target supports:

- `browser` — app routes can be launched and inspected in a browser.
- `storybook` — Storybook or equivalent component stories are the primary observable surface.
- `docs` — docs/catalogue examples are the primary observable surface.
- `native-screenshot` — native UI is represented by screenshot fixtures or simulator captures.
- `static-source` — no renderer is available; surveyor must infer from source files.
- `mixed` — more than one strategy is materially needed.
- `unknown` — no trustworthy implemented UI surface is discoverable. Use only with `coverage_gaps` explaining what is missing.

`coverage_gaps` should list important blind spots ("native screens require simulator access", "marketing routes are generated from CMS", "no screenshots checked in"). Empty or absent means the scan author believes the declared sources are enough for the survey stage.

### 3a. Source graph for split repos

Use a source graph when the target's design language is only observable through dependencies (apps consuming token packages, native apps importing design-system modules, wrappers over upstream registries). The bundle still has one subject; the scan may have many sources.

Rule:

> Primary sources determine salience. Resolver sources determine meaning.

Example:

```yaml
subject:
  id: cash-ios
  target: github:squareup/cash-ios
sources:
  - id: cash-ios
    role: primary
    target: github:squareup/cash-ios
  - id: arcade-ios-package
    role: resolver
    target: github:squareup/arcade-ios-package
    resolves: [color, spacing, typography]
```

Use `design_system.upstream` as the compatibility breadcrumb, but `sources[]` is the richer contract the survey recipe consumes. A resolver source should not make unused upstream tokens important; it only resolves symbols observed in the primary source.

### 4. Body sections

`map.md` requires a short prose body with three sections — keep them tight, two-to-four sentences each. The body explains the map; the frontmatter stores the structured data. Sections must appear in this order:

- `## Identity` — what is this repo, what does it produce, who consumes it?
- `## Topology` — how is the codebase organized? Where does the design system live relative to product code?
- `## Conventions` — notable patterns (token pipelines, registry, framework choices, language mixes) that shape how someone navigates.

### 5. Validate

**Preferred (CLI present):**

    ghost-scan lint map.md

Fix any errors. Lint passing is the success gate — do not declare done until it exits 0.

**Prose fallback (no CLI):**

Walk the file yourself against the schema in [schema.md](schema.md). Required checks:

- Frontmatter parses as valid YAML.
- `schema: ghost.map/v2` literal present.
- Required fields populated: `id` (slug), `repo`, `mapped_at`, `platform`, `languages`, `build_system`, `package_manifests`, `composition.frameworks`, `composition.rendering`, `composition.styling`, `design_system.paths`, `design_system.status`, `surface_sources.render_strategy`, `surface_sources.include`, `feature_areas[]`, `orientation_files[]`.
- `id` matches `^[a-z0-9][a-z0-9._-]*$`.
- Body sections appear in order: `## Identity`, `## Topology`, `## Conventions`. No other `##` headings between them.
- If `design_system.token_source` is `external` or `mixed`, `design_system.upstream` is set.
- If `sources[]` is present, it has exactly one `role: primary`; resolver sources declare `resolves` where possible.

Common errors regardless of path:

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

- Never put prose into frontmatter or structural data into the body.
- Never duplicate the inventory's content in the body. The body is interpretation, not data.
- Never declare done before `ghost-scan lint map.md` exits 0.
