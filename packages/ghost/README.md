# @anarchitecture/ghost-fingerprint

**Write a brand decision down once, in your repo, so your agent reads it
before it builds.**

Agents can assemble UI, copy, and email. What they can't do is remember the
decisions behind your product — the stance, the density, the restraint, the
trust moves you keep re-stating in review. Ghost keeps those decisions in a
repo-local `.ghost/` folder of plain markdown that a host agent reads before
it generates.

This package ships one CLI: `ghost`. Every command is also available as
`ghost-fingerprint` for when another tool owns the `ghost` bin.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, node schema, on-disk
> `.ghost/` package shape, and public JavaScript exports may change in breaking
> ways before a stable 1.0 release.
>
> Breaking changes may ship in minor versions while Ghost is pre-1.0. Patch
> versions are reserved for fixes that should not require migration. If you adopt
> Ghost today, pin the version you depend on and review release notes before
> upgrading.

## Install

```bash
npm install -D @anarchitecture/ghost-fingerprint
npx ghost --help
```

`ghost --help` shows the core workflow, `ghost --help --all` the complete
command index, and `ghost <command> --help` the flags for one command.

## The Shape

A fingerprint is a **flat folder of prose nodes** — no hierarchy, no
inheritance, no links between files:

```text
.ghost/
  manifest.yml          # schema + package id (the anchor)
  glossary.md           # your category vocabulary + what each category means
  index.md              # the curated front door node
  principle.trust.md    # a brand truth of kind `principle`
  voice.md              # an uncategorized brand truth
  haunt/                # reserved: the adherence plugin's data; never a node
```

A node is one markdown file: a `description` in frontmatter (the one-liner
`gather` shows), a brand truth in the prose body. Its id is its filename minus
`.md`; its kind is the prefix before the first dot, declared in the glossary.
A truth that holds everywhere is stated plainly; a narrower truth names the
**condition** it applies in, right in the prose. The agent reads the condition
and decides when it applies.

## Use

Create and validate the fingerprint package:

```bash
ghost init          # scaffold .ghost/ (manifest + glossary + starter index.md)
ghost validate      # package shape + node validity + glossary kind prefixes
```

Gather context before generation:

```bash
ghost gather        # list every truth by id, kind, and description — the agent selects
```

Install the skill bundle so your host agent (Claude Code, Codex, Cursor,
Goose, …) knows how to author and consume the fingerprint:

```bash
ghost skill install
```

`ghost manifest` (a self-describing JSON index of commands and flags) remains
available for tooling.

Ghost is **feed-forward**: it grounds generation and never grades output.
Reviewing diffs and auditing code against the fingerprint live in Haunt, the
private adherence plugin (`ghost-haunt review`, `ghost-haunt integrity`).

No API key is required.

## BYOA

Ghost is bring-your-own-agent. The CLI does the deterministic work: package
validation, node validity, glossary checks, and the flat gather menu. The
installed `ghost` skill teaches a host agent how to capture brand truths as
`.ghost/` nodes and how to brief generation work from them.

```text
Set up the Ghost fingerprint for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the Ghost fingerprint.
```

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
`@anarchitecture/ghost-fingerprint/scan` (deprecated).

## Maintainers

npm renders this package-local `README.md`, not the monorepo root README. The
npm package page updates only when a new package version is published, so
README-only changes still need a patch changeset and release.

## License

Apache-2.0
