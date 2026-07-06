# @decentralized-design/ghost

**Your brand, packed for agents: a portable steering packet of prose truths,
checked into the repo, read before anything is made and reviewable after.**

This package ships one CLI: `ghost`. Every command is also available as
`ghost-fingerprint` for when another tool owns the `ghost` bin.

The scope is the thesis: the few still write the taste; they no longer gate it.
You hand the brand over as a packet of authority that travels to wherever work
ships.

## Install

```bash
npm install -D @decentralized-design/ghost
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
  haunts/               # optional attached capabilities; never gathered as nodes
    checks/             # the first haunt: review assertions
```

A node is markdown with `description`, optional `materials`, and a prose body.
`materials` accepts repo-relative paths/globs and HTTPS URLs.

A haunt is an optional capability attached under `.ghost/haunts/<id>/`; manage
them with `ghost haunt add|remove|list`. Checks — the first haunt — live under
`.ghost/haunts/checks/` and declare `references` to the nodes they review.
`ghost review` reads a diff, matches touched files to node materials, offers
relevant checks, and emits an advisory packet for the host agent.

## Use

```bash
ghost init
ghost haunt add checks
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
} from "@decentralized-design/ghost/fingerprint";
import { buildCatalogMenu } from "@decentralized-design/ghost/core";
import { buildCli } from "@decentralized-design/ghost/cli";
```

Available subpath exports: `@decentralized-design/ghost`,
`@decentralized-design/ghost/fingerprint`,
`@decentralized-design/ghost/core`,
`@decentralized-design/ghost/cli`, and
`@decentralized-design/ghost/scan`.

## License

Apache-2.0
