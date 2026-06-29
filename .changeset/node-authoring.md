---
"@anarchitecture/ghost": minor
---

`ghost init` now scaffolds a node package (`manifest.yml` + a core `index.md` node) via a template registry (`--template <name>`, `default` for now) instead of emitting `intent.yml`/`inventory.yml`/`composition.yml`; the `--reference` flag is removed. `ghost migrate` now performs a one-way conversion of legacy/facet packages into a directory tree of nodes (the facet→node projection becomes the writer) and removes the old facet files. The authoring skill (`capture.md`, `SKILL.md`) teaches node authoring with intent/inventory/composition as authoring lenses rather than facet files.
