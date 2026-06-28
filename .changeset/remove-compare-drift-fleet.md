---
"@anarchitecture/ghost": minor
---

Remove `compare`, `drift`, `ack`, `track`, and `diverge` commands and the direct `fingerprint.md` machinery (parser, writer, semantic diff, decisions/dimensions, embeddings, perceptual prior). These rested on a quantified visual-design-system model (fixed dimensions + decision embeddings) that the context-graph reframe abandoned; the concepts are parked for a graph-native rethink (see docs/ideas/compare-drift-fleet-rethink.md). The `./compare` and `./drift` package subpaths and the root `compare`/`drift` exports are removed. `ghost lint` now validates `.ghost/` packages and node/surface/check artifacts only (direct `fingerprint.md` is no longer linted); a `*.md` node file lints as a `ghost.node/v1` node.
