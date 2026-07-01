---
"@anarchitecture/ghost": minor
---

Rename the internal graph model to "catalog" to reflect the flat node set: public exports `GhostGraph`→`GhostCatalog`, `GhostGraphNode`→`GhostCatalogNode`, `buildGraphMenu`→`buildCatalogMenu`, `GraphMenuEntry`→`CatalogMenuEntry`, `assembleGraph`→`assembleCatalog`, and the loaded package's `graph` field is now `catalog`.
