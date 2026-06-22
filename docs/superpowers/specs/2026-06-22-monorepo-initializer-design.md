# Monorepo Initializer Design

## Context

Ghost already supports nested fingerprint packages. A root `.ghost/` package can
apply broad product-surface rules, and scoped child packages can extend or
override those rules for monorepo areas such as `apps/checkout`. The current
manual workflow is:

```bash
ghost init
ghost init --scope apps/checkout
ghost init --scope packages/admin
```

The feature adds an explicit monorepo initializer path so users can discover and
bootstrap that structure without changing the existing `ghost init` default.

## Decision

The initializer is opt-in:

```bash
ghost init --monorepo
```

Plain `ghost init` keeps its current behavior.

The default monorepo command creates or preserves the root Ghost package, detects
candidate child package roots, and prints a proposed child initialization plan.
It does not write child `.ghost/` packages unless the user passes an explicit
apply flag:

```bash
ghost init --monorepo --apply
```

Risk committee score: **3/10**. The default is useful but conservative: root
initialization is expected, while child package writes require explicit consent.

## Risk Committee

| Seat | Concern | Auto-create children | Print plan only |
| --- | --- | ---: | ---: |
| CLI safety | Avoid surprising file writes | 8/10 | 2/10 |
| Monorepo user | Get useful setup quickly | 3/10 | 5/10 |
| Git hygiene | Avoid noisy accidental PRs | 7/10 | 2/10 |
| Implementation | Keep behavior deterministic | 6/10 | 3/10 |
| Agent workflow | Let agent/user curate scope | 7/10 | 2/10 |

## Behavior

`ghost init --monorepo`:

- Creates the root package when it is missing.
- Preserves the root package when it already exists.
- Detects likely child package roots from deterministic repo metadata.
- Prints proposed commands for each high-confidence child root.
- Skips candidate roots that already contain the selected memory directory.
- Supports `--memory-dir`, `GHOST_MEMORY_DIR`, `--with-intent`, `--with-config`,
  `--reference`, `--force`, and `--format json` consistently with existing
  `init` behavior where applicable.

`ghost init --monorepo --apply`:

- Performs the same root behavior.
- Creates child scoped packages for detected candidates.
- Does not overwrite existing child files unless `--force` is also present.
- Reports created, skipped, and errored candidates.

`ghost init --monorepo --scope <path>` and `ghost init --monorepo [dir]` are
invalid combinations. Monorepo mode owns scope discovery; exact scope
initialization remains `ghost init --scope <path>`.

## Detection

Detection should be deterministic and file-based. Initial sources:

- `pnpm-workspace.yaml` package globs.
- `package.json` `workspaces`.
- npm-style `{ "workspaces": { "packages": [...] } }`.

The detector should expand common workspace globs to directories with package
manifests, normalize to repo-relative paths, ignore `node_modules`, ignore hidden
directories, de-duplicate results, and sort output for stable CLI results.

This first version should not infer children from arbitrary folder names without
workspace metadata. If no candidates are found, the command should say so and
leave the root package initialized.

## Output

Human output should make the default non-writing behavior obvious:

```text
Initialized Ghost root package: .ghost

Detected monorepo child candidates:
  apps/checkout
  packages/admin

Next:
  ghost init --scope apps/checkout
  ghost init --scope packages/admin

Run ghost init --monorepo --apply to create these child packages.
```

JSON output should include:

- `root`
- `mode`
- `memoryDir`
- `candidates`
- `created`
- `skipped`
- `errors`
- `commands`

## Testing

Add focused tests for:

- `--monorepo` keeps plain `ghost init` unchanged.
- `--monorepo` creates root and only prints child commands by default.
- `--monorepo --apply` creates scoped child packages.
- Existing root and child packages are skipped without `--force`.
- `--memory-dir` applies to root and child package locations.
- `GHOST_MEMORY_DIR` works in monorepo mode.
- Invalid combinations fail with clear errors.
- Candidate detection covers `pnpm-workspace.yaml`, array workspaces, and object
  workspaces.

## Non-Goals

- No interactive prompts.
- No automatic monorepo behavior in plain `ghost init`.
- No arbitrary folder-name guessing in the first version.
- No migration of existing non-Ghost monorepo configuration.
