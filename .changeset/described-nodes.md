---
"@anarchitecture/ghost": minor
---

Make `description` a first-class node field — the retrieval payload an agent matches a task against, the way a tool is selected by name + description. `ghost gather` with no argument now lists nodes by id + description (the catalog), built from the graph rather than a separate surface menu. Node frontmatter is now passthrough: free-form descriptive keys (`audience`, `stage`, …) are allowed and ride along untouched. The surface composition-edge vocabulary (`composes`/`governed-by`) is removed — lateral composition lives on node `relates`.
