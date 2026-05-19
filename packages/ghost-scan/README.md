# ghost-scan

**Private historical scan package. Use `@anarchitecture/ghost` and the `ghost`
CLI for current workflows.**

The scan runtime and skill recipes needed by the public package are now folded
into [`packages/ghost`](../ghost). This package remains in the monorepo for
historical/development context and compatibility while the public npm surface is
the unified `@anarchitecture/ghost` package.

The current canonical bundle shape is:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md        # optional
  decisions/       # optional
  proposals/       # optional
```

Survey grounds the bundle. Patterns make composition operational. Optional
checks fail builds. Optional intent records human-authored or human-approved
product direction. Optional decisions and proposals record auditable
product-experience memory without becoming deterministic gates.

## Stages

| Stage | Artifact | Schema | Role |
|---|---|---|---|
| Resources | `resources.yml` | `ghost.resources/v1` | Declare references that define the product. |
| Map | `map.md` | `ghost.map/v2` | Route changes to scopes and observable UI surfaces. |
| Survey | `survey.json` | `ghost.survey/v2` | Record factual values, tokens, components, surfaces, and composition observations. |
| Patterns | `patterns.yml` | `ghost.patterns/v1` | Codify surface types and composition grammar with evidence. |
| Checks | `checks.yml` | `ghost.checks/v1` | Store optional human-promoted deterministic gates. |
| Intent | `intent.md` | Markdown | Optional human authority. |
| Decisions | `decisions/*.yml` | `ghost.decision/v1` | Optional accepted/rejected product-experience rationale. |
| Proposals | `proposals/*.yml` | `ghost.proposal/v1` | Optional candidate memory changes before promotion. |

## Current CLI

Install and use the unified package:

```bash
npm install -D @anarchitecture/ghost
npx ghost skill install
```

The current commands are:

```bash
ghost init --with-intent

ghost inventory
ghost scan --format json
ghost lint .ghost

ghost survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost survey summarize .ghost/survey.json
ghost survey catalog .ghost/survey.json --kind color
ghost survey patterns .ghost/survey.json -o .ghost/patterns.yml

ghost verify .ghost --root .
ghost describe
ghost diff a.fingerprint.md b.fingerprint.md

ghost emit context-bundle
ghost skill install
```

Zero config for every verb. No API key needed.

## Current Library Imports

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  verifyFingerprintPackage,
} from "@anarchitecture/ghost/scan";

const paths = await initFingerprintPackage(undefined, process.cwd(), {
  withIntent: true,
});
const lint = await lintFingerprintPackage(undefined, process.cwd());
const verify = await verifyFingerprintPackage(undefined, process.cwd(), {
  root: ".",
});
```

## Skill Bundle

```bash
ghost skill install
```

The unified bundle ships recipes for capture, map, survey, patterns, schema
reference, recall, brief, critique, review, verify, compare, remediate, propose,
and promote. Ask your agent to "capture a Ghost fingerprint for this repo" or
"brief this work with Ghost"; it will author or activate `.ghost/` artifacts
and use the CLI for deterministic validation.

## Format Docs

See [`docs/fingerprint-format.md`](../../docs/fingerprint-format.md) for the
full bundle format.

## License

Apache-2.0
