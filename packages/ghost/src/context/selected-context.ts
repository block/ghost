import type {
  ContextEntrypoint,
  FingerprintGraphNode,
  SelectionReason,
} from "./entrypoint.js";
import type { PackageContext } from "./package-context.js";

export interface SelectedContext {
  title: string;
  target_paths: string[];
  stack: SelectedContextPackage[];
  match: {
    status: ContextEntrypoint["match"]["status"];
    matched_scopes: string[];
    matched_surface_types: string[];
    reasons: string[];
  };
  posture: SelectedContextPosture;
  context_hits: SelectedContextHit[];
  suggested_reads: SelectedContextRead[];
  omissions: SelectedContextOmission[];
  gaps: SelectedContextGap[];
}

export interface SelectedContextPackage {
  dir: string;
  label: string;
}

export interface SelectedContextPosture {
  product: string;
  audience: string[];
  goals: string[];
  anti_goals: string[];
  tradeoffs: string[];
  tone: string[];
}

export interface SelectedContextHit {
  ref: string;
  kind: "intent" | "composition" | "inventory" | "validation";
  summary: string;
  source_file: string;
  details: string[];
  path?: string;
  why_selected: SelectionReason[];
}

export interface SelectedContextRead {
  path: string;
  reason: string;
}

export interface SelectedContextOmission {
  label: string;
  omitted: number;
  source: string;
}

export interface SelectedContextGap {
  kind:
    | "no-intent"
    | "no-composition"
    | "no-inventory"
    | "no-validate"
    | "unmatched-target"
    | "low-specificity";
  message: string;
}

export function buildSelectedContext(
  context: PackageContext,
  entrypoint: ContextEntrypoint,
): SelectedContext {
  const packageDirs = context.stackDirs?.length
    ? context.stackDirs
    : context.fingerprintDir
      ? [context.fingerprintDir]
      : [];
  const stack = packageDirs.map((dir, index) => ({
    dir,
    label: packageLabel(dir, index, packageDirs.length),
  }));
  const contextHits = [
    ...entrypoint.selected.intent,
    ...entrypoint.selected.composition,
    ...entrypoint.selected.exemplars,
    ...entrypoint.selected.checks,
  ].map((node) => contextHit(node, entrypoint));

  return {
    title: `${entrypoint.name} Relay Brief`,
    target_paths: entrypoint.match.requestedPaths,
    stack,
    match: {
      status: entrypoint.match.status,
      matched_scopes: entrypoint.match.matchedScopes,
      matched_surface_types: entrypoint.match.matchedSurfaceTypes,
      reasons: entrypoint.match.reasons,
    },
    posture: postureFromEntrypoint(entrypoint),
    context_hits: contextHits,
    suggested_reads: entrypoint.suggestedReads,
    omissions: entrypoint.omissions,
    gaps: gapsFromEntrypoint(entrypoint),
  };
}

export function formatSelectedContextMarkdown(
  context: SelectedContext,
  options: { heading?: string; includeIntro?: boolean } = {},
): string {
  const heading = options.heading ?? "# Ghost Relay Brief";
  const sectionHeading = childHeading(heading);
  const parts = [heading];
  if (options.includeIntro ?? true) {
    parts.push(
      `Product context: **${context.title.replace(/ Relay Brief$/, "")}**. Use this as compact, target-specific selected context from the resolved fingerprint stack. It does not replace the checked-in \`fingerprint/\` files.`,
    );
  }
  parts.push(
    formatStack(context, sectionHeading),
    formatMatch(context, sectionHeading),
    formatPosture(context, sectionHeading),
    formatContextHits(context, sectionHeading),
    formatSuggestedReads(context, sectionHeading),
    formatOmissions(context, sectionHeading),
    formatGaps(context, sectionHeading),
    formatUseThisContext(sectionHeading),
  );
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function childHeading(heading: string): string {
  const hashes = heading.match(/^#+/)?.[0] ?? "#";
  return `${hashes}#`;
}

function postureFromEntrypoint(
  entrypoint: ContextEntrypoint,
): SelectedContextPosture {
  return {
    product: entrypoint.identity.product,
    audience: entrypoint.identity.audience,
    goals: entrypoint.identity.goals,
    anti_goals: entrypoint.identity.antiGoals,
    tradeoffs: entrypoint.identity.tradeoffs,
    tone: entrypoint.identity.tone,
  };
}

function packageLabel(_dir: string, index: number, count: number): string {
  if (count === 1) return "package";
  if (index === 0) return "root";
  if (index === count - 1) return "leaf";
  return `package ${index + 1}`;
}

function pathForNode(node: FingerprintGraphNode): string | undefined {
  const directPath = node.appliesTo.paths[0];
  if (directPath) return directPath;
  const pathDetail = node.details.find((detail) => detail.startsWith("Path: "));
  return pathDetail?.slice("Path: ".length).trim();
}

function contextHit(
  node: FingerprintGraphNode,
  entrypoint: ContextEntrypoint,
): SelectedContextHit {
  const hit: SelectedContextHit = {
    ref: node.ref,
    kind: contextHitKind(node),
    summary: node.summary,
    source_file: node.sourceFile,
    details: node.details,
    why_selected: entrypoint.selectionReasons[node.ref] ?? [],
  };
  const path = pathForNode(node);
  if (path) hit.path = path;
  return hit;
}

function contextHitKind(
  node: FingerprintGraphNode,
): SelectedContextHit["kind"] {
  if (node.kind === "pattern") return "composition";
  if (node.kind === "exemplar") return "inventory";
  if (node.kind === "check") return "validation";
  return "intent";
}

function gapsFromEntrypoint(
  entrypoint: ContextEntrypoint,
): SelectedContextGap[] {
  const gaps: SelectedContextGap[] = [];
  if (entrypoint.match.status === "global-fallback") {
    gaps.push({
      kind: "low-specificity",
      message:
        "No path-specific fingerprint scope matched; treat this brief as broad context and inspect full fingerprint files if the task is narrow.",
    });
  }
  if (entrypoint.match.requestedPaths.length === 0) {
    gaps.push({
      kind: "unmatched-target",
      message:
        "No target path was supplied; Relay selected a compact global context.",
    });
  }
  if (entrypoint.selected.intent.length === 0) {
    gaps.push({
      kind: "no-intent",
      message:
        "No ref-backed intent anchors were selected; use posture as broad context and label product-surface-defining reasoning provisional.",
    });
  }
  if (entrypoint.selected.composition.length === 0) {
    gaps.push({
      kind: "no-composition",
      message:
        "No composition patterns were selected; inspect fingerprint/composition.yml or nearby product surfaces if structure matters.",
    });
  }
  if (entrypoint.selected.exemplars.length === 0) {
    gaps.push({
      kind: "no-inventory",
      message:
        "No inventory exemplars were selected; inspect local surfaces or inventory building blocks as provisional evidence.",
    });
  }
  if (entrypoint.selected.checks.length === 0) {
    gaps.push({
      kind: "no-validate",
      message: "No active validation checks were selected for this target.",
    });
  }
  return gaps;
}

function formatStack(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Stack`];
  if (context.stack.length === 0) {
    lines.push("- No stack recorded.");
    return lines.join("\n");
  }
  for (const pkg of context.stack) {
    lines.push(`- ${pkg.label}: \`${pkg.dir}\``);
  }
  return lines.join("\n");
}

function formatMatch(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Match`];
  lines.push(
    `- Status: ${context.match.status === "path-match" ? "path matched" : "global fallback"}`,
  );
  pushJoined(lines, "Requested paths", context.target_paths, { code: true });
  pushJoined(lines, "Matched scopes", context.match.matched_scopes, {
    code: true,
  });
  pushJoined(
    lines,
    "Matched surface types",
    context.match.matched_surface_types,
    { code: true },
  );
  for (const reason of context.match.reasons) {
    lines.push(`- Why: ${reason}`);
  }
  return lines.join("\n");
}

function formatPosture(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Posture`];
  if (context.posture.product)
    lines.push(`- Product: ${context.posture.product}`);
  pushPostureValues(lines, "Audience", context.posture.audience);
  pushPostureValues(lines, "Goals", context.posture.goals);
  pushPostureValues(lines, "Anti-goals", context.posture.anti_goals);
  pushPostureValues(lines, "Tradeoffs", context.posture.tradeoffs);
  pushPostureValues(lines, "Tone", context.posture.tone);
  if (lines.length === 1) lines.push("- No posture summary recorded.");
  return lines.join("\n");
}

function formatContextHits(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Context Hits`];
  if (context.context_hits.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const hit of context.context_hits) {
    const path = hit.path ? ` — \`${hit.path}\`` : "";
    lines.push(`- \`${hit.ref}\` (${hit.kind})${path} — ${hit.summary}`);
    for (const reason of hit.why_selected) {
      lines.push(`  - why: ${reason.kind}=${reason.value}`);
    }
    for (const detail of hit.details
      .filter((entry) => !entry.startsWith("Path: "))
      .slice(0, 2)) {
      lines.push(`  - ${detail}`);
    }
  }
  return lines.join("\n");
}

function formatSuggestedReads(
  context: SelectedContext,
  heading: string,
): string {
  const lines = [`${heading} Suggested Reads`];
  if (context.suggested_reads.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const read of context.suggested_reads) {
    lines.push(`- \`${read.path}\` - ${read.reason}`);
  }
  return lines.join("\n");
}

function formatOmissions(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Omissions`];
  for (const omission of context.omissions) {
    if (omission.omitted === 0) {
      lines.push(`- ${omission.label}: none omitted.`);
    } else {
      lines.push(
        `- ${omission.label}: ${omission.omitted} omitted; inspect \`${omission.source}\` if the task widens.`,
      );
    }
  }
  return lines.join("\n");
}

function formatGaps(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Gaps`];
  if (context.gaps.length === 0) {
    lines.push("- No immediate gaps detected in selected context.");
    return lines.join("\n");
  }
  for (const gap of context.gaps) {
    lines.push(`- ${gap.kind}: ${gap.message}`);
  }
  return lines.join("\n");
}

function formatUseThisContext(heading: string): string {
  return `${heading} Use This Context
- Start from posture, then use context hits as the compact routing set for this task.
- Express intent through composition hits: shape hierarchy, flow, state, behavior, and content from the selected evidence.
- Inspect inventory hits as evidence and material; do not let available components override intent.
- Treat validation hits as deterministic enforcement; only active checks can block.
- When gaps are present, label local reasoning as provisional and non-Ghost-backed.`;
}

function pushPostureValues(
  lines: string[],
  label: string,
  values: string[] | undefined,
): void {
  if (!values?.length) return;
  if (values.length === 1) {
    lines.push(`- ${label}: ${values[0]}`);
    return;
  }
  lines.push(`- ${label}:`);
  for (const value of values) {
    lines.push(`  - ${value}`);
  }
}

function pushJoined(
  lines: string[],
  label: string,
  values: string[] | undefined,
  options: { code?: boolean } = {},
): void {
  if (!values?.length) return;
  const formatted = values
    .map((value) => (options.code ? `\`${value}\`` : value))
    .join(", ");
  lines.push(`- ${label}: ${formatted}`);
}
