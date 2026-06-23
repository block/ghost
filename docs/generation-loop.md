# Fingerprint Generation Loop

Ghost gives UI generators and product-development agents a local, auditable
product-surface composition fingerprint. Generation starts from checked-in core
layers; checks and review govern the result afterward.

```text
fingerprint/intent.yml + fingerprint/inventory.yml + fingerprint/composition.yml
        |
        v
host agent or generator
        |
        v
HTML / JSX / app code
        |
        v
ghost check + ghost review
        |
        v
deterministic gates + advisory surface-composition findings
```

## Before Generation

Build a brief from the resolved fingerprint stack:

```bash
ghost relay gather apps/checkout/review/page.tsx
```

1. Read `.ghost/fingerprint/intent.yml`, `.ghost/fingerprint/inventory.yml`, and
   `.ghost/fingerprint/composition.yml`.
2. Select relevant situations, principles, experience contracts, and patterns.
3. Inspect matching inventory exemplars as concrete anchors.
4. Use `inventory.building_blocks` as curated material.
5. Run `ghost signals` when raw repo observations would help find evidence.
6. Skim active checks in `.ghost/fingerprint/validate.yml` so
   generation avoids deterministic failures.
7. Use nested stacks only when the project has opted into them.

Raw repo signals can help orient an agent:

```bash
ghost signals .
```

Signals answer what exists now and do not count toward scan readiness.
`intent.yml` captures the intent behind the surface. Curated inventory points to
building blocks and exemplars. `composition.yml` captures the patterns that make
the surface feel intentional.

## Govern

`ghost check` is deterministic:

```bash
ghost check --base main --format json
```

Without `--package`, `ghost check` groups changed files by resolved fingerprint
stack and runs merged checks for each group. Only active checks can block.

`ghost review` is advisory:

```bash
ghost review --base main
```

Advisory review packets include the current diff, the split fingerprint core
layers, relevant inventory exemplars, active checks, and finding categories for
fixes, intentional divergence, missing fingerprint grounding, experience gaps,
and eval uncertainty.

Review findings should cite the diff location, relevant fingerprint refs,
relevant exemplars when useful, and any active check when blocking.

## Remediation

When review flags drift from the fingerprint, the host agent chooses the
smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Update the split fingerprint package when the user asks to change the Ghost
  fingerprint.

## CI

CI should run deterministic checks for UI-touching changes. Advisory review can
attach a packet or comment, but it should not fail the build unless a finding is
backed by an active check.

```bash
ghost check --base main
ghost review --base main --format markdown
```

Advanced wrappers that store fingerprint packages outside `.ghost` can pass
`--memory-dir <relative-dir>` to stack-aware commands. `--package <dir>` remains
exact single-bundle mode and bypasses stack discovery.

## Legacy Cache Helpers

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`,
`patterns.yml`, and direct `.ghost/fingerprint.yml` as capture material. Those
files are now legacy/cache source material. Promote durable conclusions into
`intent.yml`, `inventory.yml`, and `composition.yml`.
