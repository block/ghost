import type { ContextEntrypoint, FingerprintGraphNode } from "./entrypoint.js";
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
  intent: SelectedContextNodeSummary[];
  active_obligations: SelectedContextObligation[];
  composition: SelectedContextNodeSummary[];
  inventory: SelectedContextInventoryItem[];
  validation: SelectedContextNodeSummary[];
  guidance: SelectedContextGuidance;
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

export interface SelectedContextNodeSummary {
  ref: string;
  label: string;
  summary: string;
  details: string[];
  source_file: string;
}

export interface SelectedContextInventoryItem
  extends SelectedContextNodeSummary {
  path?: string;
}

export interface SelectedContextObligation {
  ref: string;
  text: string;
  source: string;
}

export interface SelectedContextGuidance {
  preserve: string[];
  inspect: SelectedContextRead[];
  avoid: string[];
  validate: string[];
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
  const intent = entrypoint.selected.intent.map(nodeSummary);
  const composition = entrypoint.selected.composition.map(nodeSummary);
  const inventory = entrypoint.selected.exemplars.map((node) => ({
    ...nodeSummary(node),
    ...(pathForNode(node) ? { path: pathForNode(node) } : {}),
  }));
  const validation = entrypoint.selected.checks.map(nodeSummary);

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
    intent,
    active_obligations: obligationsFromIntent(entrypoint.selected.intent),
    composition,
    inventory,
    validation,
    guidance: {
      preserve: entrypoint.actionContract.preserve,
      inspect: entrypoint.actionContract.inspect,
      avoid: entrypoint.actionContract.avoid,
      validate: entrypoint.actionContract.validate,
    },
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
    formatNodeSection("Intent", context.intent, sectionHeading),
    formatObligations(context, sectionHeading),
    formatNodeSection("Composition", context.composition, sectionHeading),
    formatInventory(context, sectionHeading),
    formatNodeSection("Validation", context.validation, sectionHeading, {
      empty:
        "No selected active checks. Proposed or disabled checks are not blocking validation.",
    }),
    formatGuidance(context, sectionHeading),
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

function nodeSummary(node: FingerprintGraphNode): SelectedContextNodeSummary {
  return {
    ref: node.ref,
    label: node.label,
    summary: node.summary,
    details: node.details,
    source_file: node.sourceFile,
  };
}

function pathForNode(node: FingerprintGraphNode): string | undefined {
  const directPath = node.appliesTo.paths[0];
  if (directPath) return directPath;
  const pathDetail = node.details.find((detail) => detail.startsWith("Path: "));
  return pathDetail?.slice("Path: ".length).trim();
}

function obligationsFromIntent(
  nodes: FingerprintGraphNode[],
): SelectedContextObligation[] {
  const out: SelectedContextObligation[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const text of obligationTexts(node)) {
      const normalized = text.trim();
      if (!normalized || seen.has(`${node.ref}\n${normalized}`)) continue;
      seen.add(`${node.ref}\n${normalized}`);
      out.push({ ref: node.ref, text: normalized, source: node.sourceFile });
    }
  }
  return out.slice(0, 10);
}

function obligationTexts(node: FingerprintGraphNode): string[] {
  const details = node.details.filter(
    (detail) => !/^(Refuses|Counterexample|Avoid):/.test(detail),
  );
  if (node.kind === "situation") return [...details, node.summary];
  if (node.kind === "experience_contract") return [node.summary, ...details];
  if (node.kind === "principle") return [node.summary, ...details];
  return [node.summary, ...details];
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

function formatNodeSection(
  title: string,
  nodes: SelectedContextNodeSummary[],
  heading: string,
  options: { empty?: string } = {},
): string {
  const lines = [`${heading} ${title}`];
  if (nodes.length === 0) {
    lines.push(`- ${options.empty ?? "None selected."}`);
    return lines.join("\n");
  }
  for (const node of nodes) {
    lines.push(`- \`${node.ref}\` — ${node.summary}`);
    for (const detail of node.details.slice(0, 3)) {
      lines.push(`  - ${detail}`);
    }
  }
  return lines.join("\n");
}

function formatObligations(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Active Obligations`];
  if (context.active_obligations.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const obligation of context.active_obligations) {
    lines.push(`- ${obligation.text} (from \`${obligation.ref}\`)`);
  }
  return lines.join("\n");
}

function formatInventory(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Inventory`];
  if (context.inventory.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const item of context.inventory) {
    const path = item.path ? ` — \`${item.path}\`` : "";
    lines.push(`- \`${item.ref}\`${path} — ${item.summary}`);
    for (const detail of item.details
      .filter((entry) => !entry.startsWith("Path: "))
      .slice(0, 2)) {
      lines.push(`  - ${detail}`);
    }
  }
  return lines.join("\n");
}

function formatGuidance(context: SelectedContext, heading: string): string {
  const lines = [`${heading} Guidance`];
  appendStringGroup(lines, "Preserve", context.guidance.preserve);
  appendReadGroup(lines, "Inspect", context.guidance.inspect);
  appendStringGroup(lines, "Avoid", context.guidance.avoid);
  appendStringGroup(lines, "Validate", context.guidance.validate);
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
- Start from posture, then preserve the selected situations, principles, contracts, and obligations.
- Express intent through composition: use selected patterns to shape hierarchy, flow, state, behavior, and content.
- Inspect inventory as evidence and material; do not let available components override intent.
- Treat validation as deterministic enforcement; only active checks can block.
- When gaps are present, label local reasoning as provisional and non-Ghost-backed.`;
}

function appendStringGroup(
  lines: string[],
  title: string,
  values: string[],
): void {
  lines.push(`- ${title}:`);
  if (values.length === 0) {
    lines.push("  - None selected.");
    return;
  }
  for (const value of values) {
    lines.push(`  - ${value}`);
  }
}

function appendReadGroup(
  lines: string[],
  title: string,
  reads: SelectedContextRead[],
): void {
  lines.push(`- ${title}:`);
  if (reads.length === 0) {
    lines.push("  - None selected.");
    return;
  }
  for (const read of reads) {
    lines.push(`  - \`${read.path}\` - ${read.reason}`);
  }
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
