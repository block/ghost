export type { CompositeClusterOptions } from "./composite.js";
export { compareComposite } from "./composite.js";
export { emitFingerprint } from "./emit.js";
export { appendHistory, readHistory, readRecentHistory } from "./history.js";
export { normalizeParentSource, resolveParent } from "./parent.js";
export type { CheckBoundsOptions } from "./sync.js";
export {
  acknowledge,
  checkBounds,
  readSyncManifest,
  writeSyncManifest,
} from "./sync.js";
export { computeTemporalComparison } from "./temporal.js";
export { computeDriftVectors, DIMENSION_RANGES } from "./vector.js";
