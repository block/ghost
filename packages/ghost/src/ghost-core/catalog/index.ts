/**
 * Public surface for the in-memory fingerprint catalog — a flat map of prose
 * nodes folded from the package's directory tree. No edges, no cascade, no
 * traversal: the agent selects from the menu (`gather`).
 */

export {
  type AssembleCatalogInput,
  assembleCatalog,
  type PlacedNode,
} from "./assemble.js";
export { closestIds } from "./closest.js";
export { buildCatalogMenu, type CatalogMenuEntry } from "./menu.js";
export type { GhostCatalog, GhostCatalogNode } from "./types.js";
