import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
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

1. \`fingerprint.yml\` - canonical product-experience memory.
2. \`checks.yml\` when present - deterministic gates; only \`active\` checks block.
3. \`intent.md\` when present - supplemental human-authored context.

When generating or reviewing UI, select the relevant situation, principles,
experience contracts, and patterns from \`fingerprint.yml\` before choosing
implementation details. Use implementation vocabulary only as replaceable
material that may help satisfy product memory.

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

  if (context.intent?.trim()) {
    parts.push(`# Human Context

\`\`\`markdown
${context.intent.trim()}
\`\`\``);
  }

  parts.push(`# Use This Context

- Select the relevant situation before generating or reviewing UI.
- Preserve applicable principles, experience contracts, and patterns.
- Use implementation vocabulary only when it supports the selected product memory.
- Only active checks are blocking.
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
- \`prompt.md\` - portable prompt distilled from \`fingerprint.yml\`.
- \`fingerprint.yml\` - canonical product-experience memory.
${context.checksRaw ? "- `checks.yml` - deterministic gates.\n" : ""}${context.intent ? "- `intent.md` - supplemental human-authored context.\n" : ""}
Regenerate this bundle when \`fingerprint.yml\`, active checks, or optional
rationale files change.
`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
