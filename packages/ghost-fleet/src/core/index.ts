/**
 * Public library surface for the `ghost-fleet` package.
 *
 * Mirrors the other ghost-* packages: a single barrel that consumers
 * import from `ghost-fleet` (no deep imports required).
 */

export {
  computeGroupings,
  computePairwiseDistances,
  computeTracks,
} from "./compute.js";
export { loadMembers, summarizeMember } from "./members.js";
export type {
  FleetDistance,
  FleetFrontmatter,
  FleetGroupings,
  FleetMemberEntry,
  FleetTrackEdge,
  RequiredBodySection,
} from "./schema.js";
export {
  FLEET_FILENAME,
  FLEET_JSON_FILENAME,
  FLEET_MEMBERS_DIRNAME,
  FLEET_REPORTS_DIRNAME,
  FleetFrontmatterSchema,
  REQUIRED_BODY_SECTIONS,
} from "./schema.js";
export type {
  FleetGroupingsComputed,
  FleetMember,
  FleetPairwise,
  FleetTrack,
  FleetView,
  MemberFileStatus,
  MemberSummary,
} from "./types.js";
export type {
  BuildViewOptions,
  BuildViewResult,
  WriteViewOptions,
  WriteViewResult,
} from "./view.js";
export {
  buildFleetView,
  renderFleetJson,
  renderFleetMarkdown,
  writeFleetView,
} from "./view.js";
