---
"@anarchitecture/ghost": minor
---

Remove the facet model — the graph is now the only fingerprint model. The `intent.yml`/`inventory.yml`/`composition.yml` schemas, the `GhostFingerprintDocument`, the facet→node load-time projection, and the dormant facet slice/grounding are deleted; the loader folds the package's directory tree of prose nodes directly into the graph. `ghost lint` and `ghost verify` are replaced by one `ghost validate` verb (artifact shape pass + node-graph pass: links resolve, one root, acyclic); `ghost emit` is removed. `ghost scan` now reports node/surface contribution instead of facet contribution. Legacy facet packages no longer load directly — `ghost validate`/load fail with guidance to run `ghost migrate`. Structured exemplar-path and evidence verification is dropped (evidence lives in node prose, per the prose-node model).
