# @anarchitecture/ghost

**A unified Ghost CLI for product-surface composition fingerprints.**

Agents can assemble UI. They can't reliably preserve the _composition_ behind it
— the hierarchy, density, restraint, copy, trust, and flow that make a surface
feel intentional. Ghost captures that composition in a repo-local `.ghost/`
package that a host agent reads before it builds and checks after it changes.

This package ships one CLI: `ghost`.

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
npm install -D @anarchitecture/ghost
npx ghost --help
npx ghost --help --all
```

`ghost --help` shows the core workflow. `ghost --help --all` shows the complete
command index, and `ghost <command> --help` shows flags for one command.

## The Shape

A fingerprint is a directory tree of prose — a **graph of nodes**:

```text
.ghost/
  manifest.yml          # schema + id
  index.md              # the core node — true everywhere (optional)
  <surface>/index.md    # a surface's own prose (the directory is the surface)
  <surface>/<node>.md   # a prose node placed in that surface
  checks/*.md           # optional ghost.check/v1 checks
```

The **directory tree is the graph**. A node is one markdown file: descriptive
frontmatter (`description`, `relates`, `incarnation`) plus a prose body written
through three lenses — **intent** (the why), **inventory** (the materials), and
**composition** (the patterns). A node's id is its path and its parent is its
directory; a surface is just a directory, and the package-root `index.md` is the
implicit `core` node that reaches every surface.

## Use

Create and validate the fingerprint package:

```bash
ghost init
ghost validate
ghost scan
```

Gather context before generation:

```bash
ghost gather               # list nodes by id + description
ghost gather checkout      # compose a surface's context slice
```

Govern changes afterward:

```bash
ghost checks --surface checkout
ghost review --surface checkout --base main
```

Install the BYOA skill bundle so your host agent can author, brief, review, and
verify fingerprints:

```bash
ghost skill install
```

Advanced and maintenance commands — `signals` and `migrate` — remain available
in the full command index.

No API key is required. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are optional and
only used by semantic embedding helpers when a host opts in.

## Library

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
} from "@anarchitecture/ghost/fingerprint";
import { buildCli } from "@anarchitecture/ghost/cli";
```

Available subpath exports: `@anarchitecture/ghost`,
`@anarchitecture/ghost/scan`, `@anarchitecture/ghost/fingerprint`,
`@anarchitecture/ghost/core`, and `@anarchitecture/ghost/cli`.

## BYOA

Ghost is bring-your-own-agent. The CLI performs deterministic work: repo
signals, contribution reporting, graph validation, context composition, check
routing, and advisory review packets. The installed `ghost` skill teaches a host
agent how to capture canonical `.ghost/` surface-composition context, brief and
generate work from it, review changes against it, and verify generated UI.

```text
Set up the Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this change against the Ghost fingerprint.
```

## Maintainers

npm renders this package-local `README.md`, not the monorepo root README. The
npm package page updates only when a new package version is published, so
README-only changes still need a patch changeset and release.

## License

Apache-2.0
