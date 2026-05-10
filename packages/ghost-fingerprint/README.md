# ghost-fingerprint

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
```

Survey grounds the bundle. Patterns make composition operational. Optional
checks fail builds. Optional intent records human-authored or human-approved
product direction.

## Stages

| Stage | Artifact | Schema | Role |
|---|---|---|---|
| Resources | `resources.yml` | `ghost.resources/v1` | Declare references that define the product. |
| Map | `map.md` | `ghost.map/v2` | Route changes to scopes and observable UI surfaces. |
| Survey | `survey.json` | `ghost.survey/v2` | Record factual values, tokens, components, surfaces, and composition observations. |
| Patterns | `patterns.yml` | `ghost.patterns/v1` | Codify surface types and composition grammar with evidence. |
| Checks | `checks.yml` | `ghost.checks/v1` | Store optional human-promoted deterministic gates. |
| Intent | `intent.md` | Markdown | Optional human authority. |

## Use

```bash
ghost-fingerprint init-package --with-intent

ghost-fingerprint inventory
ghost-fingerprint lint                         # defaults to .ghost
ghost-fingerprint scan-status

ghost-fingerprint survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost-fingerprint survey summarize .ghost/survey.json
ghost-fingerprint survey catalog .ghost/survey.json --kind color
ghost-fingerprint survey patterns .ghost/survey.json -o .ghost/patterns.yml

ghost-fingerprint verify .ghost --root .
ghost-fingerprint describe                     # defaults to .ghost/intent.md
ghost-fingerprint diff a.fingerprint.md b.fingerprint.md

ghost-fingerprint emit context-bundle
ghost-fingerprint emit skill
```

Zero config for every verb. No API key needed.

## As A Library

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  verifyFingerprintPackage,
} from "ghost-fingerprint";

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
ghost-fingerprint emit skill
```

The bundle ships recipes for scan, map, survey, patterns, and schema reference.
Ask your agent to "scan this design language end-to-end"; it will author package
artifacts and use the CLI for validation.

## Format Docs

See [`docs/fingerprint-format.md`](https://github.com/block/ghost/blob/main/docs/fingerprint-format.md)
for the full package format.

## License

Apache-2.0
