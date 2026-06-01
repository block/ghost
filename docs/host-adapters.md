# Host Adapter Integration

Ghost is adapter-neutral. It owns product-experience memory, deterministic
validation, stack resolution, and machine-readable packets. Host tools own
their local convention: where memory lives, how findings are displayed, which
severity vocabulary they use, and how review comments or generated check files
are written.

## Responsibilities

Ghost provides:

- `fingerprint.yml`, `checks.yml`, proposals, decisions, and stack merge rules.
- `ghost check --format json` as the stable `ghost.check-report/v1` contract.
- `ghost review --format json` for advisory packets grounded in the resolved
  memory stack.
- `ghost proposal create/list/resolve` for deterministic draft memory files.
- `--memory-dir <relative-dir>` for wrappers that store Ghost memory somewhere
  other than `.ghost`.

Host adapters provide:

- repo-specific memory locations and installation workflows
- generated review/check files in the host's native format
- severity mapping from Ghost's `critical | serious | nit`
- policy for when a finding blocks, comments, or remains advisory
- any LLM or human approval flow for promoting proposals into canonical memory

Ghost does not emit host-specific check formats. Consume JSON and translate it
outside Ghost.

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
ghost proposal create --path apps/checkout/review/page.tsx --memory-dir .design/memory --id checkout-copy-memory --kind missing-memory --title "Checkout copy memory" --claim "Checkout copy needs local memory." --rationale "Payment review language is checkout-specific." --summary "Add checkout copy guidance."
```

`--package <dir>` remains exact single-bundle mode. Use it when the caller
already knows the package directory and wants to bypass stack discovery.

## Proposal Flow

Adapters should use proposals as the draft layer. Ghost intentionally does not
invent or promote final fingerprint memory.

```bash
ghost proposal create --path apps/checkout/review/page.tsx --id checkout-copy-memory --kind missing-memory --title "Checkout copy memory" --claim "Checkout copy needs local memory." --rationale "Payment review language is checkout-specific." --summary "Add checkout copy guidance." --format json
ghost proposal list --path apps/checkout/review/page.tsx --format json
ghost proposal resolve checkout-copy-memory --path apps/checkout/review/page.tsx --status accepted --format json
```

The JSON result for create and resolve always includes `package_dir`, `path`,
and `proposal`. Promotion into `fingerprint.yml` or `checks.yml` remains a
separate human-approved or host-agent action.
