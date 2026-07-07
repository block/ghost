# @design-intelligence/ghost

**Your brand, packed for agents: a portable steering packet of prose truths,
checked into the repo, read before anything is made and reviewable after.**

This package ships one CLI: `ghost`. Every command is also available as
`ghost-fingerprint` for when another tool owns the `ghost` bin.

The scope is the thesis: the few still write the taste; they no longer gate it.
You hand the brand over as a packet of authority that travels to wherever work
ships.

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost --help
```

## Shape

```text
.ghost/
  manifest.yml          # schema + package id
  glossary.md           # category vocabulary
  index.md              # front door node
  principle.trust.md    # prose truth
  asset.logo.md         # prose truth, optionally with materials
  checks/               # optional review assertions; never gathered as nodes
```

A node is markdown with `description`, optional `materials`, and a prose body.
`materials` accepts repo-relative paths/globs and HTTPS URLs.

Checks live under `.ghost/checks/` (scaffold with `ghost checks init`) and
declare `references` to the nodes they review.
`ghost review` reads a diff, matches touched files to node materials, offers
relevant checks, and emits an advisory packet for the host agent.

## Use

```bash
ghost init
ghost checks init
ghost validate
ghost gather "checkout settings"
ghost pull principle.trust
ghost review --diff=-
ghost pulse
```

`ghost manifest` emits a self-describing JSON index of commands and flags.
`ghost skill install` installs the host-agent skill bundle.

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

## License

Apache-2.0
