# Fingerprint Generation Loop

Ghost gives UI generators and product-development agents a local, auditable
product-surface composition fingerprint. Generation starts from checked-in
facets; checks and review govern the result afterward.

```text
intent.yml + inventory.yml + composition.yml
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

Gather Relay JSON when a target path is known:

```bash
ghost relay gather apps/checkout/review/page.tsx --format json
```

By default, Relay uses the resolved `.ghost` fingerprint stack as its base
runtime. A Relay config can add declared sources, request resolvers, or opt out
of the fingerprint base entirely with `base.kind: none`.

For prompt-shaped work without a clear path, the host agent should first turn
the ask into a structured Relay request, then pass it to Ghost:

```yaml
schema: ghost.relay-request/v1
task: generate-interface
selectors:
  customer: merchant
  brand: square
  system: managerbot
  moment: cash-flow-gap
  medium: push
  capability: lending
```

```bash
ghost relay gather --request-stdin --format json
```

If the host framework stores Relay config outside `.ghost/relay.yml`, keep the
same command and pass the config:

```bash
GHOST_RELAY_CONFIG=.agents/ghost/relay.yml ghost relay gather --request-stdin --format json
ghost relay gather stacks/managerbot.cash-flow-gap.push.yml --config .agents/ghost/relay.yml --format json
```

The second form works for `base.kind: none` configs by synthesizing a minimal
`task: gather` Relay request from the target path.

The full `ghost.relay.gather/v2` result is the agent contract. Agents should
read `context`, `selected_context`, `targetPaths`, `source`, `stackDirs`, gaps,
and trace fields from JSON rather than scraping the markdown preview.

Use the JSON context in this order:

1. Start from the selected context hits and their match reasons.
2. Apply intent and composition hits before choosing implementation details.
3. Inspect inventory hits as concrete anchors.
4. Use `inventory.building_blocks` as curated material.
5. Run `ghost signals` when raw repo observations would help find evidence.
6. Skim active checks in `.ghost/validate.yml` so generation avoids
   deterministic failures.
7. Treat gaps as a signal to use local evidence provisionally or inspect the
   full facet files.

For quick terminal inspection, `ghost relay gather <target>` still prints a
compact human preview. The preview can omit projected Relay config sources that
are present in JSON.

Raw repo signals can help orient an agent:

```bash
ghost signals .
```

Signals answer what exists now and do not count as fingerprint contribution.
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

Advisory review packets include the current diff, the same context-hit model as
Relay, active checks, and finding categories for fixes, intentional
divergence, missing fingerprint grounding, experience gaps, and eval
uncertainty.

Review findings should cite the diff location, relevant fingerprint facet refs,
relevant exemplars when useful, any active check when blocking, and a
selected-context gap or local-evidence rationale when the fingerprint is silent.

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

Advanced wrappers that store fingerprint packages outside `.ghost` can set
`GHOST_PACKAGE_DIR=<relative-dir>` on stack-aware commands. `--package <dir>`
remains exact single-bundle mode and bypasses stack discovery. Wrappers that
store Relay runtime config elsewhere should set `GHOST_RELAY_CONFIG` or pass
`ghost relay gather --config <file>`.

## Legacy Cache Helpers

Older Ghost bundles used `resources.yml`, `map.md`, `survey.json`,
`patterns.yml`, and direct `fingerprint.yml` files under `.ghost/` as capture
material. Those files are now legacy/cache source material. Promote durable
conclusions into `intent.yml`, `inventory.yml`, and `composition.yml`.
