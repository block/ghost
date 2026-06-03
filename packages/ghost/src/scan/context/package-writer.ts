import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";
import { loadPackageMemory, type PackageMemory } from "./package-memory.js";
import type { WriteContextResult } from "./writer.js";

export interface WritePackageContextOptions {
  outDir: string;
  /** Override the skill/package name. Default: fingerprint.yml summary product. */
  name?: string;
  /** Emit only prompt.md. Default: false. */
  promptOnly?: boolean;
  /** Include README.md. Default: false. */
  readme?: boolean;
}

export async function writePackageContextBundle(
  paths: FingerprintPackagePaths,
  options: WritePackageContextOptions,
): Promise<WriteContextResult> {
  const context = await loadPackageMemory(paths, options.name);
  return writePackageContextBundleFromMemory(context, options);
}

export async function writePackageContextBundleFromMemory(
  context: PackageMemory,
  options: WritePackageContextOptions,
): Promise<WriteContextResult> {
  await mkdir(options.outDir, { recursive: true });
  const files: string[] = [];

  const promptPath = join(options.outDir, "prompt.md");
  await writeFile(promptPath, buildPackagePromptMd(context), "utf-8");
  files.push(promptPath);

  if (options.promptOnly) {
    return { outDir: options.outDir, files };
  }

  const skillPath = join(options.outDir, "SKILL.md");
  await writeFile(skillPath, buildPackageSkillMd(context), "utf-8");
  files.push(skillPath);

  await writeContextFile(
    options.outDir,
    files,
    "fingerprint.yml",
    context.fingerprintRaw,
  );
  if (context.checksRaw) {
    await writeContextFile(
      options.outDir,
      files,
      "checks.yml",
      context.checksRaw,
    );
  }
  if (context.intent) {
    await writeContextFile(options.outDir, files, "intent.md", context.intent);
  }
  if (options.readme) {
    await writeContextFile(
      options.outDir,
      files,
      "README.md",
      buildPackageReadmeMd(context),
    );
  }

  return { outDir: options.outDir, files };
}

async function writeContextFile(
  outDir: string,
  files: string[],
  name: string,
  content: string,
): Promise<void> {
  const outPath = join(outDir, name);
  await writeFile(outPath, ensureTrailingNewline(content), "utf-8");
  files.push(outPath);
}

function buildPackageSkillMd(context: PackageMemory): string {
  return `---
name: ${context.name}
description: Use this Ghost product-experience memory to preserve on-brand UI generation and review.
user-invocable: true
---

This skill grounds work in the **${context.name}** Ghost fingerprint.

Read the files in this order:

1. \`prompt.md\` - generation packet: product prose, inventory, exemplars, and active checks.
2. \`fingerprint.yml\` - canonical product prose and exemplar anchors.
3. \`checks.yml\` when present - deterministic gates; only \`active\` checks block.
4. \`intent.md\` when present - supplemental human-authored context.

When generating UI, combine product prose from \`fingerprint.yml\`, optional
inventory facts, and curated exemplars. Use implementation vocabulary and
inventory only as replaceable material that may help satisfy product memory.
When reviewing, use active checks for blocking validation and keep other
findings advisory.

When fingerprint memory is silent, proceed from nearby product surfaces, local
components, token and copy conventions, optional rationale files when present,
and ordinary UX judgment when safe. Label that reasoning as provisional and
non-Ghost-backed. Ask a human before making high-risk, irreversible,
privacy/security/legal, or product-identity-defining choices. Memory changes
are ordinary Git-reviewed edits to \`fingerprint.yml\`, \`checks.yml\`, and
optional rationale files when present.
`;
}

function buildPackagePromptMd(context: PackageMemory): string {
  const parts = [
    `You are working inside the **${context.name}** product experience as captured by Ghost.`,
  ];

  parts.push(`# Product Prose

Canonical product memory lives in \`fingerprint.yml\`. Use situations, principles, experience contracts, and patterns as the source of product judgment.

\`\`\`yaml
${context.fingerprintRaw.trim()}
\`\`\``);

  parts.push(`# Inventory

${formatInventory(context)}`);

  parts.push(`# Exemplars

${formatExemplars(context)}`);

  if (context.checks) {
    const activeChecks = context.checks.checks.filter(
      (check) => check.status === "active",
    );
    if (activeChecks.length > 0) {
      parts.push(`# Active Checks

\`\`\`yaml
${stringifyYaml(
  {
    ...context.checks,
    checks: activeChecks,
  },
  { lineWidth: 0 },
).trim()}
\`\`\``);
    } else {
      parts.push(`# Active Checks

No active checks are recorded. Proposed or disabled checks are not blocking validation.`);
    }
  }

  if (context.intent?.trim()) {
    parts.push(`# Human Context

\`\`\`markdown
${context.intent.trim()}
\`\`\``);
  }

  parts.push(`# Use This Context

- Generate from product prose + inventory + exemplars.
- Select the relevant situation before generating or reviewing UI.
- Preserve applicable principles, experience contracts, and patterns.
- Inspect exemplars as concrete anchors for what good looks like.
- Use inventory and implementation vocabulary only when they support the selected product memory.
- Treat checks as validation; only active checks are blocking.
- When fingerprint memory is silent, proceed from nearby product surfaces, local components, token and copy conventions, optional rationale files when present, and ordinary UX judgment when safe.
- Label silent-memory reasoning as provisional and non-Ghost-backed; ask the human before high-risk, irreversible, privacy/security/legal, or product-identity-defining choices.
- Treat memory changes as ordinary Git-reviewed edits to \`fingerprint.yml\`, \`checks.yml\`, and optional rationale files when present.`);

  return `${parts.join("\n\n")}\n`;
}

function buildPackageReadmeMd(context: PackageMemory): string {
  return `# ${context.name} context bundle

Generated by \`ghost emit context-bundle\` from a root Ghost fingerprint
package.

## Files

- \`SKILL.md\` - agent skill manifest.
- \`prompt.md\` - portable generation packet: product prose, inventory, exemplars, and checks.
- \`fingerprint.yml\` - canonical product prose and exemplar anchors.
${context.checksRaw ? "- `checks.yml` - deterministic gates.\n" : ""}${context.intent ? "- `intent.md` - supplemental human-authored context.\n" : ""}
Regenerate this bundle when \`fingerprint.yml\`, active checks, or optional
rationale files change.
`;
}

function formatInventory(context: PackageMemory): string {
  const { inventory } = context;
  if (inventory.state === "missing") {
    return `No generated inventory cache is present. Inventory is optional; generate it when useful with \`mkdir -p .ghost/cache && ghost inventory > .ghost/cache/inventory.json\`.`;
  }
  if (inventory.state === "unreadable") {
    return `Inventory cache exists at \`${inventory.path}\`, but it could not be read: ${inventory.error}. Treat inventory as unavailable until the cache is regenerated.`;
  }

  const { summary } = inventory;
  const lines = [
    `Inventory cache: \`${inventory.path}\``,
    "- Inventory is generated source material, not canonical product memory.",
  ];
  pushJoined(lines, "Platform hints", summary.platform_hints, { code: true });
  pushJoined(lines, "Build hints", summary.build_system_hints, { code: true });
  if (summary.language_histogram.length) {
    lines.push(
      `- Languages: ${summary.language_histogram
        .map((entry) => `${entry.name} (${entry.files})`)
        .join(", ")}`,
    );
  }
  pushJoined(lines, "Package manifests", summary.package_manifests, {
    code: true,
  });
  pushJoined(lines, "Config candidates", summary.candidate_config_files, {
    code: true,
  });
  pushJoined(lines, "Registry files", summary.registry_files, { code: true });
  if (summary.top_level_tree.length) {
    lines.push(
      `- Top-level tree: ${summary.top_level_tree
        .map((entry) => `\`${entry.path}\``)
        .join(", ")}`,
    );
  }
  if (summary.config?.targets?.length) {
    lines.push(
      `- Config targets: ${summary.config.targets
        .map((target) => `\`${target.id}\``)
        .join(", ")}`,
    );
  }
  if (summary.config?.libraries?.length) {
    lines.push(
      `- Reference libraries: ${summary.config.libraries
        .map((library) => `\`${library.id}\``)
        .join(", ")}`,
    );
  }
  return lines.join("\n");
}

function formatExemplars(context: PackageMemory): string {
  const { exemplars } = context.fingerprint;
  if (exemplars.length === 0) {
    return "No curated exemplars are recorded yet. Use nearby product surfaces as provisional anchors and label that reasoning as non-Ghost-backed.";
  }
  const lines: string[] = [];
  for (const exemplar of exemplars.slice(0, 16)) {
    const detail = [
      exemplar.title ?? exemplar.note,
      exemplar.surface_type ? `surface: ${exemplar.surface_type}` : undefined,
      exemplar.scope ? `scope: ${exemplar.scope}` : undefined,
    ].filter(Boolean);
    lines.push(
      `- \`${exemplar.id}\` - \`${exemplar.path}\`${detail.length ? ` (${detail.join("; ")})` : ""}`,
    );
    if (exemplar.why) lines.push(`  - Why: ${exemplar.why}`);
    if (exemplar.refs?.length) {
      lines.push(
        `  - Memory refs: ${exemplar.refs.map((ref) => `\`${ref}\``).join(", ")}`,
      );
    }
  }
  if (exemplars.length > 16) {
    lines.push(
      `- ${exemplars.length - 16} more exemplar(s); read \`fingerprint.yml\` before generating.`,
    );
  }
  return lines.join("\n");
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

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
