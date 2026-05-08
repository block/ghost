import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import {
  type GhostCheck,
  type GhostChecksDocument,
  GhostChecksSchema,
  type MapFrontmatter,
  MapFrontmatterSchema,
  routeGhostPathToScopes,
  type Survey,
  SurveySchema,
  type UiSurfaceRow,
} from "@ghost/core";
import { parse as parseYaml } from "yaml";
import { resolveFingerprintPackage } from "./fingerprint-package.js";

export interface CheckProposalOptions {
  cwd?: string;
  packageDir?: string;
}

export interface CheckProposalAdvisoryPacket {
  instructions: string[];
  profile: string;
  survey_surface_count: number;
  proposal_count: number;
}

export interface CheckProposalReport {
  schema: "ghost.check-proposals/v1";
  package_dir: string;
  checks: GhostChecksDocument;
  advisory_packet: CheckProposalAdvisoryPacket;
}

interface ProposalInputs {
  cwd: string;
  packageDir: string;
  map: MapFrontmatter;
  survey: Survey;
  profile: string;
  existingIds: Set<string>;
}

interface PatternGroup {
  key: string;
  label: string;
  surfaces: UiSurfaceRow[];
  components: string[];
  layoutPattern?: string;
}

interface SourceRef {
  path: string;
  line?: number;
}

const SUPPORT_FLOOR = 2;

export async function proposeGhostChecks(
  options: CheckProposalOptions = {},
): Promise<CheckProposalReport> {
  const inputs = await loadProposalInputs(options);
  const checks = buildProposedChecks(inputs);
  const document: GhostChecksDocument = {
    schema: "ghost.checks/v1",
    id: inputs.map.id,
    checks,
  };

  return {
    schema: "ghost.check-proposals/v1",
    package_dir: inputs.packageDir,
    checks: document,
    advisory_packet: {
      instructions: [
        "Review these generated checks before copying them into checks.yml.",
        "Keep status: proposed while evaluating noise; change to status: active only after human promotion.",
        "Generated checks are useful drafts, not declarations of policy.",
      ],
      profile: inputs.profile,
      survey_surface_count: inputs.survey.ui_surfaces.length,
      proposal_count: checks.length,
    },
  };
}

async function loadProposalInputs(
  options: CheckProposalOptions,
): Promise<ProposalInputs> {
  const cwd = options.cwd ?? process.cwd();
  const paths = resolveFingerprintPackage(options.packageDir, cwd);
  const [mapRaw, surveyRaw, profile, checksRaw] = await Promise.all([
    readFile(paths.map, "utf-8"),
    readFile(paths.survey, "utf-8"),
    readFile(paths.profile, "utf-8"),
    readFile(paths.checks, "utf-8"),
  ]);

  const map = parseMap(mapRaw);
  const surveyInput = JSON.parse(surveyRaw) as unknown;
  const surveyResult = SurveySchema.safeParse(surveyInput);
  if (!surveyResult.success) {
    throw new Error(
      `survey.json failed schema validation: ${surveyResult.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const checksInput = parseYaml(checksRaw);
  const existingIds = new Set<string>();
  const checksResult = GhostChecksSchema.safeParse(checksInput);
  if (checksResult.success) {
    for (const check of checksResult.data.checks) existingIds.add(check.id);
  }

  return {
    cwd,
    packageDir: paths.dir,
    map,
    survey: surveyResult.data,
    profile,
    existingIds,
  };
}

function parseMap(raw: string): MapFrontmatter {
  const block = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) throw new Error("map.md is missing YAML frontmatter");
  const result = MapFrontmatterSchema.safeParse(parseYaml(block));
  if (!result.success) {
    throw new Error(
      `map.md failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function buildProposedChecks(inputs: ProposalInputs): GhostCheck[] {
  const proposals = new Map<string, GhostCheck>();
  const groups = patternGroups(inputs.survey.ui_surfaces);

  for (const group of groups) {
    if (group.surfaces.length < SUPPORT_FLOOR) continue;
    const specific = specificProposal(inputs, group);
    if (specific && !inputs.existingIds.has(specific.id)) {
      proposals.set(specific.id, specific);
      continue;
    }

    const generic = genericProposal(inputs, group);
    if (generic && !inputs.existingIds.has(generic.id)) {
      proposals.set(generic.id, generic);
    }
  }

  return [...proposals.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function patternGroups(surfaces: UiSurfaceRow[]): PatternGroup[] {
  const groups = new Map<string, PatternGroup>();

  for (const surface of surfaces) {
    for (const pattern of surface.signals.layout_patterns ?? []) {
      const key = `layout:${slug(pattern)}`;
      addToGroup(groups, key, pattern, surface, pattern);
    }

    const components = meaningfulComponents(
      surface.signals.dominant_components ?? [],
    );
    if (components.length >= 2) {
      const key = `components:${components.join("+")}`;
      addToGroup(groups, key, components.join(" + "), surface);
    }
  }

  return [...groups.values()];
}

function addToGroup(
  groups: Map<string, PatternGroup>,
  key: string,
  label: string,
  surface: UiSurfaceRow,
  layoutPattern?: string,
): void {
  const existing = groups.get(key) ?? {
    key,
    label,
    surfaces: [],
    components: [],
    layoutPattern,
  };
  existing.surfaces.push(surface);
  existing.components = meaningfulComponents([
    ...existing.components,
    ...(surface.signals.dominant_components ?? []),
  ]);
  existing.layoutPattern = existing.layoutPattern ?? layoutPattern;
  groups.set(key, existing);
}

function specificProposal(
  inputs: ProposalInputs,
  group: PatternGroup,
): GhostCheck | undefined {
  if (isToolFooterGroup(group)) return toolFooterProposal(inputs, group);
  if (isPulseMetricGroup(group)) return pulseMetricProposal(inputs, group);
  return undefined;
}

function toolFooterProposal(
  inputs: ProposalInputs,
  group: PatternGroup,
): GhostCheck {
  const sources = sourceRefs(inputs.cwd, group, [
    "ToolCardFooter",
    "ToolFooterActions",
  ]);
  const replacement =
    "ToolCardFooter + ToolFooterActions + ToolCancelButton + ToolSubmitButton";
  return {
    id: `use-${subjectPrefix(inputs.map.id)}-tool-footer-actions`,
    title: "Use Managerbot tool footer action primitives",
    status: "proposed",
    severity: "serious",
    applies_to: appliesTo(inputs.map, group),
    detector: {
      type: "forbidden-regex",
      pattern: 'className="flex justify-end gap-2"',
      contexts: ["react"],
    },
    evidence: evidence(group, sources, [
      "False-positive risk: medium; flex end-aligned action rows can be legitimate outside approval-card footers.",
    ]),
    repair:
      "Replace hand-rolled approval footer layout with shared Managerbot tool footer primitives.",
    repair_hints: [
      {
        kind: "component-pattern-replacement",
        replacement,
        reason:
          "Found the same approval-card footer pattern in sibling tool surfaces.",
        inferred_from: "sibling-file-pattern",
        source: sources[0],
        sources,
        confidence: "high",
      },
    ],
  };
}

function pulseMetricProposal(
  inputs: ProposalInputs,
  group: PatternGroup,
): GhostCheck {
  const sources = sourceRefs(inputs.cwd, group, [
    "MetricDataCard",
    "ComparisonBadge",
  ]);
  return {
    id: "use-pulse-metric-components",
    title: "Use shared Pulse metric components",
    status: "proposed",
    severity: "serious",
    applies_to: appliesTo(inputs.map, group),
    detector: {
      type: "forbidden-regex",
      pattern: "rounded-2xl border p-6 shadow-sm|text-green-600",
      contexts: ["react"],
    },
    evidence: evidence(group, sources, [
      "False-positive risk: medium; raw card chrome and green trend text can be legitimate outside Pulse metric tiles.",
    ]),
    repair:
      "Replace hand-rolled Pulse metric card and trend styling with shared Pulse metric components.",
    repair_hints: [
      {
        kind: "component-pattern-replacement",
        replacement: "MetricDataCard forceCardChrome + ComparisonBadge",
        reason:
          "Found repeated Pulse metric card and trend semantics in shared components.",
        inferred_from: "sibling-file-pattern",
        source: sources[0],
        sources,
        confidence: "high",
      },
    ],
  };
}

function genericProposal(
  inputs: ProposalInputs,
  group: PatternGroup,
): GhostCheck | undefined {
  const components = group.components.slice(0, 4);
  if (components.length < 2) return undefined;
  const sources = sourceRefs(inputs.cwd, group, components);
  const replacement = components.join(" + ");
  return {
    id: `use-${slug(group.layoutPattern ?? replacement)}-pattern`,
    title: `Use shared ${humanize(group.layoutPattern ?? replacement)} pattern`,
    status: "proposed",
    severity: "serious",
    applies_to: appliesTo(inputs.map, group),
    detector: {
      type: "required-regex",
      pattern: components.map(escapeRegExp).join("|"),
      contexts: ["react"],
    },
    evidence: evidence(group, sources, [
      "False-positive risk: high; this generic proposal requires human review because it only knows the repeated component sequence.",
    ]),
    repair: `Use the shared ${replacement} pattern instead of hand-rolled local structure.`,
    repair_hints: [
      {
        kind: "component-pattern-replacement",
        replacement,
        reason: "Found the same component sequence across sibling surfaces.",
        inferred_from: "sibling-file-pattern",
        source: sources[0],
        sources,
        confidence: "medium",
      },
    ],
  };
}

function evidence(
  group: PatternGroup,
  sources: SourceRef[],
  notes: string[],
): NonNullable<GhostCheck["evidence"]> {
  return {
    support: support(group.surfaces.length),
    observed_count: group.surfaces.length,
    examples: sources.map((source) => ({
      ...source,
      note: `Observed in ${group.label}.`,
    })),
    notes,
  };
}

function appliesTo(
  map: MapFrontmatter,
  group: PatternGroup,
): NonNullable<GhostCheck["applies_to"]> {
  const files = group.surfaces.flatMap((surface) => surface.files);
  const scopes = commonScopes(map, files);
  return {
    ...(scopes.length > 0 ? { scopes } : {}),
    paths: [commonDirectory(files)],
  };
}

function commonScopes(map: MapFrontmatter, files: string[]): string[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const scopes = routeGhostPathToScopes(map, file);
    for (const scope of scopes) {
      counts.set(scope.id, (counts.get(scope.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count === files.length)
    .map(([scope]) => scope)
    .sort();
}

function commonDirectory(files: string[]): string {
  if (files.length === 0) return ".";
  const parts = files.map((file) => dirname(file).split("/"));
  const common: string[] = [];
  for (let index = 0; index < parts[0].length; index++) {
    const part = parts[0][index];
    if (parts.every((candidate) => candidate[index] === part)) {
      common.push(part);
    } else {
      break;
    }
  }
  return common.length > 0 ? common.join("/") : dirname(files[0]);
}

function sourceRefs(
  cwd: string,
  group: PatternGroup,
  needles: string[],
): SourceRef[] {
  const refs: SourceRef[] = [];
  const seen = new Set<string>();
  for (const surface of group.surfaces) {
    for (const file of surface.files) {
      if (seen.has(file)) continue;
      seen.add(file);
      refs.push({
        path: file,
        line: findLine(cwd, file, needles),
      });
      if (refs.length >= 5) return refs;
    }
  }
  return refs.length > 0 ? refs : [{ path: group.surfaces[0]?.locator ?? "." }];
}

function findLine(
  cwd: string,
  file: string,
  needles: string[],
): number | undefined {
  try {
    const absolute = resolve(cwd, file);
    const safeRelative = relative(cwd, absolute);
    if (safeRelative.startsWith("..")) return undefined;
    const content = readFileSyncCompat(absolute);
    const lines = content.split(/\r?\n/);
    const index = lines.findIndex((line) =>
      needles.some((needle) => line.includes(needle)),
    );
    return index >= 0 ? index + 1 : undefined;
  } catch {
    return undefined;
  }
}

function readFileSyncCompat(path: string): string {
  return readFileSync(path, "utf-8");
}

function isToolFooterGroup(group: PatternGroup): boolean {
  const label = group.label.toLowerCase();
  const components = new Set(group.components);
  return (
    /tool.*footer|approval.*footer|footer.*action/.test(label) ||
    (components.has("ToolCardFooter") && components.has("ToolFooterActions"))
  );
}

function isPulseMetricGroup(group: PatternGroup): boolean {
  const label = group.label.toLowerCase();
  const components = new Set(group.components);
  return (
    /pulse.*metric|metric.*card|trend.*delta/.test(label) ||
    components.has("MetricDataCard") ||
    components.has("ComparisonBadge")
  );
}

function support(count: number): number {
  return Math.min(0.99, 0.8 + count * 0.05);
}

function meaningfulComponents(components: string[]): string[] {
  return [...new Set(components)]
    .filter((component) => component && !GENERIC_COMPONENTS.has(component))
    .sort();
}

function subjectPrefix(id: string): string {
  return slug(id.split("-")[0] || id);
}

function humanize(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

const GENERIC_COMPONENTS = new Set([
  "Button",
  "Card",
  "CardContent",
  "div",
  "span",
]);
