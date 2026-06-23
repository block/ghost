import type {
  GhostCheck,
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
 * Full canonical truth remains in fingerprint/ facet files and deterministic checks.
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
  const activeChecks =
    context.checks?.checks.filter((check) => check.status === "active") ?? [];
  const parts = [
    packageFrontmatter(product),
    heading,
    packageModeSection(),
    packageWorkflowSection(context),
    packageFindingPolicySection(),
    packageFingerprintIndex(context),
    packageChecksSection(activeChecks),
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
  const fingerprintDir = context.fingerprintDir ?? ".ghost";
  const memoryDirFlag = stackFingerprintDirFlag(context);
  return `## Review Workflow

1. Read \`${fingerprintDir}/fingerprint/intent.yml\`, \`${fingerprintDir}/fingerprint/inventory.yml\`, and \`${fingerprintDir}/fingerprint/composition.yml\` as canonical generation facets.
2. Select the relevant situation before assessing UI, copy, flow, disclosure, recovery, trust, or interaction behavior. Keep findings grounded in the resolved fingerprint stack or active checks; do not expand the review into unrelated audit categories.
3. Apply intent principles, experience contracts, and composition patterns before choosing implementation details.
4. Inspect relevant inventory exemplars as concrete anchors for what good looks like.
5. Use inventory building blocks only as replaceable material that may help satisfy the selected intent and composition.
6. Run \`ghost check${memoryDirFlag}\` when a diff is available. Active checks are deterministic and can block.
7. Run \`ghost review${memoryDirFlag}\` for the advisory packet when you need full diff context and fingerprint excerpts.
8. Cite the diff location, fingerprint facet refs, relevant exemplars when useful, and any active check when a finding blocks.`;
}

function packageFindingPolicySection(): string {
  return `## Finding Policy

Use these categories: ${REVIEW_FINDING_CATEGORIES.map((category) => `\`${category}\``).join(", ")}.

Only findings backed by an active check should be treated as blocking. Everything else is advisory surface-composition critique.

Review only what fingerprint facets or active checks make relevant to the product surface.

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
  const { topology } = context.fingerprint.inventory;
  const lines = ["### Summary"];
  lines.push(`- Product: ${summary.product ?? context.name}`);
  pushJoined(lines, "Audience", summary.audience);
  pushJoined(lines, "Goals", summary.goals);
  pushJoined(lines, "Anti-goals", summary.anti_goals);
  pushJoined(lines, "Tradeoffs", summary.tradeoffs);
  pushJoined(lines, "Tone", summary.tone);
  if (topology.scopes?.length) {
    lines.push(
      `- Scopes: ${topology.scopes
        .map((scope) => `\`${scope.id}\``)
        .join(", ")}`,
    );
  }
  if (topology.surface_types?.length) {
    lines.push(
      `- Surface types: ${topology.surface_types
        .map((surface) => `\`${surface}\``)
        .join(", ")}`,
    );
  }
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
      situation.surface_type ??
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
    const detail = exemplar.title ?? exemplar.note ?? exemplar.surface_type;
    lines.push(
      `- \`${exemplar.id}\` - \`${exemplar.path}\`${detail ? `: ${detail}` : ""}`,
    );
    if (exemplar.why) lines.push(`  - Why: ${exemplar.why}`);
  }
  if (exemplars.length > 12) {
    lines.push(
      `- ${exemplars.length - 12} more exemplar(s); inspect \`fingerprint/inventory.yml\` before deciding.`,
    );
  }
  return lines.join("\n");
}

function packageChecksSection(activeChecks: GhostCheck[]): string {
  if (activeChecks.length === 0) {
    return `## Active Checks

No active checks are recorded. Review remains advisory unless \`fingerprint/validate.yml\` adds deterministic active checks.`;
  }
  const lines = ["## Active Checks", ""];
  for (const check of activeChecks.slice(0, 12)) {
    const refs = [
      ...(check.derivation?.intent ?? []),
      ...(check.derivation?.composition ?? []),
      ...(check.derivation?.inventory ?? []),
    ];
    const derives = refs.length
      ? ` from ${refs.map((ref) => `\`${ref}\``).join(", ")}`
      : "";
    lines.push(
      `- \`${check.id}\` (${check.severity})${derives}: ${check.title}`,
    );
    if (check.repair) lines.push(`  - Repair: ${check.repair}`);
  }
  if (activeChecks.length > 12) {
    lines.push(
      `- ${activeChecks.length - 12} more active check(s); read \`fingerprint/validate.yml\` before deciding whether a finding blocks.`,
    );
  }
  return lines.join("\n");
}

function packageReviewFooter(context: PackageContext): string {
  const fingerprintDir = context.fingerprintDir ?? ".ghost";
  return `---

Generated from \`${fingerprintDir}/fingerprint/\` for ${context.name}. Re-run \`ghost emit review-command${stackFingerprintDirFlag(context)}\` after updating fingerprint facets or deterministic checks.`;
}

function stackFingerprintDirFlag(context: PackageContext): string {
  return context.fingerprintDir && context.fingerprintDir !== ".ghost"
    ? ` --memory-dir ${context.fingerprintDir}`
    : "";
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
