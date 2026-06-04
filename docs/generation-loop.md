# Product-Experience World Model Loop

Ghost gives UI generators and product-development agents a local, auditable
product-experience world model. Generation starts from checked-in prose,
inventory, and composition. Checks validate the result afterward.

```text
prose + inventory + composition
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

Ghost prepares the input and checks the output. It does not own the generator,
fingerprint lifecycle, approval workflow, design-system generator, or design-system
registry. Use any agent or tool that can read local context and apply changes.

## Before Generation

Build a brief from the generation packet:

1. Read `.ghost/fingerprint.yml` as canonical prose, inventory, and composition.
2. Select the relevant `prose.situations`.
3. Carry applicable `prose.principles`,
   `prose.experience_contracts`, and `composition.patterns` into the work.
4. Inspect relevant `inventory.exemplars` as concrete examples of what good
   looks like.
5. Use `inventory.building_blocks` as curated material and generated cache as
   optional source material that may help satisfy selected prose and
   composition.
6. Read active checks in `.ghost/checks.yml` to know which deterministic rules
   can block.
7. Use optional `intent.md`, accepted decisions, and nested stacks only when
   the project has opted into those advanced inputs.

Generated inventory can help orient an agent, but it is cache:

```bash
mkdir -p .ghost/cache
ghost inventory > .ghost/cache/inventory.json
```

Generated cache answers what exists now and does not count toward scan
readiness. Fingerprint prose answers what matters and why. Curated inventory
points to building blocks and exemplars. Composition explains how those blocks
become experience.

## Generation

The generator should preserve:

- product identity and hierarchy
- relevant user/task/state obligations
- interface and capability behavior
- copy, disclosure, failure, and recovery contracts
- restraint and pacing from composition patterns
- concrete precedent from inventory exemplars
- accessibility, responsive behavior, and visual choices when they are grounded
  in principles, contracts, or patterns

If requested work intentionally diverges from fingerprint layers, the agent
should name the divergence in its response. Fingerprint edits are ordinary
Git-reviewed edits to `fingerprint.yml`, `checks.yml`, and optional rationale
files when present.

## Review

`ghost check` is deterministic:

```bash
ghost check --base main --format json
```

Without `--package`, `ghost check` groups changed files by resolved fingerprint
stack and runs the merged checks for each group. Only active checks can block.
Active checks must be grounded in typed fingerprint refs such as
`prose.principle:*`, `prose.experience_contract:*`,
`composition.pattern:*`, or `prose.situation:*`.
The JSON report uses schema `ghost.check-report/v1`; host adapters should map
Ghost severities into their own review vocabulary outside Ghost.

`ghost review` is advisory:

```bash
ghost review --base main --include-memory
```

Without `--package`, advisory review packets include `stacks[]`, one for each
changed-file fingerprint stack. Each stack includes changed files, layer dirs,
merged fingerprint layers, merged checks, decisions, and provenance.

Advisory review packets include:

- the current diff
- `fingerprint.yml` prose/inventory/composition
- relevant inventory exemplars
- active checks
- optional accepted decisions
- finding categories for fixes, intentional divergence, missing fingerprint grounding,
  experience gaps, and eval uncertainty

Review findings should cite the diff location, relevant fingerprint refs,
relevant exemplars when useful, and any active check when blocking.

## Remediation

When review flags drift, the host agent chooses the smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Update `fingerprint.yml`, `checks.yml`, or optional rationale files when the
  user asks to change the Ghost package.

The loop is:

```text
brief from fingerprint
  -> generate or edit
  -> run ghost check
  -> run ghost review
  -> fix code or update the Ghost package through Git
```

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

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`, and
`patterns.yml` as a capture pipeline. Those files are now legacy/cache source
material. Keep them only when useful for migration or optional inventory
workflows, and promote durable conclusions into `fingerprint.yml`.
