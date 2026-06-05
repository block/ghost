# Product-Experience World Model Loop

Ghost gives UI generators and product-development agents a local, auditable
product-experience world model. Generation starts from checked-in core layers;
checks validate the result afterward.

```text
fingerprint/prose.yml + fingerprint/inventory.yml + fingerprint/composition.yml
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
deterministic gates + advisory product-experience findings
```

## Before Generation

Build a brief from the generation packet:

1. Read `.ghost/fingerprint/prose.yml`, `.ghost/fingerprint/inventory.yml`, and
   `.ghost/fingerprint/composition.yml`.
2. Select relevant situations, principles, experience contracts, and patterns.
3. Inspect matching inventory exemplars as concrete anchors.
4. Use `inventory.building_blocks` as curated material.
5. Use optional `.ghost/fingerprint/sources/cache/` only as source material.
6. Skim active checks in `.ghost/fingerprint/enforcement/checks.yml` so
   generation avoids deterministic failures.
7. Use optional `fingerprint/memory/intent.md`, accepted decisions, and nested
   stacks only when the project has opted into them.

Generated cache can help orient an agent:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Cache answers what exists now and does not count toward scan readiness. Prose
answers what matters and why. Curated inventory points to building blocks and
exemplars. Composition explains how those blocks become experience.

## Review

`ghost check` is deterministic:

```bash
ghost check --base main --format json
```

Without `--package`, `ghost check` groups changed files by resolved fingerprint
stack and runs merged checks for each group. Only active checks can block.

`ghost review` is advisory:

```bash
ghost review --base main --include-memory
```

Advisory review packets include the current diff, the split fingerprint core
layers, relevant inventory exemplars, active checks, optional accepted
decisions, and finding categories for fixes, intentional divergence, missing
memory, experience gaps, and eval uncertainty.

Review findings should cite the diff location, relevant fingerprint refs,
relevant exemplars when useful, and any active check when blocking.

## Remediation

When review flags drift, the host agent chooses the smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Update the split fingerprint package or optional rationale files when the
  user asks to change Ghost memory.

## CI

CI should run deterministic checks for UI-touching changes. Advisory review can
attach a packet or comment, but it should not fail the build unless a finding is
backed by an active check.

```bash
ghost check --base main
ghost review --base main --format markdown
```

Advanced wrappers that store memory outside `.ghost` can pass
`--memory-dir <relative-dir>` to stack-aware commands. `--package <dir>` remains
exact single-bundle mode and bypasses stack discovery.

## Legacy Cache Helpers

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`,
`patterns.yml`, and direct `.ghost/fingerprint.yml` as capture material. Those
files are now legacy/cache source material. Promote durable conclusions into
`prose.yml`, `inventory.yml`, and `composition.yml`.
