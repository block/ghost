# Host Adapter Integration

Ghost is adapter-neutral. It owns the portable fingerprint package,
deterministic validation, stack resolution, and machine-readable packets. Host
tools consume that fingerprint contract and own display, severity mapping, and
review/check file formats.

## Responsibilities

Ghost provides:

- `.ghost/` package loading and stack merging.
- `intent.yml`, `inventory.yml`, and `composition.yml` as generation context.
- Optional `validate.yml`.
- `ghost signals` stdout output for raw repo observations.
- `ghost check --format json` as the stable `ghost.check-report/v1` contract.
- `ghost review --format json` for advisory packets grounded in the resolved
  fingerprint stack.
- `ghost relay gather [target] --format json` as the `ghost.relay.gather/v2`
  contract for generation context. Host adapters should consume JSON fields
  such as `context`, `selected_context`, `source`, `targetPaths`, `stackDirs`,
  gaps, and trace data instead of scraping markdown.
- `ghost relay gather --request <file> --format json` and
  `ghost relay gather --request-stdin --format json` for prompt-shaped tasks
  where the host adapter can provide a structured `ghost.relay-request/v1`.
- Relay configs as the execution contract for context gathering. Omitted
  `base` means `base.kind: fingerprint`; explicit `base.kind: none` lets a
  framework repo gather declared request context without a `.ghost` package.
- `GHOST_PACKAGE_DIR=<relative-dir>` for wrappers that store Ghost package
  roots somewhere other than `.ghost`.
- `GHOST_RELAY_CONFIG=<relative-file>` for wrappers that store Relay config
  somewhere other than `.ghost/relay.yml`.

Host adapters provide:

- repo-specific installation workflows
- policies for when to capture, validate, generate from, govern, or compare a
  fingerprint
- generated review/check files in the host's native format
- severity mapping from Ghost's `critical | serious | nit`
- policy for when a finding blocks, comments, or remains advisory
- normal Git review for fingerprint edits

Raw repo signals are authoring evidence, not canonical inventory. The checked-in
facet files remain the authority.

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

The default package root is `.ghost`. Wrappers can use any safe relative
package root by setting `GHOST_PACKAGE_DIR` on the Ghost process:

```bash
GHOST_PACKAGE_DIR=.design/memory ghost init --scope apps/checkout
GHOST_PACKAGE_DIR=.design/memory ghost stack apps/checkout/review/page.tsx --format json
GHOST_PACKAGE_DIR=.design/memory ghost relay gather apps/checkout/review/page.tsx --format json
GHOST_PACKAGE_DIR=.design/memory ghost check --base main --format json
GHOST_PACKAGE_DIR=.design/memory ghost review --base main --format json
```

`--package <dir>` remains exact single-bundle mode. Use it when the caller
already knows the package root and wants to bypass stack discovery.

## Relay Context Flow

Use JSON as the agent contract:

```bash
ghost relay gather apps/checkout/review/page.tsx --format json
```

Relay first loads config by precedence: `--config`, `GHOST_RELAY_CONFIG`,
discovered `.ghost/relay.yml`, then the built-in default config. Source paths
inside a Relay config are resolved from the repo root/current working directory,
not from the config file directory.

When the user prompt is not naturally tied to one repo path, the host adapter
should create a Relay request from the prompt and pass it to Ghost:

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

Framework-owned contexts can keep the same command and provide their runtime
config explicitly:

```bash
GHOST_RELAY_CONFIG=.agents/ghost/relay.yml ghost relay gather --request-stdin --format json
ghost relay gather stacks/managerbot.cash-flow-gap.push.yml --config .agents/ghost/relay.yml --format json
```

Use `base.kind: none` in that config when there is no base Ghost fingerprint
package. Ghost will return deterministic gaps such as `no-base-fingerprint`
instead of throwing a missing `.ghost/manifest.yml` error.

The nested `context.schema` value is `ghost.relay-context/v1`. The top-level
`brief` field is display text for humans and compatibility. Plain markdown
output from `ghost relay gather <target>` is a compact human preview and may
omit projected Relay config sources that are present in JSON.

Ghost resolves request selectors deterministically against declared Relay
config resolvers. Natural-language extraction belongs to the host adapter, not
Ghost core.

## Fingerprint Edits

Adapters do not need a special Ghost draft state. If fingerprint work is
uncommitted or unmerged, it is draft work. Once the split fingerprint package,
checks, decisions, or intent are checked in, Ghost treats them as truth for
deterministic tooling.
