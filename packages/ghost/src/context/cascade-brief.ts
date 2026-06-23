import type { ContextEntrypoint, FingerprintGraphNode } from "./entrypoint.js";
import type { PackageContext } from "./package-context.js";

export interface CascadeBrief {
  title: string;
  target_paths: string[];
  package_chain: CascadePackage[];
  match: {
    status: ContextEntrypoint["match"]["status"];
    matched_scopes: string[];
    matched_surface_types: string[];
    reasons: string[];
  };
  intent_cascade: CascadeNodeSummary[];
  active_obligations: CascadeObligation[];
  composition_guidance: CascadeNodeSummary[];
  inventory_to_inspect: CascadeInventoryItem[];
  validate: CascadeNodeSummary[];
  gaps: CascadeGap[];
}

export interface CascadePackage {
  dir: string;
  label: string;
}

export interface CascadeNodeSummary {
  ref: string;
  label: string;
  summary: string;
  details: string[];
  source_file: string;
}

export interface CascadeInventoryItem extends CascadeNodeSummary {
  path?: string;
}

export interface CascadeObligation {
  ref: string;
  text: string;
  source: string;
}

export interface CascadeGap {
  kind:
    | "no-intent"
    | "no-composition"
    | "no-inventory"
    | "no-validate"
    | "unmatched-target"
    | "low-specificity";
  message: string;
}

export function buildCascadeBrief(
  context: PackageContext,
  entrypoint: ContextEntrypoint,
): CascadeBrief {
  const packageDirs = context.layerDirs?.length
    ? context.layerDirs
    : context.fingerprintDir
      ? [context.fingerprintDir]
      : [];
  const packageChain = packageDirs.map((dir, index) => ({
    dir,
    label: packageLabel(dir, index, packageDirs.length),
  }));
  const intentCascade = entrypoint.selected.intent.map(nodeSummary);
  const compositionGuidance = entrypoint.selected.composition.map(nodeSummary);
  const inventoryToInspect = entrypoint.selected.exemplars.map((node) => ({
    ...nodeSummary(node),
    ...(pathForNode(node) ? { path: pathForNode(node) } : {}),
  }));
  const validate = entrypoint.selected.checks.map(nodeSummary);

  return {
    title: `${entrypoint.name} Relay Brief`,
    target_paths: entrypoint.match.requestedPaths,
    package_chain: packageChain,
    match: {
      status: entrypoint.match.status,
      matched_scopes: entrypoint.match.matchedScopes,
      matched_surface_types: entrypoint.match.matchedSurfaceTypes,
      reasons: entrypoint.match.reasons,
    },
    intent_cascade: intentCascade,
    active_obligations: obligationsFromIntent(entrypoint.selected.intent),
    composition_guidance: compositionGuidance,
    inventory_to_inspect: inventoryToInspect,
    validate,
    gaps: gapsFromEntrypoint(entrypoint),
  };
}

export function formatCascadeBriefMarkdown(brief: CascadeBrief): string {
  const parts = [
    "# Ghost Relay Brief",
    `Product context: **${brief.title.replace(/ Relay Brief$/, "")}**. Use this as a compact, target-specific view of the resolved fingerprint cascade. It does not replace the checked-in \`fingerprint/\` files.`,
    formatPackageChain(brief),
    formatMatch(brief),
    formatNodeSection("Intent Cascade", brief.intent_cascade),
    formatObligations(brief),
    formatNodeSection("Composition Guidance", brief.composition_guidance),
    formatInventory(brief),
    formatNodeSection("Validate", brief.validate, {
      empty:
        "No selected active checks. Proposed or disabled checks are not blocking validation.",
    }),
    formatGaps(brief),
    formatUseThisContext(),
  ];
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function packageLabel(_dir: string, index: number, count: number): string {
  if (count === 1) return "package";
  if (index === 0) return "root";
  if (index === count - 1) return "leaf";
  return `layer ${index + 1}`;
}

function nodeSummary(node: FingerprintGraphNode): CascadeNodeSummary {
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
): CascadeObligation[] {
  const out: CascadeObligation[] = [];
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
  const details = node.details
    .filter((detail) => !/^(Refuses|Counterexample|Avoid):/.test(detail))
    .map((detail) =>
      detail
        .replace(/^Product obligation:\s*/, "")
        .replace(/^User intent:\s*/, "User needs to "),
    );
  if (node.kind === "situation") return [...details, node.summary];
  if (node.kind === "experience_contract") return [node.summary, ...details];
  if (node.kind === "principle") return [node.summary, ...details];
  return [node.summary, ...details];
}

function gapsFromEntrypoint(entrypoint: ContextEntrypoint): CascadeGap[] {
  const gaps: CascadeGap[] = [];
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
        "No intent anchors were selected; use local evidence provisionally before making product-surface-defining decisions.",
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

function formatPackageChain(brief: CascadeBrief): string {
  const lines = ["## Package Chain"];
  if (brief.package_chain.length === 0) {
    lines.push("- No package chain recorded.");
    return lines.join("\n");
  }
  for (const pkg of brief.package_chain) {
    lines.push(`- ${pkg.label}: \`${pkg.dir}\``);
  }
  return lines.join("\n");
}

function formatMatch(brief: CascadeBrief): string {
  const lines = ["## Match"];
  lines.push(
    `- Status: ${brief.match.status === "path-match" ? "path matched" : "global fallback"}`,
  );
  pushJoined(lines, "Requested paths", brief.target_paths, { code: true });
  pushJoined(lines, "Matched scopes", brief.match.matched_scopes, {
    code: true,
  });
  pushJoined(
    lines,
    "Matched surface types",
    brief.match.matched_surface_types,
    { code: true },
  );
  for (const reason of brief.match.reasons) {
    lines.push(`- Why: ${reason}`);
  }
  return lines.join("\n");
}

function formatNodeSection(
  title: string,
  nodes: CascadeNodeSummary[],
  options: { empty?: string } = {},
): string {
  const lines = [`## ${title}`];
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

function formatObligations(brief: CascadeBrief): string {
  const lines = ["## Active Obligations"];
  if (brief.active_obligations.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const obligation of brief.active_obligations) {
    lines.push(`- ${obligation.text} (from \`${obligation.ref}\`)`);
  }
  return lines.join("\n");
}

function formatInventory(brief: CascadeBrief): string {
  const lines = ["## Inventory To Inspect"];
  if (brief.inventory_to_inspect.length === 0) {
    lines.push("- None selected.");
    return lines.join("\n");
  }
  for (const item of brief.inventory_to_inspect) {
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

function formatGaps(brief: CascadeBrief): string {
  const lines = ["## Gaps"];
  if (brief.gaps.length === 0) {
    lines.push("- No immediate gaps detected in selected context.");
    return lines.join("\n");
  }
  for (const gap of brief.gaps) {
    lines.push(`- ${gap.kind}: ${gap.message}`);
  }
  return lines.join("\n");
}

function formatUseThisContext(): string {
  return `## Use This Context
- Start from intent: preserve the selected situations, principles, contracts, and obligations.
- Express intent through composition: use selected patterns to shape hierarchy, flow, state, behavior, and content.
- Inspect inventory as evidence and material; do not let available components override intent.
- Treat validate as deterministic enforcement; only active checks can block.
- When gaps are present, label local reasoning as provisional and non-Ghost-backed.`;
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
