# Host Adapter Integration

Ghost is adapter-neutral. It owns the portable fingerprint package,
deterministic validation, stack resolution, and machine-readable packets. Host
tools consume that fingerprint contract and own display, severity mapping, and
review/check file formats.

## Responsibilities

Ghost provides:

- `.ghost/fingerprint/` package loading and stack merging.
- `fingerprint/prose.yml`, `fingerprint/inventory.yml`, and
  `fingerprint/composition.yml` as generation context.
- Optional `fingerprint/checks.yml`.
- `ghost signals` stdout output for raw repo observations.
- `ghost check --format json` as the stable `ghost.check-report/v1` contract.
- `ghost review --format json` for advisory packets grounded in the resolved
  fingerprint stack.
- `ghost relay gather [target] --format json` as the `ghost.relay.gather/v1`
  contract for generation context.
- `--memory-dir <relative-dir>` for wrappers that store Ghost package roots
  somewhere other than `.ghost`.

Host adapters provide:

- repo-specific installation workflows
- policies for when to capture, validate, generate from, govern, or compare a
  fingerprint
- generated review/check files in the host's native format
- severity mapping from Ghost's `critical | serious | nit`
- policy for when a finding blocks, comments, or remains advisory
- normal Git review for fingerprint edits

Raw repo signals are authoring evidence, not canonical inventory. The checked-in
core layer files remain the authority.

## Check Flow

Run deterministic checks and consume the JSON report:

```bash
ghost check --base main --format json
```

Wrappers should map severity externally. A typical mapping is:

```text
critical -> blocking
serious  -> blocking or high-confidence review finding
nit      -> advisory
```

The exact labels belong to the host.

## Custom Fingerprint Directories

The default package root is `.ghost`, and the portable package lives inside it
at `fingerprint/`. Wrappers can use any safe relative package root:

```bash
ghost init --scope apps/checkout --memory-dir .design/memory
ghost stack apps/checkout/review/page.tsx --memory-dir .design/memory --format json
ghost relay gather apps/checkout/review/page.tsx --memory-dir .design/memory --format json
ghost check --base main --memory-dir .design/memory --format json
ghost review --base main --memory-dir .design/memory --format json
```

`--package <dir>` remains exact single-bundle mode. Use it when the caller
already knows the package root and wants to bypass stack discovery.

## Fingerprint Edits

Adapters do not need a special Ghost draft layer. If fingerprint work is
uncommitted or unmerged, it is draft work. Once the split fingerprint package,
checks, decisions, or intent are checked in, Ghost treats them as truth for
deterministic tooling.
