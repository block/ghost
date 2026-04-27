import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import {
  computeGroupings,
  computePairwiseDistances,
  computeTracks,
} from "./compute.js";
import { loadMembers } from "./members.js";
import {
  FLEET_FILENAME,
  FLEET_JSON_FILENAME,
  FLEET_REPORTS_DIRNAME,
  REQUIRED_BODY_SECTIONS,
} from "./schema.js";
import type { FleetMember, FleetView } from "./types.js";

export interface BuildViewOptions {
  /** Optional override for the fleet id. Defaults to the directory basename. */
  id?: string;
  /**
   * Override the timestamp used for `generated_at`. Defaults to a fresh
   * `new Date()` — exposed so tests get reproducible output without
   * monkey-patching globals.
   */
  now?: Date;
  /** Optional preloaded members (saves a directory walk in tests). */
  members?: FleetMember[];
}

export interface BuildViewResult {
  view: FleetView;
  members: FleetMember[];
}

/**
 * Compose the deterministic FleetView for a given fleet directory.
 *
 * Pure: no filesystem writes. The CLI's `view` verb wraps this with
 * file output. Body narrative is the skill's job — this function builds
 * frontmatter-shaped data only.
 */
export async function buildFleetView(
  dir: string,
  options: BuildViewOptions = {},
): Promise<BuildViewResult> {
  const root = resolve(dir);
  const members = options.members ?? (await loadMembers(root));

  const distances = computePairwiseDistances(members);
  const groupings = computeGroupings(members);
  const tracks = computeTracks(members);

  const generated_at = (options.now ?? new Date()).toISOString().slice(0, 10);
  const id = options.id ?? defaultFleetId(root);

  const memberRows = members
    .filter((m) => m.map)
    .map((member) => {
      const map = member.map;
      if (!map) throw new Error("unreachable: member.map missing after filter");
      const row: FleetView["members"][number] = {
        id: member.id,
        platform: map.platform,
        build_system: map.build_system,
        registry: map.registry ? map.registry.path : null,
      };
      if (member.expressionMtime) {
        row.expression_at = member.expressionMtime.slice(0, 10);
      }
      return row;
    });

  const view: FleetView = {
    schema: "ghost.fleet/v1",
    id,
    generated_at,
    members: memberRows,
    distances,
    tracks,
    groupings,
  };

  return { view, members };
}

function defaultFleetId(root: string): string {
  const base = basename(root);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "");
  return slug.length > 0 ? slug : "fleet";
}

/**
 * Render the view as a `fleet.md` source string — frontmatter plus the
 * body skeleton the skill recipe fills in.
 *
 * Per Invariant 1, the CLI does not author the narrative. The body's
 * three required sections (`## World shape`, `## Cohorts`, `## Tracks`)
 * appear with empty placeholder paragraphs so the skill writer has clear
 * targets and `lint` could later check section presence.
 */
export function renderFleetMarkdown(view: FleetView): string {
  const yaml = stringifyYaml(view);
  const body = REQUIRED_BODY_SECTIONS.map((section) => {
    return [
      `## ${section}`,
      "",
      `<!-- TODO(skill): ${section.toLowerCase()} narrative — fill in the prose layer. -->`,
      "",
    ].join("\n");
  }).join("\n");
  return `---\n${yaml}---\n\n${body}`;
}

/**
 * Render the view as a stable JSON sidecar.
 *
 * Same shape as the frontmatter, sorted-key serialization so diffs are
 * reproducible across runs.
 */
export function renderFleetJson(view: FleetView): string {
  return `${JSON.stringify(view, null, 2)}\n`;
}

export interface WriteViewOptions extends BuildViewOptions {
  /** Reports directory; defaults to `<dir>/reports`. */
  outDir?: string;
}

export interface WriteViewResult {
  view: FleetView;
  members: FleetMember[];
  outDir: string;
  files: string[];
}

/**
 * Build the view and write `fleet.md` + `fleet.json` to `<dir>/reports/`.
 */
export async function writeFleetView(
  dir: string,
  options: WriteViewOptions = {},
): Promise<WriteViewResult> {
  const root = resolve(dir);
  const outDir = resolve(root, options.outDir ?? FLEET_REPORTS_DIRNAME);

  const { view, members } = await buildFleetView(root, options);

  await mkdir(outDir, { recursive: true });

  const mdPath = join(outDir, FLEET_FILENAME);
  const jsonPath = join(outDir, FLEET_JSON_FILENAME);

  await writeFile(mdPath, renderFleetMarkdown(view), "utf-8");
  await writeFile(jsonPath, renderFleetJson(view), "utf-8");

  return {
    view,
    members,
    outDir,
    files: [FLEET_FILENAME, FLEET_JSON_FILENAME],
  };
}
