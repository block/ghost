# ghost-scan

**Author and validate Ghost's root repo-local fingerprint bundle. No LLM calls in any verb.**

Canonical package:

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

## Use

```bash
ghost-scan init-package --with-intent

ghost-scan inventory
ghost-scan lint                         # defaults to .ghost
ghost-scan scan-status

ghost-scan survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost-scan survey summarize .ghost/survey.json
ghost-scan survey catalog .ghost/survey.json --kind color
ghost-scan survey patterns .ghost/survey.json -o .ghost/patterns.yml

ghost-scan verify .ghost --root .
ghost-scan describe                     # defaults to .ghost/intent.md
ghost-scan diff a.fingerprint.md b.fingerprint.md

ghost-scan emit context-bundle
ghost-scan emit skill
```

Zero config for every verb. No API key needed.

## As A Library

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  verifyFingerprintPackage,
} from "ghost-scan";

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
ghost-scan emit skill
```

The bundle ships recipes for scan, map, survey, patterns, schema reference,
recall, brief, critique, capture, and promote. Ask your agent to "scan this
design language end-to-end" or "brief this work with Ghost"; it will author or
activate package artifacts and use the CLI for validation.

## Format Docs

See [`docs/fingerprint-format.md`](https://github.com/block/ghost/blob/main/docs/fingerprint-format.md)
for the full package format.

## License

Apache-2.0
