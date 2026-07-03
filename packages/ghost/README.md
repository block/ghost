# @anarchitecture/ghost-fingerprint

**Write a brand decision down once, in your repo, so your agent reads it before
it builds and can review against it later.**

This package ships one CLI: `ghost`. Every command is also available as
`ghost-fingerprint` for when another tool owns the `ghost` bin.

## Install

```bash
npm install -D @anarchitecture/ghost-fingerprint
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
} from "@anarchitecture/ghost-fingerprint/fingerprint";
import { buildCatalogMenu } from "@anarchitecture/ghost-fingerprint/core";
import { buildCli } from "@anarchitecture/ghost-fingerprint/cli";
```

Available subpath exports: `@anarchitecture/ghost-fingerprint`,
`@anarchitecture/ghost-fingerprint/fingerprint`,
`@anarchitecture/ghost-fingerprint/core`,
`@anarchitecture/ghost-fingerprint/cli`, and
`@anarchitecture/ghost-fingerprint/scan`.

## License

Apache-2.0
