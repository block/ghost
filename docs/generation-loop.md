# Product Fingerprint Loop

Ghost gives UI generators and product-development agents local, auditable
product experience memory. Generation starts from checked-in prose,
optional inventory, and exemplars. Checks validate the result afterward.

```text
product prose + inventory + exemplars
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
memory lifecycle, approval workflow, or design-system registry. Use any agent or
tool that can read local context and apply changes.

## Before Generation

Build a brief from the generation packet:

1. Read `.ghost/fingerprint.yml` as canonical product prose and exemplar
   anchors.
2. Select the relevant `situations`.
3. Carry applicable `principles`, `experience_contracts`, and `patterns` into
   the work.
4. Inspect relevant `exemplars` as concrete examples of what good looks like.
5. Use generated inventory and `implementation_vocabulary` only as material
   that may help satisfy the selected product memory.
6. Read active checks in `.ghost/checks.yml` to know which deterministic rules
   can block.
7. Use optional `intent.md`, accepted decisions, and nested stacks only when
   the project has opted into those advanced inputs.

Generated inventory can help orient an agent, but it is cache:

```bash
mkdir -p .ghost/cache
ghost inventory > .ghost/cache/inventory.json
```

Inventory answers what exists now. Fingerprint prose answers what matters and
why. Exemplars show concrete surfaces an agent should inspect before composing
or reviewing product experience.

## Generation

The generator should preserve:

- product identity and hierarchy
- relevant user/task/state obligations
- interface and capability behavior
- copy, disclosure, failure, and recovery contracts
- restraint and pacing from patterns
- concrete precedent from exemplars
- accessibility, responsive behavior, and visual choices when they are grounded
  in principles, contracts, or patterns

If requested work intentionally diverges from memory, the agent should name the
divergence in its response. Memory changes are ordinary Git-reviewed edits to
`fingerprint.yml`, `checks.yml`, and optional rationale files when present.

## Review

`ghost check` is deterministic:

```bash
ghost check --base main --format json
```

Without `--package`, `ghost check` groups changed files by resolved memory
stack and runs the merged checks for each group. Only active checks can block.
Active checks must be grounded in typed fingerprint refs such as
`principle:*`, `experience_contract:*`, `pattern:*`, or `situation:*`.
The JSON report uses schema `ghost.check-report/v1`; host adapters should map
Ghost severities into their own review vocabulary outside Ghost.

`ghost review` is advisory:

```bash
ghost review --base main --include-memory
```

Without `--package`, advisory review packets include `stacks[]`, one for each
changed-file memory stack. Each stack includes changed files, layer dirs, merged
fingerprint memory, merged checks, decisions, and provenance.

Advisory review packets include:

- the current diff
- `fingerprint.yml` memory
- relevant exemplars
- active checks
- optional accepted decisions
- finding categories for fixes, intentional divergence, missing memory,
  experience gaps, and eval uncertainty

Review findings should cite the diff location, relevant fingerprint memory,
relevant exemplars when useful, and any active check when blocking.

## Remediation

When review flags drift, the host agent chooses the smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Update `fingerprint.yml`, `checks.yml`, or optional rationale files when the
  user asks to change memory.

The loop is:

```text
brief from fingerprint
  -> generate or edit
  -> run ghost check
  -> run ghost review
  -> fix code or update memory through Git
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
