import type {
  GhostCheck,
  GhostFingerprintExperienceContract,
  GhostFingerprintPattern,
  GhostFingerprintPrinciple,
  GhostFingerprintSituation,
} from "#ghost-core";
import type { PackageMemory } from "./package-memory.js";

export interface EmitPackageReviewInput {
  memory: PackageMemory;
}

const REVIEW_FINDING_CATEGORIES = [
  "fix",
  "intentional-divergence",
  "missing-memory",
  "experience-gap",
  "eval-uncertainty",
] as const;

/**
 * Emit a repo-local slash command from fingerprint.yml memory.
 *
 * The command stays intentionally light: it tells the host agent which Ghost
 * files and CLI packets to use, then includes a compact memory index.
 * Full canonical truth remains in fingerprint.yml and checks.yml.
 */
export function emitPackageReviewCommand(
  input: EmitPackageReviewInput,
): string {
  const { memory } = input;
  const product = memory.fingerprint.summary.product ?? memory.name;
  const heading =
    product.toLowerCase() === "ghost"
      ? "# Ghost review"
      : `# ${product} Ghost review`;
  const activeChecks =
    memory.checks?.checks.filter((check) => check.status === "active") ?? [];
  const parts = [
    packageFrontmatter(product),
    heading,
    packageModeSection(),
    packageWorkflowSection(memory),
    packageFindingPolicySection(),
    packageMemoryIndex(memory),
    packageChecksSection(activeChecks),
    packageReviewFooter(memory),
  ];
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function packageFrontmatter(product: string): string {
  return `---
description: Ghost product-experience review for ${product} - grounded in fingerprint.yml memory
---`;
}

function packageModeSection(): string {
  return `## Mode

If \`$ARGUMENTS\` is provided, review that file, path, or diff range. If it is empty, inspect the current working-tree or PR diff first, then choose the relevant changed surfaces.`;
}

function packageWorkflowSection(memory: PackageMemory): string {
  const memoryDir = memory.memoryDir ?? ".ghost";
  const memoryDirFlag = stackMemoryDirFlag(memory);
  return `## Review Workflow

1. Read \`${memoryDir}/fingerprint.yml\` as the canonical product-experience memory.
2. Select the relevant situation before judging UI, copy, flow, disclosure, recovery, trust, or interaction behavior. Keep findings grounded in resolved Ghost memory or active checks; do not expand the review into unrelated audit categories.
3. Apply principles, experience contracts, and patterns before choosing implementation details.
4. Use implementation vocabulary only as replaceable material that may help satisfy the selected product memory.
5. Run \`ghost check${memoryDirFlag}\` when a diff is available. Active checks are deterministic and can block.
6. Run \`ghost review --include-memory${memoryDirFlag}\` for the advisory packet when you need full diff context and memory excerpts.
7. Cite the diff location, fingerprint.yml memory, and any active check for every finding.`;
}

function packageFindingPolicySection(): string {
  return `## Finding Policy

Use these categories: ${REVIEW_FINDING_CATEGORIES.map((category) => `\`${category}\``).join(", ")}.

Only findings backed by an active check should be treated as blocking. Everything else is advisory product-experience critique.

Review only what Ghost memory or active checks make relevant to the product experience.

When fingerprint memory is silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, token or copy conventions, accepted decisions, or human intent. Ask the human before judging high-risk, irreversible, privacy/security/legal, or product-identity-defining choices.

If the diff reveals missing or contradictory memory, report \`missing-memory\` or \`experience-gap\` as a review finding. Do not silently rewrite memory during review; memory changes are ordinary edits that go through normal Git review.`;
}

function packageMemoryIndex(memory: PackageMemory): string {
  const { fingerprint } = memory;
  const summary = formatSummary(memory);
  const situations = formatSituations(fingerprint.situations);
  const principles = formatPrinciples(fingerprint.principles);
  const contracts = formatExperienceContracts(fingerprint.experience_contracts);
  const patterns = formatPatterns(fingerprint.patterns);
  const implementationVocabulary = formatImplementationVocabulary(memory);

  return `## Fingerprint Memory Index

${summary}

${situations}

${principles}

${contracts}

${patterns}

${implementationVocabulary}`;
}

function formatSummary(memory: PackageMemory): string {
  const { summary, topology } = memory.fingerprint;
  const lines = ["### Summary"];
  lines.push(`- Product: ${summary.product ?? memory.name}`);
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
    return "### Situations\n- No situations recorded yet. Treat unclear obligations as `missing-memory`.";
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
    return "### Patterns\n- No patterns recorded yet.";
  }
  const lines = ["### Patterns"];
  for (const pattern of patterns.slice(0, 12)) {
    lines.push(`- \`${pattern.id}\` (${pattern.kind}) - ${pattern.pattern}`);
    for (const guidance of pattern.guidance ?? []) {
      lines.push(`  - ${guidance}`);
    }
  }
  return lines.join("\n");
}

function formatImplementationVocabulary(memory: PackageMemory): string {
  const { implementation_vocabulary: vocabulary } = memory.fingerprint;
  const lines = ["### Implementation Vocabulary"];
  lines.push(
    "- Use this as replaceable implementation material, not product-experience authority.",
  );
  pushJoined(lines, "Tokens", vocabulary.tokens, { code: true });
  pushJoined(lines, "Components", vocabulary.components, { code: true });
  pushJoined(lines, "Libraries", vocabulary.libraries, { code: true });
  pushJoined(lines, "Assets", vocabulary.assets, { code: true });
  pushJoined(lines, "Notes", vocabulary.notes);
  if (lines.length === 2) {
    lines.push("- No implementation vocabulary recorded yet.");
  }
  return lines.join("\n");
}

function packageChecksSection(activeChecks: GhostCheck[]): string {
  if (activeChecks.length === 0) {
    return `## Active Checks

No active checks are recorded. Review remains advisory unless \`checks.yml\` adds deterministic active checks.`;
  }
  const lines = ["## Active Checks", ""];
  for (const check of activeChecks.slice(0, 12)) {
    const derives = check.derives_from ? ` from \`${check.derives_from}\`` : "";
    lines.push(
      `- \`${check.id}\` (${check.severity})${derives}: ${check.title}`,
    );
    if (check.repair) lines.push(`  - Repair: ${check.repair}`);
  }
  if (activeChecks.length > 12) {
    lines.push(
      `- ${activeChecks.length - 12} more active check(s); read \`checks.yml\` before deciding whether a finding blocks.`,
    );
  }
  return lines.join("\n");
}

function packageReviewFooter(memory: PackageMemory): string {
  const memoryDir = memory.memoryDir ?? ".ghost";
  return `---

Generated from \`${memoryDir}/fingerprint.yml\` for ${memory.name}. Re-run \`ghost emit review-command${stackMemoryDirFlag(memory)}\` after updating fingerprint.yml, checks.yml, decisions, or intent.`;
}

function stackMemoryDirFlag(memory: PackageMemory): string {
  return memory.memoryDir && memory.memoryDir !== ".ghost"
    ? ` --memory-dir ${memory.memoryDir}`
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
