# Host Adapter Integration

Ghost is adapter-neutral. It owns product-experience memory, deterministic
validation, stack resolution, and machine-readable packets. Host tools own
their local convention: where memory lives, how findings are displayed, which
severity vocabulary they use, and how review comments or generated check files
are written.

## Responsibilities

Ghost provides:

- `fingerprint.yml` product prose and exemplars, optional `checks.yml`,
  decisions, intent, and stack merge rules.
- `ghost check --format json` as the stable `ghost.check-report/v1` contract.
- `ghost review --format json` for advisory packets grounded in the resolved
  memory stack.
- `ghost emit context-bundle` for a generation packet that separates product
  prose, optional inventory, exemplars, and active checks.
- `--memory-dir <relative-dir>` for wrappers that store Ghost memory somewhere
  other than `.ghost`.

Host adapters provide:

- repo-specific memory locations and installation workflows
- generated review/check files in the host's native format
- severity mapping from Ghost's `critical | serious | nit`
- policy for when a finding blocks, comments, or remains advisory
- normal Git review for memory edits

Ghost does not emit host-specific check formats. Consume JSON and translate it
outside Ghost.

Inventory cache is optional source material. Adapters should not treat
`.ghost/cache/inventory.json` as canonical product memory; checked-in
`fingerprint.yml` remains the authority.

## Check Flow

Run deterministic checks and consume the JSON report:

```bash
ghost check --base main --format json
```

The report schema is `ghost.check-report/v1`. Each finding includes:

- `path`
- `line`
- `message`
- `title`
- `check_id`
- `severity`
- `detector`
- optional `match`
- optional `repair`

Wrappers should map severity externally. A typical mapping is:

```text
critical -> blocking
serious  -> blocking or high-confidence review finding
nit      -> advisory
```

The exact labels belong to the host. For example, one review system might map
`serious` to `high`; another might map it to `warning`.

## Custom Memory Directories

The default memory directory is `.ghost`, but wrappers can use any safe
relative directory:

```bash
ghost init --scope apps/checkout --memory-dir .design/memory
ghost stack apps/checkout/review/page.tsx --memory-dir .design/memory --format json
ghost check --base main --memory-dir .design/memory --format json
ghost review --base main --memory-dir .design/memory --format json
```

`--package <dir>` remains exact single-bundle mode. Use it when the caller
already knows the package directory and wants to bypass stack discovery.

## Memory Edits

Adapters do not need a special Ghost draft layer. If memory work is uncommitted
or unmerged, it is draft work. Once `fingerprint.yml`, `checks.yml`, decisions,
or intent are checked in, Ghost treats them as truth for deterministic tooling.
