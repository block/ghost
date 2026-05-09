# ghost-fingerprint

**Author and validate Ghost's repo-local design memory package. No LLM calls in any verb.**

Canonical package:

```text
.ghost/fingerprint/
  map.md
  survey.json
  profile.md
  checks.yml
```

Checks fail builds. Profile shapes judgment. Survey grounds both. The package is
the fingerprint.

## Stages

| Stage | Artifact | Schema | Role |
|---|---|---|---|
| Map | `map.md` | `ghost.map/v2` | Route changes to scopes and observable UI surfaces. |
| Survey | `survey.json` | `ghost.survey/v2` | Record factual values, tokens, components, and UI surface evidence. |
| Profile | `profile.md` | profile frontmatter/body | Provide non-enforcing design-language guidance. |
| Checks | `checks.yml` | `ghost.checks/v1` | Store human-promoted deterministic gates. |

The CLI validates files, verifies profile-to-survey fidelity, inventories repo
signals, runs survey ops (`merge`, `fix-ids`, `summarize`, `catalog`,
`patterns`), diffs profiles, reports scan progress, and emits derived artifacts.

The actual writing is done by your host agent using the recipes in this package.
The CLI is the checker.

For deterministic drift gates and advisory review packets, see
**[`ghost-drift`](../ghost-drift)**.

## Use

```bash
ghost-fingerprint init-package

ghost-fingerprint inventory
ghost-fingerprint lint                         # defaults to .ghost/fingerprint
ghost-fingerprint scan-status

ghost-fingerprint survey fix-ids .ghost/fingerprint/survey.json -o .ghost/fingerprint/survey.json
ghost-fingerprint survey summarize .ghost/fingerprint/survey.json
ghost-fingerprint survey catalog .ghost/fingerprint/survey.json --kind color
ghost-fingerprint survey patterns .ghost/fingerprint/survey.json

ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root .
ghost-fingerprint describe                     # defaults to .ghost/fingerprint/profile.md
ghost-fingerprint diff a.profile.md b.profile.md

ghost-fingerprint emit context-bundle
ghost-fingerprint emit skill
```

Zero config for every verb. No API key needed.

## As A Library

```ts
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  parseFingerprint,
  verifyProfile,
} from "ghost-fingerprint";

const paths = await initFingerprintPackage(undefined, process.cwd());
const lint = await lintFingerprintPackage(undefined, process.cwd());
const { fingerprint } = parseFingerprint(await readFile(paths.profile, "utf8"));
const verify = verifyProfile(profileSource, survey, { root: "." });
```

## Skill Bundle

```bash
ghost-fingerprint emit skill
```

The bundle ships recipes for scan, map, survey, profile, and schema reference.
Ask your agent to "scan this design language end-to-end" or "profile this design
language"; it will author package artifacts and use the CLI for validation.

## Format Docs

See [`docs/fingerprint-format.md`](https://github.com/block/ghost/blob/main/docs/fingerprint-format.md)
for the full package format.

## License

Apache-2.0
