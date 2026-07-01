/**
 * haunt — the BYO-design-system adherence and drift layer for Ghost (Problem A).
 *
 * Where Fingerprint (@anarchitecture/ghost) carries the portable, medium-agnostic
 * intent contract, Haunt is the implementation-layer counterpart: it bridges to the
 * design-system code a repo already owns (code as source of truth) and grades
 * *high-altitude* compositional drift.
 *
 * On-disk shape (see notes/haunt-shape.md): a `.haunt/` package of four flat tiers
 * plus exemplars — tenets (principles), inventory (materials + `paths` to code),
 * surfaces (composition; `honors` tenets, `uses` inventory), and checks (assertions
 * that `grounds` up into the prose they enforce). Flat, no inheritance; the edges
 * are the graph.
 *
 * Standalone-first: Haunt does not depend on ghost-core yet. It copies the few
 * primitives it needs locally and proves its shape against its own graph model
 * before we reconcile. See notes/haunt-shape.md → "Standalone-first".
 */

export const HAUNT_VERSION = "0.0.0";

export type { BridgeResolution } from "./bridge/resolve.js";
export { resolveBridge } from "./bridge/resolve.js";
export { buildCli } from "./cli.js";
export { runReview } from "./commands/review.js";
export type { ReviewPacket } from "./commands/review-packet.js";
export {
  buildReviewPacket,
  formatReviewPacket,
} from "./commands/review-packet.js";
export { runSkillInstall } from "./commands/skill.js";
export { runValidate } from "./commands/validate.js";
export { validateHauntGraph } from "./graph/validate.js";
export {
  HAUNT_CHECK_SEVERITIES,
  HAUNT_PACKAGE_SCHEMA,
} from "./model/schema.js";
export type {
  HauntCheck,
  HauntExemplar,
  HauntInventory,
  HauntLintIssue,
  HauntLintReport,
  HauntPackage,
  HauntSurface,
  HauntTenet,
} from "./model/types.js";
export { loadHauntPackage } from "./scan/load-package.js";
