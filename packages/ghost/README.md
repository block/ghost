# @anarchitecture/ghost

**A unified Ghost CLI for product-surface composition fingerprints.**

Ghost captures the composition of a product surface: the intent behind it, the
materials it draws from, and the patterns that make it feel intentional. It
stores that composition in a repo-local `.ghost/` package that host
agents can read before generation and validate after changes.

This package ships one CLI: `ghost`.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/` package shape, and public JavaScript exports may
> change in breaking ways before a stable 1.0 release.
>
> Breaking changes may ship in minor versions while Ghost is pre-1.0. Patch
> versions are reserved for fixes that should not require migration. If you adopt
> Ghost today, expect some churn, pin the version you depend on, and review
> release notes before upgrading.

## Install

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
npx ghost --help --all
```

`ghost --help` shows the core workflow. `ghost --help --all` shows the complete
command index.

## Use

Create and validate the fingerprint package:

```bash
ghost init
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
```

Gather context before generation:

```bash
ghost relay gather apps/checkout/review/page.tsx
```

Govern changes afterward:

```bash
ghost check --base main
ghost review --base main
```

Install the BYOA skill bundle so your host agent can author, brief, review,
verify, remediate, and update fingerprints:

```bash
ghost skill install
```

Advanced commands such as `signals`, `stack`, `compare`, `ack`, `track`, and
`diverge` remain available in the full command index.

Zero config for every verb. No API key is required. `OPENAI_API_KEY` /
`VOYAGE_API_KEY` are optional and only used by semantic embedding helpers when a
host opts in.

## Library

```ts
import { compare } from "@anarchitecture/ghost/compare";
import { runGhostCheck } from "@anarchitecture/ghost/govern";
import { gatherRelayContext } from "@anarchitecture/ghost/relay";
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  verifyFingerprintPackage,
} from "@anarchitecture/ghost/fingerprint";
```

## BYOA

Ghost is bring-your-own-agent. The CLI performs deterministic work: repo
signals, readiness reporting, linting, verification, comparison, checks, and
advisory review packet generation. The installed `ghost` skill teaches a host
agent how to capture canonical `.ghost/` surface-composition
context, brief and generate work from it, review changes against it, verify
generated UI, remediate issues, and suggest fingerprint edits when the user
asks.

```text
Set up the Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this PR against the Ghost fingerprint.
```

## Maintainers

npm renders this package-local `README.md`, not the monorepo root README. The
npm package page updates only when a new package version is published, so
README-only changes still need a patch changeset and release.

## License

Apache-2.0
