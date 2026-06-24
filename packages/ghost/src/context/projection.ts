import { access, readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostFacetDeclaration,
  type GhostSemanticLane,
  isExtensionGhostLane,
  type ResolvedGhostDialect,
} from "./dialect.js";

export interface ProjectedContextContribution {
  id: string;
  lane: GhostSemanticLane;
  source: string;
  facet: string;
  capabilities: string[];
  summary: string;
  content?: Record<string, unknown>;
  visibility: "public" | "internal";
  priority: number;
}

export interface ProjectionTraceEntry {
  source: string;
  facet: string;
  lane: GhostSemanticLane;
  reason: string[];
}

export interface ProjectDialectFacetsOptions {
  requestedCapabilities: string[];
}

export interface ProjectDialectFacetsResult {
  contributions: ProjectedContextContribution[];
  selected: ProjectionTraceEntry[];
  omitted: ProjectionTraceEntry[];
}

const PROJECTABLE_CORE_LANES = new Set(["questions", "provenance"]);

export async function projectDialectFacets(
  resolved: ResolvedGhostDialect,
  options: ProjectDialectFacetsOptions,
): Promise<ProjectDialectFacetsResult> {
  const selected: ProjectionTraceEntry[] = [];
  const omitted: ProjectionTraceEntry[] = [];
  const contributions: ProjectedContextContribution[] = [];
  const requested = new Set(options.requestedCapabilities);

  for (const facet of resolved.dialect.facets) {
    if (!shouldAttemptProjection(facet, resolved.source)) continue;
    const laneProjectable = isProjectableLane(facet.lane);
    if (!laneProjectable) {
      omitted.push({
        source: facet.path,
        facet: facet.id,
        lane: facet.lane,
        reason: [
          "canonical lane projection is not supported in this MVP; use the built-in Ghost package parser",
        ],
      });
      continue;
    }
    if ((facet.visibility ?? "public") !== "public") {
      omitted.push({
        source: facet.path,
        facet: facet.id,
        lane: facet.lane,
        reason: ["visibility is internal"],
      });
      continue;
    }
    if (!intersects(facet.capabilities, requested)) {
      omitted.push({
        source: facet.path,
        facet: facet.id,
        lane: facet.lane,
        reason: ["does not provide requested capabilities"],
      });
      continue;
    }
    if (!facet.projection) {
      omitted.push({
        source: facet.path,
        facet: facet.id,
        lane: facet.lane,
        reason: ["facet has no projection declaration"],
      });
      continue;
    }

    const sources = await discoverFacetSources(resolved, facet);
    if (sources.length === 0) {
      omitted.push({
        source: facet.path,
        facet: facet.id,
        lane: facet.lane,
        reason: ["source file not found"],
      });
      continue;
    }

    for (const source of sources) {
      const sourceLabel = normalizeRelative(resolved.root, source);
      const projected = await projectSourceFile(source, sourceLabel, facet);
      contributions.push(...projected.contributions);
      if (projected.contributions.length > 0) {
        selected.push({
          source: sourceLabel,
          facet: facet.id,
          lane: facet.lane,
          reason: [
            `provides ${facet.capabilities.join(", ")}`,
            "matched declared projection",
          ],
        });
      } else {
        omitted.push({
          source: sourceLabel,
          facet: facet.id,
          lane: facet.lane,
          reason: projected.reason,
        });
      }
    }
  }

  return { contributions, selected, omitted };
}

function shouldAttemptProjection(
  facet: GhostFacetDeclaration,
  source: ResolvedGhostDialect["source"],
): boolean {
  if (facet.projection) return true;
  if (source === "default") return false;
  return isProjectableLane(facet.lane);
}

function isProjectableLane(lane: GhostSemanticLane): boolean {
  return PROJECTABLE_CORE_LANES.has(lane) || isExtensionGhostLane(lane);
}

async function discoverFacetSources(
  resolved: ResolvedGhostDialect,
  facet: GhostFacetDeclaration,
): Promise<string[]> {
  const sources = new Set<string>();
  const direct = resolveFacetPath(resolved.root, facet.path);
  if (await readable(direct)) sources.add(direct);

  return [...sources].sort((a, b) => a.localeCompare(b));
}

async function projectSourceFile(
  path: string,
  source: string,
  facet: GhostFacetDeclaration,
): Promise<{
  contributions: ProjectedContextContribution[];
  reason: string[];
}> {
  let data: unknown;
  try {
    data = await parseDataFile(path);
  } catch (err) {
    return {
      contributions: [],
      reason: [
        `source file could not be parsed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    };
  }

  const projection = facet.projection;
  if (!projection) {
    return {
      contributions: [],
      reason: ["facet has no projection declaration"],
    };
  }
  const rawItems = projection.items_path
    ? valueAtPath(data, projection.items_path)
    : data;
  if (rawItems === undefined) {
    return {
      contributions: [],
      reason: [
        `projection items_path '${projection.items_path}' was not found`,
      ],
    };
  }
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  if (items.length === 0) {
    return { contributions: [], reason: ["projection produced no items"] };
  }

  const contributions = items.map((item, index) =>
    contributionFromItem(item, index, source, facet),
  );
  return { contributions, reason: [] };
}

async function parseDataFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf-8");
  if (extname(path) === ".json") return JSON.parse(raw);
  return parseYaml(raw);
}

function contributionFromItem(
  item: unknown,
  index: number,
  source: string,
  facet: GhostFacetDeclaration,
): ProjectedContextContribution {
  const projection = facet.projection;
  const id =
    scalarAtPath(item, projection?.id_path) ?? `${facet.id}-${index + 1}`;
  const summary =
    truncate(
      scalarAtPath(item, projection?.summary_path) ??
        `Projected ${facet.lane} context from ${source}.`,
      projection?.max_chars,
    ) || `Projected ${facet.lane} context from ${source}.`;
  const content = contentFromPaths(item, projection);
  return {
    id,
    lane: facet.lane,
    source,
    facet: facet.id,
    capabilities: [...facet.capabilities],
    summary,
    ...(Object.keys(content).length > 0 ? { content } : {}),
    visibility: facet.visibility ?? "public",
    priority: facet.priority ?? 0,
  };
}

function contentFromPaths(
  item: unknown,
  projection: GhostFacetDeclaration["projection"],
): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const path of projection?.content_paths ?? []) {
    const value = valueAtPath(item, path);
    if (value === undefined) continue;
    content[pathKey(path)] = truncateValue(value, projection?.max_chars);
  }
  return content;
}

function valueAtPath(value: unknown, path: string | undefined): unknown {
  if (!path) return value;
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);
}

function scalarAtPath(
  value: unknown,
  path: string | undefined,
): string | undefined {
  const raw = valueAtPath(value, path);
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return undefined;
}

function truncateValue(value: unknown, maxChars: number | undefined): unknown {
  if (!maxChars) return value;
  if (typeof value === "string") return truncate(value, maxChars);
  const serialized = JSON.stringify(value);
  if (serialized.length <= maxChars) return value;
  return `${serialized.slice(0, maxChars)}... [truncated]`;
}

function truncate(value: string, maxChars: number | undefined): string {
  if (!maxChars || value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}... [truncated]`;
}

function pathKey(path: string): string {
  return path.split(".").at(-1) ?? path;
}

function resolveFacetPath(root: string, path: string): string {
  return isAbsolute(path) ? path : resolve(root, path);
}

async function readable(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function intersects(a: string[], b: Set<string>): boolean {
  return a.some((value) => b.has(value));
}

function normalizeRelative(root: string, path: string): string {
  const rel = relative(root, path).replaceAll(sep, "/");
  return rel || ".";
}
