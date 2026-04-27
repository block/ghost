export { computeDriftVectors, DIMENSION_RANGES } from "@ghost/core";
export type { CompositeClusterOptions } from "./composite.js";
export { compareComposite } from "./composite.js";
export { emitExpression } from "./emit.js";
export { appendHistory, readHistory, readRecentHistory } from "./history.js";
export type { CheckBoundsOptions } from "./sync.js";
export {
  acknowledge,
  checkBounds,
  readSyncManifest,
  writeSyncManifest,
} from "./sync.js";
export { computeTemporalComparison } from "./temporal.js";
export {
  normalizeTrackedSource,
  resolveTrackedExpression,
} from "./tracking.js";
