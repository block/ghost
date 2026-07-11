# @design-intelligence/ghost

**Ghost is your brand, packed for agents.** A `.ghost/` folder of plain-prose
truths (your stance, your voice, your trust moves) checked into the repo and
read by any agent before it makes anything: a screen, an email, an empty
state, a sentence.

Today those decisions live in reviewers' heads: "that's not our voice," again,
on every surface. The agent that built the thing never saw them. Ghost writes
them down once, where the agent looks first.

[Documentation](https://block.github.io/ghost/)

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

## Use It

Ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
fingerprint, then ask in plain English:

```text
Set up the Ghost fingerprint for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the Ghost fingerprint.
Review this diff against the Ghost checks.
```

Ghost never calls an LLM itself; your agent does the thinking. No API key,
no lock-in.

## The Loop

```bash
ghost init          # scaffold .ghost/ with the skeleton starter
ghost checks init   # opt in to review assertions
ghost validate      # make sure the fingerprint is well-formed
ghost gather <ask>  # before building: list every truth relevant to this task
ghost pull <ids>    # read the picked truths' full bodies
ghost review        # during review: match a diff to truths and checks
ghost export        # package the fingerprint as a portable artifact
ghost pulse         # while tuning: see what agents reached for
```

Run `ghost --help` for the core workflow and `ghost <command> --help` for
flags.

## Shape

```text
.ghost/
  manifest.yml          # schema + package id + optional cover id
  glossary.md           # your kind vocabulary + what each kind means
  brand.md              # example cover inlined by gather
  principle.trust.md    # a brand truth of kind `principle`
  asset.logo.md         # a truth that may point at concrete materials
  checks/               # optional review assertions; separate from your truths
```

The optional `cover:` in `manifest.yml` may name any node; `ghost gather`
inlines it before the menu. The default skeleton calls that node `brand`, but
the filename is not reserved.

A node is markdown with a `description`, optional `materials`, and a prose body.
`materials` is a list of paths or URLs pointing at the concrete stuff the truth
is about.

Checks live under `.ghost/checks/` (scaffold with `ghost checks init`) and
declare `references` to the truths they review. `ghost review` reads a diff,
matches touched files to node `materials`, offers relevant checks, and emits
an advisory packet for the host agent to weigh.

## Library

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  loadFingerprintPackage,
} from "@design-intelligence/ghost/fingerprint";
import { buildCatalogMenu } from "@design-intelligence/ghost/core";
import { buildCli } from "@design-intelligence/ghost/cli";
```

Available subpath exports: `@design-intelligence/ghost`,
`@design-intelligence/ghost/fingerprint`,
`@design-intelligence/ghost/core`,
`@design-intelligence/ghost/cli`, and
`@design-intelligence/ghost/scan`.

## Project Status: Beta

Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
on-disk `.ghost/` package shape, and public JavaScript exports may change in
breaking ways before a stable 1.0 release. Breaking changes may ship in minor
versions; patch versions are reserved for fixes that should not require
migration. Pin the version you depend on and review release notes before
upgrading.

Every `ghost` command is also available as `ghost-fingerprint` for when
another tool owns the `ghost` bin.

## License

Apache-2.0
