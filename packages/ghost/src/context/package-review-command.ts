import { isAbsolute, relative } from "node:path";
import type {
  GhostFingerprintExemplar,
  GhostFingerprintExperienceContract,
  GhostFingerprintPattern,
  GhostFingerprintPrinciple,
  GhostFingerprintSituation,
} from "#ghost-core";
import type { PackageContext } from "./package-context.js";

export interface EmitPackageReviewInput {
  context: PackageContext;
}

const REVIEW_FINDING_CATEGORIES = [
  "fix",
  "intentional-divergence",
  "missing-fingerprint",
  "experience-gap",
  "eval-uncertainty",
] as const;

/**
 * Emit a repo-local slash command from split fingerprint intent/inventory/composition.
 *
 * The command stays intentionally light: it tells the host agent which Ghost
 * files and CLI packets to use, then includes a compact fingerprint index.
 * Full canonical truth remains in facet files and deterministic checks.
 */
export function emitPackageReviewCommand(
  input: EmitPackageReviewInput,
): string {
  const { context } = input;
  const product = context.fingerprint.intent.summary.product ?? context.name;
  const heading =
    product.toLowerCase() === "ghost"
      ? "# Ghost review"
      : `# ${product} Ghost review`;
  const parts = [
    packageFrontmatter(product),
    heading,
    packageModeSection(),
    packageWorkflowSection(context),
    packageFindingPolicySection(),
    packageFingerprintIndex(context),
    packageReviewFooter(context),
  ];
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function packageFrontmatter(product: string): string {
  return `---
description: Ghost surface-composition review for ${product} - grounded in fingerprint facets
---`;
}

function packageModeSection(): string {
  return `## Mode

If \`$ARGUMENTS\` is provided, review that file, path, or diff range. If it is empty, inspect the current working-tree or PR diff first, then choose the relevant changed surfaces.`;
}

function packageWorkflowSection(context: PackageContext): string {
  const packageDir = displayPackageDir(context);
  return `## Review Workflow

1. Run \`ghost review --diff <patch>\` for the advisory packet, or \`ghost checks --diff <patch>\` for the routed checks and grounding. If reviewing manually, read \`${packageDir}/intent.yml\`, \`${packageDir}/inventory.yml\`, and \`${packageDir}/composition.yml\`.
2. Start from the touched surfaces' intent and obligations before assessing UI, copy, flow, disclosure, recovery, trust, or interaction behavior.
3. Apply composition guidance before choosing implementation details.
4. Inspect inventory exemplars and building blocks as evidence/material, not as authority over intent.
5. Evaluate the routed \`ghost.check/v1\` markdown checks against the diff; cite the surface they govern.
6. When a surface's grounding is silent, label provisional reasoning or report \`missing-fingerprint\` / \`experience-gap\`.
7. Cite the diff location, the touched surface, grounding refs, and the routed check when a finding blocks.`;
}

function packageFindingPolicySection(): string {
  return `## Finding Policy

Use these categories: ${REVIEW_FINDING_CATEGORIES.map((category) => `\`${category}\``).join(", ")}.

Only findings backed by a routed check should be treated as blocking. Everything else is advisory surface-composition critique.

Review only what fingerprint facets or routed checks make relevant to the product surface.

When fingerprint facets are silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, or token and copy conventions. Ask the human before assessing high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.

If the diff reveals missing fingerprint grounding or facet coverage, report \`missing-fingerprint\` or \`experience-gap\` as a review finding. Do not silently rewrite the Ghost package during review; fingerprint edits are ordinary edits that go through normal Git review.`;
}

function packageFingerprintIndex(context: PackageContext): string {
  const { fingerprint } = context;
  const summary = formatSummary(context);
  const situations = formatSituations(fingerprint.intent.situations);
  const principles = formatPrinciples(fingerprint.intent.principles);
  const contracts = formatExperienceContracts(
    fingerprint.intent.experience_contracts,
  );
  const exemplars = formatExemplars(fingerprint.inventory.exemplars);
  const buildingBlocks = formatBuildingBlocks(context);
  const patterns = formatPatterns(fingerprint.composition.patterns);

  return `## Fingerprint Index

${summary}

${situations}

${principles}

${contracts}

${exemplars}

${buildingBlocks}

${patterns}`;
}

function formatSummary(context: PackageContext): string {
  const { summary } = context.fingerprint.intent;
  const lines = ["### Summary"];
  lines.push(`- Product: ${summary.product ?? context.name}`);
  pushJoined(lines, "Audience", summary.audience);
  pushJoined(lines, "Goals", summary.goals);
  pushJoined(lines, "Anti-goals", summary.anti_goals);
  pushJoined(lines, "Tradeoffs", summary.tradeoffs);
  pushJoined(lines, "Tone", summary.tone);
  return lines.join("\n");
}

function formatSituations(situations: GhostFingerprintSituation[]): string {
  if (situations.length === 0) {
    return "### Situations\n- No situations recorded yet. Treat unclear obligations as `missing-fingerprint`.";
  }
  const lines = ["### Situations"];
  for (const situation of situations.slice(0, 8)) {
    const label = situation.title ?? situation.id;
    const detail =
      situation.product_obligation ??
      situation.user_intent ??
      situation.surface ??
      "select when relevant";
    lines.push(`- \`${situation.id}\` - ${label}: ${detail}`);
  }
  return lines.join("\n");
}

function formatPrinciples(principles: GhostFingerprintPrinciple[]): string {
  if (principles.length === 0) {
    return "### Principles\n- No principles recorded yet.";
  }
  const lines = ["### Principles"];
  for (const principle of principles.slice(0, 10)) {
    lines.push(`- \`${principle.id}\` - ${principle.principle}`);
    for (const guidance of principle.guidance ?? []) {
      lines.push(`  - ${guidance}`);
    }
  }
  return lines.join("\n");
}

function formatExperienceContracts(
  contracts: GhostFingerprintExperienceContract[],
): string {
  if (contracts.length === 0) {
    return "### Experience Contracts\n- No experience contracts recorded yet.";
  }
  const lines = ["### Experience Contracts"];
  for (const contract of contracts.slice(0, 10)) {
    lines.push(`- \`${contract.id}\` - ${contract.contract}`);
    for (const obligation of contract.obligations ?? []) {
      lines.push(`  - ${obligation}`);
    }
  }
  return lines.join("\n");
}

function formatPatterns(patterns: GhostFingerprintPattern[]): string {
  if (patterns.length === 0) {
    return "### Composition Patterns\n- No composition patterns recorded yet.";
  }
  const lines = ["### Composition Patterns"];
  for (const pattern of patterns.slice(0, 12)) {
    lines.push(`- \`${pattern.id}\` (${pattern.kind}) - ${pattern.pattern}`);
    for (const guidance of pattern.guidance ?? []) {
      lines.push(`  - ${guidance}`);
    }
  }
  return lines.join("\n");
}

function formatBuildingBlocks(context: PackageContext): string {
  const { building_blocks: blocks } = context.fingerprint.inventory;
  const lines = ["### Inventory Building Blocks"];
  lines.push(
    "- Use these as replaceable implementation material, not surface-composition authority.",
  );
  pushJoined(lines, "Tokens", blocks.tokens, { code: true });
  pushJoined(lines, "Components", blocks.components, { code: true });
  pushJoined(lines, "Libraries", blocks.libraries, { code: true });
  pushJoined(lines, "Assets", blocks.assets, { code: true });
  pushJoined(lines, "Routes", blocks.routes, { code: true });
  pushJoined(lines, "Files", blocks.files, { code: true });
  pushJoined(lines, "Notes", blocks.notes);
  if (lines.length === 2) {
    lines.push("- No inventory building blocks recorded yet.");
  }
  return lines.join("\n");
}

function formatExemplars(exemplars: GhostFingerprintExemplar[]): string {
  if (exemplars.length === 0) {
    return "### Exemplars\n- No curated exemplars recorded yet.";
  }
  const lines = ["### Exemplars"];
  for (const exemplar of exemplars.slice(0, 12)) {
    const detail = exemplar.title ?? exemplar.note ?? exemplar.surface;
    lines.push(
      `- \`${exemplar.id}\` - \`${exemplar.path}\`${detail ? `: ${detail}` : ""}`,
    );
    if (exemplar.why) lines.push(`  - Why: ${exemplar.why}`);
  }
  if (exemplars.length > 12) {
    lines.push(
      `- ${exemplars.length - 12} more exemplar(s); inspect \`inventory.yml\` before deciding.`,
    );
  }
  return lines.join("\n");
}


function packageReviewFooter(context: PackageContext): string {
  const packageDir = displayPackageDir(context);
  return `---

Generated from \`${packageDir}/\` for ${context.name}. Re-run \`ghost emit review-command\` after updating fingerprint facets or surface checks.`;
}

function displayPackageDir(context: PackageContext): string {
  return displayPath(context.packageDir ?? ".ghost");
}

function displayPath(path: string): string {
  if (!isAbsolute(path)) return path;
  const relativePath = relative(process.cwd(), path);
  if (!relativePath) return ".";
  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("..\\")
  ) {
    return normalizePath(path);
  }
  return normalizePath(relativePath);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function pushJoined(
  lines: string[],
  label: string,
  values: string[] | undefined,
  options: { code?: boolean } = {},
): void {
  if (!values?.length) return;
  const formatted = values.map((value) =>
    options.code ? `\`${value}\`` : value,
  );
  lines.push(`- ${label}: ${formatted.join(", ")}`);
}
