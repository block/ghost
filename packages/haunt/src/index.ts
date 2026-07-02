/**
 * haunt — the BYO-design-system adherence and drift layer for Ghost (Problem A).
 *
 * Where Fingerprint (@anarchitecture/ghost-fingerprint) carries the portable,
 * medium-agnostic intent contract, Haunt is the implementation-side
 * counterpart: it bridges to the design-system code a repo already owns (code
 * as source of truth) and grades *high-altitude* compositional drift against
 * the fingerprint's brand truths.
 *
 * On-disk shape: a `.haunt/` package of two flat dirs — inventory (materials +
 * `paths` to code) and checks (`ghost.check/v1` documents whose `references`
 * bind them to local inventory ids and/or `.ghost/` fingerprint node targets).
 * Brand stance lives in `.ghost/` as Fingerprint nodes, consumed via
 * `@anarchitecture/ghost-fingerprint` — a fingerprint is *required* for
 * `ghost-haunt review` (see notes/haunt-reconciliation.md).
 */

export const HAUNT_VERSION = "0.0.0";

export type { BaselineProse } from "./baseline/resolve.js";
export { resolveBaseline } from "./baseline/resolve.js";
export type { BridgeResolution } from "./bridge/resolve.js";
export { resolveBridge } from "./bridge/resolve.js";
export { listRepoFiles, partitionInventory } from "./bridge/tree.js";
export { buildCli } from "./cli.js";
export { runIntegrity } from "./commands/integrity.js";
export type {
  IntegrityGap,
  IntegrityMaterial,
  IntegrityPacket,
} from "./commands/integrity-packet.js";
export {
  buildIntegrityPacket,
  formatIntegrityPacket,
} from "./commands/integrity-packet.js";
export { runReview } from "./commands/review.js";
export type { ReviewPacket } from "./commands/review-packet.js";
export {
  buildReviewPacket,
  formatReviewPacket,
} from "./commands/review-packet.js";
export { runSkillInstall } from "./commands/skill.js";
export { runValidate } from "./commands/validate.js";
export type { LoadedFingerprintPackage } from "./fingerprint/load.js";
export { loadFingerprint } from "./fingerprint/load.js";
export { validateHauntGraph } from "./graph/validate.js";
export type { HauntReference } from "./model/ids.js";
export { classifyReference } from "./model/ids.js";
export { HAUNT_PACKAGE_SCHEMA } from "./model/schema.js";
export type {
  HauntCheck,
  HauntInventory,
  HauntLintIssue,
  HauntLintReport,
  HauntPackage,
} from "./model/types.js";
export { loadHauntPackage } from "./scan/load-package.js";
