import type {
  ProjectedContextContribution,
  ProjectionTraceEntry,
  ProjectRelaySourcesResult,
} from "./projection.js";
import type {
  GhostContextSection,
  GhostCoreSection,
  ResolvedGhostRelayConfig,
} from "./relay-config.js";
import type { GhostRelayMode } from "./relay-modes.js";
import type {
  SelectedContext,
  SelectedContextGap,
  SelectedContextHit,
  SelectedContextOmission,
  SelectedContextPosture,
  SelectedContextRead,
} from "./selected-context.js";

export const GHOST_RELAY_CONTEXT_SCHEMA = "ghost.relay-context/v1" as const;

export interface GhostRelayContext {
  schema: typeof GHOST_RELAY_CONTEXT_SCHEMA;
  target: {
    mode: GhostRelayMode;
    paths: string[];
  };
  config: {
    id: string;
    profile?: string;
    source: "default" | "file";
    path?: string;
  };
  resolved_from: GhostRelayContextSource[];
  posture: SelectedContextPosture;
  sections: Record<GhostCoreSection, GhostRelayContextItem[]>;
  extras: Record<string, GhostRelayContextItem[]>;
  suggested_reads: SelectedContextRead[];
  skipped: SelectedContextOmission[];
  gaps: SelectedContextGap[];
  trace: {
    selected: GhostRelayContextTraceEntry[];
    skipped: GhostRelayContextTraceEntry[];
    gaps: SelectedContextGap[];
  };
}

export interface GhostRelayContextSource {
  source: string;
  section: GhostContextSection;
  ref?: string;
  source_id?: string;
}

export interface GhostRelayContextItem {
  source: string;
  section: GhostContextSection;
  summary: string;
  ref?: string;
  id?: string;
  source_id?: string;
  path?: string;
  details?: string[];
  content?: Record<string, unknown>;
  why_selected?: SelectedContextHit["why_selected"];
}

export interface GhostRelayContextTraceEntry {
  source: string;
  section: GhostContextSection;
  reason: string[];
  ref?: string;
  source_id?: string;
}

export interface BuildGhostRelayContextOptions {
  mode: GhostRelayMode;
  config: ResolvedGhostRelayConfig;
  projections: ProjectRelaySourcesResult;
}

export function buildGhostRelayContext(
  selectedContext: SelectedContext,
  options: BuildGhostRelayContextOptions,
): GhostRelayContext {
  const sections = emptySections();
  const extras: Record<string, GhostRelayContextItem[]> = {};
  const selectedTrace: GhostRelayContextTraceEntry[] = [];

  for (const hit of selectedContext.context_hits) {
    const item = contextItemFromHit(hit);
    sections[item.section as GhostCoreSection].push(item);
    selectedTrace.push({
      source: hit.source_file,
      section: item.section,
      ref: hit.ref,
      reason: hit.why_selected.map(
        (reason) => `${reason.kind}=${reason.value}`,
      ),
    });
  }

  for (const contribution of options.projections.contributions) {
    const item = contextItemFromContribution(contribution);
    if (isExtraSection(contribution.section)) {
      const key = extraKey(contribution.section);
      extras[key] = [...(extras[key] ?? []), item];
    } else {
      sections[contribution.section as GhostCoreSection].push(item);
    }
  }

  selectedTrace.push(...traceFromProjection(options.projections.selected));

  const skippedTrace: GhostRelayContextTraceEntry[] = [
    ...selectedContext.omissions
      .filter((omission) => omission.omitted > 0)
      .map((omission) => ({
        source: omission.source,
        section: sectionFromOmission(omission),
        reason: [`${omission.omitted} ${omission.label} omitted`],
      })),
    ...traceFromProjection(options.projections.skipped),
  ];

  return {
    schema: GHOST_RELAY_CONTEXT_SCHEMA,
    target: {
      mode: options.mode,
      paths: selectedContext.target_paths,
    },
    config: {
      id: options.config.config.id,
      profile: options.config.config.profile,
      source: options.config.source,
      path: options.config.path,
    },
    resolved_from: resolvedSources(sections, extras),
    posture: selectedContext.posture,
    sections,
    extras,
    suggested_reads: selectedContext.suggested_reads,
    skipped: selectedContext.omissions,
    gaps: selectedContext.gaps,
    trace: {
      selected: selectedTrace,
      skipped: skippedTrace,
      gaps: selectedContext.gaps,
    },
  };
}

function emptySections(): Record<GhostCoreSection, GhostRelayContextItem[]> {
  return {
    intent: [],
    inventory: [],
    composition: [],
    checks: [],
    questions: [],
    sources: [],
  };
}

function contextItemFromHit(hit: SelectedContextHit): GhostRelayContextItem {
  const section = sectionFromHit(hit);
  return {
    source: hit.source_file,
    section,
    ref: hit.ref,
    summary: hit.summary,
    ...(hit.path ? { path: hit.path } : {}),
    details: hit.details,
    why_selected: hit.why_selected,
  };
}

function contextItemFromContribution(
  contribution: ProjectedContextContribution,
): GhostRelayContextItem {
  return {
    source: contribution.source,
    section: contribution.section,
    id: contribution.id,
    source_id: contribution.source_id,
    summary: contribution.summary,
    ...(contribution.content ? { content: contribution.content } : {}),
  };
}

function sectionFromHit(hit: SelectedContextHit): GhostCoreSection {
  if (hit.kind === "composition") return "composition";
  if (hit.kind === "inventory") return "inventory";
  if (hit.kind === "validation") return "checks";
  return "intent";
}

function sectionFromOmission(
  omission: SelectedContextOmission,
): GhostCoreSection {
  if (/composition/i.test(omission.label)) return "composition";
  if (/exemplar|inventory/i.test(omission.label)) return "inventory";
  if (/check/i.test(omission.label)) return "checks";
  return "intent";
}

function traceFromProjection(
  entries: ProjectionTraceEntry[],
): GhostRelayContextTraceEntry[] {
  return entries.map((entry) => ({
    source: entry.source,
    section: entry.section,
    source_id: entry.source_id,
    reason: entry.reason,
  }));
}

function resolvedSources(
  sections: Record<GhostCoreSection, GhostRelayContextItem[]>,
  extras: Record<string, GhostRelayContextItem[]>,
): GhostRelayContextSource[] {
  const out = new Map<string, GhostRelayContextSource>();
  for (const [section, items] of Object.entries(sections) as [
    GhostCoreSection,
    GhostRelayContextItem[],
  ][]) {
    for (const item of items) {
      out.set(sourceKey(item.source, section, item.ref ?? item.id), {
        source: item.source,
        section,
        ...(item.ref ? { ref: item.ref } : {}),
        ...(item.source_id ? { source_id: item.source_id } : {}),
      });
    }
  }
  for (const [key, items] of Object.entries(extras)) {
    const section = `extra:${key}` as const;
    for (const item of items) {
      out.set(sourceKey(item.source, section, item.id), {
        source: item.source,
        section,
        ...(item.source_id ? { source_id: item.source_id } : {}),
      });
    }
  }
  return [...out.values()].sort((a, b) =>
    `${a.source}:${a.section}`.localeCompare(`${b.source}:${b.section}`),
  );
}

function sourceKey(
  source: string,
  section: GhostContextSection,
  ref: string | undefined,
): string {
  return `${source}:${section}:${ref ?? ""}`;
}

function isExtraSection(section: GhostContextSection): boolean {
  return section.startsWith("extra:");
}

function extraKey(section: GhostContextSection): string {
  return section.replace(/^extra:/, "");
}
