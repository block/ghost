import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GhostProposalDocument } from "#ghost-core";
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
  if (context.openProposals.length > 0) {
    await writeContextFile(
      options.outDir,
      files,
      "open-proposals.md",
      formatOpenProposals(context.openProposals),
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

1. \`fingerprint.yml\` - canonical product-experience memory.
2. \`checks.yml\` when present - deterministic gates; only \`active\` checks block.
3. \`open-proposals.md\` when present - unresolved missing memory, intentional divergences, experience gaps, or check candidates.
4. \`intent.md\` when present - supplemental human-approved context.

When generating or reviewing UI, select the relevant situation, principles,
experience contracts, patterns, and substrate from \`fingerprint.yml\`. Treat
proposals as unresolved context, not canonical truth.
`;
}

function buildPackagePromptMd(context: PackageMemory): string {
  const parts = [
    `You are working inside the **${context.name}** product experience as captured by Ghost.`,
  ];

  parts.push(`# Fingerprint Memory

\`\`\`yaml
${context.fingerprintRaw.trim()}
\`\`\``);

  if (context.checksRaw?.trim()) {
    parts.push(`# Active Checks

\`\`\`yaml
${context.checksRaw.trim()}
\`\`\``);
  }

  if (context.openProposals.length > 0) {
    parts.push(formatOpenProposals(context.openProposals));
  }

  if (context.intent?.trim()) {
    parts.push(`# Human Context

\`\`\`markdown
${context.intent.trim()}
\`\`\``);
  }

  parts.push(`# Use This Context

- Select the relevant situation before generating or reviewing UI.
- Preserve applicable principles, experience contracts, patterns, and substrate.
- Only active checks are blocking.
- Treat open proposals as unresolved context that may explain gaps or intentional divergence.
- If the task exposes missing or contradictory memory, propose a \`missing-memory\`, \`intentional-divergence\`, \`experience-gap\`, or \`check-candidate\` update instead of rewriting canonical memory silently.`);

  return `${parts.join("\n\n")}\n`;
}

function formatOpenProposals(proposals: GhostProposalDocument[]): string {
  const lines = ["# Open Proposals", ""];
  for (const proposal of proposals) {
    lines.push(`## ${proposal.title}`);
    lines.push("");
    lines.push(`- **ID:** \`${proposal.id}\``);
    lines.push(`- **Kind:** ${proposal.kind}`);
    lines.push(`- **Target:** ${proposal.proposed_action.target}`);
    lines.push(`- **Claim:** ${proposal.claim}`);
    lines.push(`- **Rationale:** ${proposal.rationale}`);
    lines.push(`- **Proposed action:** ${proposal.proposed_action.summary}`);
    lines.push("");
  }
  return lines.join("\n");
}

function buildPackageReadmeMd(context: PackageMemory): string {
  return `# ${context.name} context bundle

Generated by \`ghost emit context-bundle\` from a root Ghost fingerprint
package.

## Files

- \`SKILL.md\` - agent skill manifest.
- \`prompt.md\` - portable prompt distilled from \`fingerprint.yml\`.
- \`fingerprint.yml\` - canonical product-experience memory.
${context.checksRaw ? "- `checks.yml` - deterministic gates.\n" : ""}${context.openProposals.length > 0 ? "- `open-proposals.md` - unresolved candidate memory updates.\n" : ""}${context.intent ? "- `intent.md` - supplemental human-approved context.\n" : ""}
Regenerate this bundle when \`fingerprint.yml\`, active checks, or open
proposals change.
`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
