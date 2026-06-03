# Product Fingerprint Loop

Ghost gives UI generators and product-development agents local, auditable
product experience memory. The canonical input is the resolved Ghost memory
stack for the task path, starting with `.ghost/fingerprint.yml` and adding any
nested child bundles.

```text
.ghost/fingerprint.yml
apps/checkout/.ghost/fingerprint.yml
merged checks, intent, decisions
.ghost/cache/inventory.json
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

Ghost prepares the input and checks the output. It does not own the generator.
Use any agent or tool that can read local context and apply changes.

## Before Generation

Build a brief from the resolved memory stack:

1. Run `ghost stack <path>` or resolve the applicable `.ghost/` layers for the
   task path.
2. Read broad-to-local merged `fingerprint.yml` memory.
3. Select the relevant `situations`.
4. Carry applicable `principles`, `experience_contracts`, and `patterns` into
   the work.
5. Use `implementation_vocabulary` only as current material that may help
   satisfy the selected product memory.
6. Read merged checks to know which deterministic rules can block.
7. Read accepted decisions and `intent.md` when product rationale matters.

Generated inventory can help orient an agent, but it is cache:

```bash
ghost inventory > .ghost/cache/inventory.json
```

Inventory answers what exists now. The fingerprint answers what matters, why,
and how agents should compose or review product experience.

## Generation

The generator should preserve:

- product identity and hierarchy
- relevant user/task/state obligations
- interface and capability behavior
- copy, disclosure, failure, and recovery contracts
- restraint and pacing from patterns
- accessibility, responsive behavior, and visual choices when they are grounded
  in principles, contracts, or patterns

If requested work intentionally diverges from memory, the agent should name the
divergence in its response. Memory changes are ordinary edits to
`fingerprint.yml`, `checks.yml`, decisions, or intent that go through Git review.

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
- active checks
- optional accepted decisions
- finding categories for fixes, intentional divergence, missing memory,
  experience gaps, and eval uncertainty

Review findings should cite the diff location, relevant fingerprint memory, and
any active check when blocking.

## Remediation

When review flags drift, the host agent chooses the smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Update `fingerprint.yml`, `checks.yml`, decisions, or intent when the user
  asks to change memory.

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

Wrappers that store memory outside `.ghost` can pass
`--memory-dir <relative-dir>` to stack-aware commands. `--package <dir>` remains
exact single-bundle mode and bypasses stack discovery.

## Legacy Cache Helpers

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`, and
`patterns.yml` as a capture pipeline. Those files are now legacy/cache source
material. Keep them only when useful for migration or optional inventory
workflows, and promote durable conclusions into `fingerprint.yml`.
