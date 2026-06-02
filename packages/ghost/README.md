# @anarchitecture/ghost

**Unified Ghost CLI for repo-local product fingerprints.**

Ghost supports Fingerprint Capture for a root `.ghost/` bundle, checks diffs
against deterministic gates, emits advisory review packets, compares bundles,
and records intentional drift. It ships one CLI: `ghost`.

## Install

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
```

## Use

```bash
ghost init --with-intent
ghost scan --format json
ghost inventory
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main
ghost review --base main --include-memory
ghost compare a/.ghost b/.ghost
ghost ack
ghost diverge typography --reason "Product deliberately uses an editorial scale"
ghost emit review-command
ghost emit context-bundle
ghost skill install
```

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
`.ghost/fingerprint.yml` memory, brief work from it, review drift, verify
generated UI, remediate issues, and propose candidate fingerprint updates.

```bash
ghost skill install
```

Then ask your agent:

```text
Capture a Ghost fingerprint for this repo.
```

## License

Apache-2.0
