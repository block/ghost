# Product Fingerprint Loop

Ghost gives UI generators and product-development agents a local, auditable
product experience memory. The canonical input is `.ghost/fingerprint.yml`.

```text
.ghost/fingerprint.yml
.ghost/checks.yml
.ghost/intent.md
.ghost/decisions/*.yml
.ghost/proposals/*.yml
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

Build a brief from canonical memory:

1. Read `.ghost/fingerprint.yml`.
2. Select the relevant `situations`.
3. Carry applicable `principles`, `experience_contracts`, `patterns`, and
   `substrate` into the work.
4. Read `.ghost/checks.yml` to know which deterministic rules can block.
5. Read open `.ghost/proposals/*.yml` as unresolved context, not truth.

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
- visual substrate, accessibility, and responsive policy
- restraint and pacing from accepted patterns

If the requested work intentionally diverges from memory, the agent should name
the divergence in its response or create a proposal. It should not rewrite
canonical memory silently.

## Review

`ghost check` is deterministic:

```bash
ghost check --base main
```

Only active checks in `.ghost/checks.yml` can block. Active checks must be
grounded in typed fingerprint refs such as `principle:*`,
`experience_contract:*`, `pattern:*`, `situation:*`, or `substrate:*`.

`ghost review` is advisory:

```bash
ghost review --base main --include-memory
```

Advisory review packets include:

- the current diff
- `fingerprint.yml` memory
- active checks
- optional accepted decisions
- open proposals
- finding categories for fixes, intentional divergence, missing memory,
  experience gaps, and eval uncertainty

Review findings should cite the diff location, relevant fingerprint memory, any
active check when blocking, and open proposals when relevant.

## Remediation

When review flags drift, the host agent chooses the smallest useful response:

- Fix the generated or changed code.
- Explain why a divergence is intentional.
- Create a `missing-memory`, `intentional-divergence`, `experience-gap`, or
  `check-candidate` proposal.
- Promote memory only when a human accepts the change.

The loop is:

```text
brief from fingerprint
  -> generate or edit
  -> run ghost check
  -> run ghost review
  -> fix code or propose memory
  -> human promotes durable memory
```

## CI

CI should run deterministic checks for UI-touching changes. Advisory review can
attach a packet or comment, but it should not fail the build unless a finding is
backed by an active check.

```bash
ghost check --base main
ghost review --base main --format markdown
```

## Legacy Cache Helpers

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`, and
`patterns.yml` as a capture pipeline. Those files are now legacy/cache source
material. Keep them only when useful for migration or optional inventory
workflows, and promote durable conclusions into `fingerprint.yml`.
