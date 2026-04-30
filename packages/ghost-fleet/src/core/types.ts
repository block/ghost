/**
 * Shared types for the ghost-fleet package.
 *
 * Fleet is read-only over a directory of (map.md, expression.md) members.
 * These types describe how members are loaded, what facts the CLI computes
 * over them, and what the deterministic artifacts look like on disk.
 */

import type { Expression, MapFrontmatter } from "@ghost/core";
import type { FleetDistance, FleetTrackEdge } from "./schema.js";

/**
 * Lint status for a single member's expression.md and map.md.
 *
 * Three states keep the surface small:
 *   • "ok"      — the file exists and parses; we don't run the full linter
 *                  here (that's `ghost-expression lint`).
 *   • "missing" — the file is absent from the member directory.
 *   • "error"   — the file is present but fails to load/parse.
 */
export type MemberFileStatus = "ok" | "missing" | "error";

/**
 * One member of the fleet — a subdirectory under `fleet/members/`.
 *
 * The CLI populates this from on-disk reads; nothing is fetched and
 * nothing is recomputed.
 */
export interface FleetMember {
  /** Member identity. Defaults to the directory basename if no map.md. */
  id: string;
  /** Absolute path to the member's directory. */
  path: string;
  /** Parsed map.md frontmatter when present. */
  map?: MapFrontmatter;
  /** Lint/load status of the member's map.md. */
  mapStatus: MemberFileStatus;
  /** Reason when mapStatus is "error". */
  mapError?: string;
  /** Loaded expression with embedding backfilled. */
  expression?: Expression;
  /** Lint/load status of the member's expression.md. */
  expressionStatus: MemberFileStatus;
  /** Reason when expressionStatus is "error". */
  expressionError?: string;
  /** ISO date string of the expression.md mtime when present. */
  expressionMtime?: string;
  /** Parsed `.ghost-sync.json` `tracks.id`/string when present. */
  tracks?: string;
}

/**
 * Compact freshness summary for `ghost fleet members`.
 *
 * Mirrors the per-row JSON the CLI emits with `--json`.
 */
export interface MemberSummary {
  id: string;
  /**
   * Single value or array — mirrors the on-disk `map.platform` shape
   * (Phase 4b made arrays a first-class form for multi-platform repos).
   * `null` when the member has no map.
   */
  platform: string | string[] | null;
  /**
   * Single value or array — mirrors the on-disk `map.build_system` shape
   * (Phase 4b extension for repos that run multiple build systems).
   */
  build_system: string | string[] | null;
  registry: string | null;
  expression_mtime: string | null;
  /** Both files present and parsed. */
  ok: boolean;
  /** Per-file status, surfaced so consumers can render specific cells. */
  mapStatus: MemberFileStatus;
  expressionStatus: MemberFileStatus;
}

/**
 * Group-by axes the CLI computes from each member's map.md frontmatter.
 *
 * Per the plan, fleet exposes five axes:
 *   - platform
 *   - build_system
 *   - registry           ("none" when null)
 *   - composition.rendering
 *   - composition.styling[0]
 */
export interface FleetGroupingsComputed {
  by_platform: Record<string, string[]>;
  by_build_system: Record<string, string[]>;
  by_registry: Record<string, string[]>;
  by_rendering: Record<string, string[]>;
  by_styling: Record<string, string[]>;
}

/**
 * Tracks edge derived from a member's `.ghost-sync.json` `tracks` field.
 *
 * `from` is the member id; `to` is whatever string was recorded under
 * `tracks` (a target string like `github:org/repo`, an id, or a path).
 * Fleet does not interpret the right-hand side — it surfaces the edge as
 * the member declared it. The skill recipe is responsible for deciding
 * whether `to` resolves to another member id or an external reference.
 */
export type FleetTrack = FleetTrackEdge;

/** Pairwise distances between members. Same shape as the schema. */
export type FleetPairwise = FleetDistance;

/**
 * Composite view the CLI emits as `fleet.json` and as the frontmatter of
 * `fleet.md`. Body narrative (clusters, prose) is the skill's job.
 */
export interface FleetView {
  schema: "ghost.fleet/v1";
  id: string;
  generated_at: string;
  members: Array<{
    id: string;
    platform: string | string[];
    build_system?: string | string[];
    registry: string | null;
    expression_at?: string;
  }>;
  distances: FleetPairwise[];
  tracks: FleetTrack[];
  groupings: FleetGroupingsComputed;
}
