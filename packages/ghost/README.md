# @anarchitecture/ghost

**Unified Ghost CLI for repo-local product-experience world models.**

Ghost initializes root `.ghost/fingerprint/` memory, checks diffs against
deterministic gates, emits advisory review packets, compares packages, and
records intentional drift. It ships one CLI: `ghost`.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/fingerprint/` package shape, and public JavaScript exports may
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

`ghost --help` shows the core workflow. `ghost --help --all` shows the full
advanced and legacy command index.

## Use

```bash
ghost init --with-intent
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main
ghost review --base main --include-memory
ghost emit review-command
ghost emit context-bundle
ghost skill install
```

Advanced commands such as `inventory`, `compare`, `ack`, and `diverge` remain
available and appear in the full help index.

Zero config for every verb. No API key is required. `OPENAI_API_KEY` /
`VOYAGE_API_KEY` are optional and only used by semantic embedding helpers when a
host opts in.

## Library

```ts
import { compare, runGhostDriftCheck } from "@anarchitecture/ghost/drift";
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  verifyFingerprintPackage,
} from "@anarchitecture/ghost/scan";
import { compareFingerprints } from "@anarchitecture/ghost/core";
```

## BYOA

Ghost is bring-your-own-agent. The CLI performs deterministic work: inventory,
lint, verify, compare, check, and handoff packet generation. The installed
`ghost` skill teaches your host agent how to capture canonical
`.ghost/fingerprint/` memory, brief work from it, review drift, verify
generated UI, remediate issues, and suggest memory edits when the user asks.

```bash
ghost skill install
```

Then ask your agent:

```text
Set up Ghost memory for this repo.
```

## License

Apache-2.0
