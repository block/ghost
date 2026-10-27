/**
 * Public surface for the in-memory ghost catalog — a flat map of prose
 * nodes assembled from the package's markdown files. Optional scope/layer metadata
 * classifies content; explicit prerequisites expand selected pulls.
 */

export {
  type AssembleCatalogInput,
  assembleCatalog,
  type PlacedNode,
} from "./assemble.js";
export { closestIds } from "./closest.js";
export { buildCatalogMenu, type CatalogMenuEntry } from "./menu.js";
export type { GhostCatalog, GhostCatalogNode } from "./types.js";
