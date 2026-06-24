import { access, readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostContextSection,
  type GhostRelaySourceDeclaration,
  isExtraGhostSection,
  type ResolvedGhostRelayConfig,
} from "./relay-config.js";
import type { SharedGhostCapability } from "./relay-modes.js";

export interface ProjectedContextContribution {
  id: string;
  section: GhostContextSection;
  source: string;
  source_id: string;
  summary: string;
  content?: Record<string, unknown>;
  visibility: "public" | "internal";
  priority: number;
}

export interface ProjectionTraceEntry {
  source: string;
  source_id: string;
  section: GhostContextSection;
  reason: string[];
}

export interface ProjectRelaySourcesOptions {
  requestedCapabilities: string[];
}

export interface ProjectRelaySourcesResult {
  contributions: ProjectedContextContribution[];
  selected: ProjectionTraceEntry[];
  skipped: ProjectionTraceEntry[];
}

const PROJECTABLE_CORE_SECTIONS = new Set(["questions", "sources"]);

export async function projectRelaySources(
  resolved: ResolvedGhostRelayConfig,
  options: ProjectRelaySourcesOptions,
): Promise<ProjectRelaySourcesResult> {
  const selected: ProjectionTraceEntry[] = [];
  const skipped: ProjectionTraceEntry[] = [];
  const contributions: ProjectedContextContribution[] = [];
  const requested = new Set(options.requestedCapabilities);

  for (const source of resolved.config.sources) {
    if (!shouldAttemptProjection(source, resolved.source)) continue;
    const sectionProjectable = isProjectableSection(source.section);
    if (!sectionProjectable) {
      skipped.push({
        source: source.path,
        source_id: source.id,
        section: source.section,
        reason: [
          "canonical section projection is not supported in this MVP; use the built-in Ghost package parser",
        ],
      });
      continue;
    }
    if ((source.visibility ?? "public") !== "public") {
      skipped.push({
        source: source.path,
        source_id: source.id,
        section: source.section,
        reason: ["visibility is internal"],
      });
      continue;
    }
    const sourceCapabilities = capabilitiesForSection(source.section);
    if (!intersects(sourceCapabilities, requested)) {
      skipped.push({
        source: source.path,
        source_id: source.id,
        section: source.section,
        reason: ["not selected for this Relay mode"],
      });
      continue;
    }

    const files = await discoverSourceFiles(resolved, source);
    if (files.length === 0) {
      skipped.push({
        source: source.path,
        source_id: source.id,
        section: source.section,
        reason: ["source file not found"],
      });
      continue;
    }

    for (const file of files) {
      const sourceLabel = normalizeRelative(resolved.root, file);
      const projected = await projectSourceFile(file, sourceLabel, source);
      contributions.push(...projected.contributions);
      if (projected.contributions.length > 0) {
        selected.push({
          source: sourceLabel,
          source_id: source.id,
          section: source.section,
          reason: ["matched declared source"],
        });
      } else {
        skipped.push({
          source: sourceLabel,
          source_id: source.id,
          section: source.section,
          reason: projected.reason,
        });
      }
    }
  }

  return { contributions, selected, skipped };
}

function shouldAttemptProjection(
  source: GhostRelaySourceDeclaration,
  configSource: ResolvedGhostRelayConfig["source"],
): boolean {
  if (source.items || source.summary || source.include) return true;
  if (configSource === "default") return false;
  return isProjectableSection(source.section);
}

function isProjectableSection(section: GhostContextSection): boolean {
  return PROJECTABLE_CORE_SECTIONS.has(section) || isExtraGhostSection(section);
}

async function discoverSourceFiles(
  resolved: ResolvedGhostRelayConfig,
  source: GhostRelaySourceDeclaration,
): Promise<string[]> {
  const sources = new Set<string>();
  const direct = resolveSourcePath(resolved.root, source.path);
  if (await readable(direct)) sources.add(direct);

  return [...sources].sort((a, b) => a.localeCompare(b));
}

async function projectSourceFile(
  path: string,
  source: string,
  declaration: GhostRelaySourceDeclaration,
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

  const rawItems = declaration.items
    ? valueAtPath(data, declaration.items)
    : data;
  if (rawItems === undefined) {
    return {
      contributions: [],
      reason: [`items '${declaration.items}' was not found`],
    };
  }
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  if (items.length === 0) {
    return { contributions: [], reason: ["projection produced no items"] };
  }

  const contributions = items.map((item, index) =>
    contributionFromItem(item, index, source, declaration),
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
  declaration: GhostRelaySourceDeclaration,
): ProjectedContextContribution {
  const id = scalarAtPath(item, "id") ?? `${declaration.id}-${index + 1}`;
  const summary =
    truncate(
      scalarAtPath(item, declaration.summary) ??
        `Relay ${declaration.section} context from ${source}.`,
      declaration.max_chars,
    ) || `Relay ${declaration.section} context from ${source}.`;
  const content = contentFromPaths(item, declaration);
  return {
    id,
    section: declaration.section,
    source,
    source_id: declaration.id,
    summary,
    ...(Object.keys(content).length > 0 ? { content } : {}),
    visibility: declaration.visibility ?? "public",
    priority: declaration.priority ?? 0,
  };
}

function contentFromPaths(
  item: unknown,
  declaration: GhostRelaySourceDeclaration,
): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const path of declaration.include ?? []) {
    const value = valueAtPath(item, path);
    if (value === undefined) continue;
    content[pathKey(path)] = truncateValue(value, declaration.max_chars);
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

function resolveSourcePath(root: string, path: string): string {
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

function capabilitiesForSection(
  section: GhostContextSection,
): SharedGhostCapability[] {
  if (section === "intent") {
    return ["product.posture", "generation.context", "review.grounding"];
  }
  if (section === "inventory") {
    return ["material.evidence", "material.exemplars"];
  }
  if (section === "composition") {
    return ["design.composition", "review.fidelity"];
  }
  if (section === "checks") {
    return ["validation.check", "review.rubric"];
  }
  if (section === "questions") {
    return ["prompt.disambiguation", "human.escalation"];
  }
  if (section === "sources") {
    return ["source.grounding", "material.evidence"];
  }
  return ["generation.context", "review.grounding", "agent.context"];
}
