import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostFingerprintDocument,
  type GhostProposalDocument,
  lintGhostFingerprint,
  lintGhostProposal,
} from "#ghost-core";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";
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

interface PackageContext {
  name: string;
  fingerprint: GhostFingerprintDocument;
  fingerprintRaw: string;
  checks?: string;
  intent?: string;
  openProposals: GhostProposalDocument[];
}

export async function writePackageContextBundle(
  paths: FingerprintPackagePaths,
  options: WritePackageContextOptions,
): Promise<WriteContextResult> {
  const context = await loadPackageContext(paths, options.name);
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
  if (context.checks) {
    await writeContextFile(options.outDir, files, "checks.yml", context.checks);
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

async function loadPackageContext(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageContext> {
  const [fingerprintRaw, checks, intent, openProposals] = await Promise.all([
    readFile(paths.fingerprintYml, "utf-8"),
    readOptional(paths.checks),
    readOptional(paths.intent),
    readOpenProposals(paths.proposals),
  ]);

  const parsed = parseYamlSafe(fingerprintRaw, "fingerprint.yml");
  const report = lintGhostFingerprint(parsed);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `fingerprint.yml failed lint with ${report.errors} error(s): ${
        first?.message ?? "invalid fingerprint"
      }${suffix}`,
    );
  }

  const fingerprint = parsed as GhostFingerprintDocument;
  return {
    name: sanitizeName(nameOverride ?? inferPackageName(fingerprint)),
    fingerprint,
    fingerprintRaw,
    checks,
    intent,
    openProposals,
  };
}

async function readOpenProposals(
  dirPath: string,
): Promise<GhostProposalDocument[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const proposals: GhostProposalDocument[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!/\.ya?ml$/i.test(entry.name)) continue;

    const path = resolve(dirPath, entry.name);
    const parsed = parseYamlSafe(await readFile(path, "utf-8"), path);
    const report = lintGhostProposal(parsed);
    if (report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      const suffix = first?.path ? ` @ ${first.path}` : "";
      throw new Error(
        `${path} failed proposal lint: ${first?.message ?? "invalid proposal"}${suffix}`,
      );
    }
    const proposal = parsed as GhostProposalDocument;
    if (proposal.status === "open") proposals.push(proposal);
  }

  return proposals;
}

function parseYamlSafe(raw: string, label: string): unknown {
  try {
    return parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
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

function inferPackageName(fingerprint: GhostFingerprintDocument): string {
  if (fingerprint.summary.product) return fingerprint.summary.product;
  const firstScope = fingerprint.topology.scopes?.[0]?.id;
  if (firstScope) return firstScope;
  return "ghost-package";
}

function sanitizeName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "ghost-package";
}

function buildPackageSkillMd(context: PackageContext): string {
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

function buildPackagePromptMd(context: PackageContext): string {
  const parts = [
    `You are working inside the **${context.name}** product experience as captured by Ghost.`,
  ];

  parts.push(`# Fingerprint Memory

\`\`\`yaml
${context.fingerprintRaw.trim()}
\`\`\``);

  if (context.checks?.trim()) {
    parts.push(`# Active Checks

\`\`\`yaml
${context.checks.trim()}
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

function buildPackageReadmeMd(context: PackageContext): string {
  return `# ${context.name} context bundle

Generated by \`ghost emit context-bundle\` from a root Ghost fingerprint
package.

## Files

- \`SKILL.md\` - agent skill manifest.
- \`prompt.md\` - portable prompt distilled from \`fingerprint.yml\`.
- \`fingerprint.yml\` - canonical product-experience memory.
${context.checks ? "- `checks.yml` - deterministic gates.\n" : ""}${context.openProposals.length > 0 ? "- `open-proposals.md` - unresolved candidate memory updates.\n" : ""}${context.intent ? "- `intent.md` - supplemental human-approved context.\n" : ""}
Regenerate this bundle when \`fingerprint.yml\`, active checks, or open
proposals change.
`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
