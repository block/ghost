import type { GhostRelayMode } from "./capabilities.js";
import type {
  GhostCoreLane,
  GhostSemanticLane,
  ResolvedGhostDialect,
} from "./dialect.js";
import type {
  ProjectDialectFacetsResult,
  ProjectedContextContribution,
  ProjectionTraceEntry,
} from "./projection.js";
import type {
  SelectedContext,
  SelectedContextGap,
  SelectedContextHit,
  SelectedContextOmission,
  SelectedContextPosture,
  SelectedContextRead,
} from "./selected-context.js";

export const GHOST_CONTEXT_PACKET_SCHEMA = "ghost.context-packet/v1" as const;

export interface GhostContextPacket {
  schema: typeof GHOST_CONTEXT_PACKET_SCHEMA;
  target: {
    mode: GhostRelayMode;
    paths: string[];
    requested_capabilities: string[];
  };
  dialect: {
    id: string;
    profile?: string;
    source: "default" | "file";
    path?: string;
  };
  resolved_from: GhostContextPacketSource[];
  posture: SelectedContextPosture;
  lanes: Record<GhostCoreLane, GhostContextPacketItem[]>;
  extensions: Record<string, GhostContextPacketItem[]>;
  suggested_reads: SelectedContextRead[];
  omissions: SelectedContextOmission[];
  gaps: SelectedContextGap[];
  trace: {
    selected: GhostContextPacketTraceEntry[];
    omitted: GhostContextPacketTraceEntry[];
    gaps: SelectedContextGap[];
  };
}

export interface GhostContextPacketSource {
  source: string;
  lane: GhostSemanticLane;
  ref?: string;
  facet?: string;
}

export interface GhostContextPacketItem {
  source: string;
  lane: GhostSemanticLane;
  summary: string;
  ref?: string;
  id?: string;
  facet?: string;
  path?: string;
  capabilities?: string[];
  details?: string[];
  content?: Record<string, unknown>;
  why_selected?: SelectedContextHit["why_selected"];
}

export interface GhostContextPacketTraceEntry {
  source: string;
  lane: GhostSemanticLane;
  reason: string[];
  ref?: string;
  facet?: string;
}

export interface BuildGhostContextPacketOptions {
  mode: GhostRelayMode;
  requestedCapabilities: string[];
  dialect: ResolvedGhostDialect;
  projections: ProjectDialectFacetsResult;
}

export function buildGhostContextPacket(
  selectedContext: SelectedContext,
  options: BuildGhostContextPacketOptions,
): GhostContextPacket {
  const lanes = emptyLanes();
  const extensions: Record<string, GhostContextPacketItem[]> = {};
  const selectedTrace: GhostContextPacketTraceEntry[] = [];

  for (const hit of selectedContext.context_hits) {
    const item = packetItemFromHit(hit);
    lanes[item.lane as GhostCoreLane].push(item);
    selectedTrace.push({
      source: hit.source_file,
      lane: item.lane,
      ref: hit.ref,
      reason: hit.why_selected.map(
        (reason) => `${reason.kind}=${reason.value}`,
      ),
    });
  }

  for (const contribution of options.projections.contributions) {
    const item = packetItemFromContribution(contribution);
    if (isExtensionLane(contribution.lane)) {
      const key = extensionKey(contribution.lane);
      extensions[key] = [...(extensions[key] ?? []), item];
    } else {
      lanes[contribution.lane as GhostCoreLane].push(item);
    }
  }

  selectedTrace.push(...traceFromProjection(options.projections.selected));

  const omittedTrace: GhostContextPacketTraceEntry[] = [
    ...selectedContext.omissions
      .filter((omission) => omission.omitted > 0)
      .map((omission) => ({
        source: omission.source,
        lane: laneFromOmission(omission),
        reason: [`${omission.omitted} ${omission.label} omitted`],
      })),
    ...traceFromProjection(options.projections.omitted),
  ];

  return {
    schema: GHOST_CONTEXT_PACKET_SCHEMA,
    target: {
      mode: options.mode,
      paths: selectedContext.target_paths,
      requested_capabilities: options.requestedCapabilities,
    },
    dialect: {
      id: options.dialect.dialect.id,
      profile: options.dialect.dialect.profile,
      source: options.dialect.source,
      path: options.dialect.path,
    },
    resolved_from: resolvedSources(lanes, extensions),
    posture: selectedContext.posture,
    lanes,
    extensions,
    suggested_reads: selectedContext.suggested_reads,
    omissions: selectedContext.omissions,
    gaps: selectedContext.gaps,
    trace: {
      selected: selectedTrace,
      omitted: omittedTrace,
      gaps: selectedContext.gaps,
    },
  };
}

function emptyLanes(): Record<GhostCoreLane, GhostContextPacketItem[]> {
  return {
    intent: [],
    inventory: [],
    composition: [],
    checks: [],
    questions: [],
    provenance: [],
  };
}

function packetItemFromHit(hit: SelectedContextHit): GhostContextPacketItem {
  const lane = laneFromHit(hit);
  return {
    source: hit.source_file,
    lane,
    ref: hit.ref,
    summary: hit.summary,
    ...(hit.path ? { path: hit.path } : {}),
    capabilities: capabilitiesForHit(hit),
    details: hit.details,
    why_selected: hit.why_selected,
  };
}

function packetItemFromContribution(
  contribution: ProjectedContextContribution,
): GhostContextPacketItem {
  return {
    source: contribution.source,
    lane: contribution.lane,
    id: contribution.id,
    facet: contribution.facet,
    summary: contribution.summary,
    capabilities: contribution.capabilities,
    ...(contribution.content ? { content: contribution.content } : {}),
  };
}

function laneFromHit(hit: SelectedContextHit): GhostCoreLane {
  if (hit.kind === "composition") return "composition";
  if (hit.kind === "inventory") return "inventory";
  if (hit.kind === "validation") return "checks";
  return "intent";
}

function capabilitiesForHit(hit: SelectedContextHit): string[] {
  if (hit.kind === "composition") return ["design.composition"];
  if (hit.kind === "inventory") return ["material.evidence"];
  if (hit.kind === "validation") return ["validation.check"];
  return ["product.posture"];
}

function laneFromOmission(omission: SelectedContextOmission): GhostCoreLane {
  if (/composition/i.test(omission.label)) return "composition";
  if (/exemplar|inventory/i.test(omission.label)) return "inventory";
  if (/check/i.test(omission.label)) return "checks";
  return "intent";
}

function traceFromProjection(
  entries: ProjectionTraceEntry[],
): GhostContextPacketTraceEntry[] {
  return entries.map((entry) => ({
    source: entry.source,
    lane: entry.lane,
    facet: entry.facet,
    reason: entry.reason,
  }));
}

function resolvedSources(
  lanes: Record<GhostCoreLane, GhostContextPacketItem[]>,
  extensions: Record<string, GhostContextPacketItem[]>,
): GhostContextPacketSource[] {
  const out = new Map<string, GhostContextPacketSource>();
  for (const [lane, items] of Object.entries(lanes) as [
    GhostCoreLane,
    GhostContextPacketItem[],
  ][]) {
    for (const item of items) {
      out.set(sourceKey(item.source, lane, item.ref ?? item.id), {
        source: item.source,
        lane,
        ...(item.ref ? { ref: item.ref } : {}),
        ...(item.facet ? { facet: item.facet } : {}),
      });
    }
  }
  for (const [key, items] of Object.entries(extensions)) {
    const lane = `extension:${key}` as const;
    for (const item of items) {
      out.set(sourceKey(item.source, lane, item.id), {
        source: item.source,
        lane,
        ...(item.facet ? { facet: item.facet } : {}),
      });
    }
  }
  return [...out.values()].sort((a, b) =>
    `${a.source}:${a.lane}`.localeCompare(`${b.source}:${b.lane}`),
  );
}

function sourceKey(
  source: string,
  lane: GhostSemanticLane,
  ref: string | undefined,
): string {
  return `${source}:${lane}:${ref ?? ""}`;
}

function isExtensionLane(lane: GhostSemanticLane): boolean {
  return lane.startsWith("extension:");
}

function extensionKey(lane: GhostSemanticLane): string {
  return lane.replace(/^extension:/, "");
}
