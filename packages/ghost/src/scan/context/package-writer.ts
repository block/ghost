import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";
import { buildContextEntrypoint } from "./entrypoint.js";
import { formatContextEntrypointMarkdown } from "./entrypoint-markdown.js";
import { loadPackageContext, type PackageContext } from "./package-context.js";
import type { WriteContextResult } from "./writer.js";

export interface WritePackageContextOptions {
  outDir: string;
  /** Override the skill/package name. Default: prose.yml summary product. */
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
  const context = await loadPackageContext(paths, options.name);
  return writePackageContextBundleFromContext(context, options);
}

export async function writePackageContextBundleFromContext(
  context: PackageContext,
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
    "fingerprint/manifest.yml",
    context.fingerprintLayers?.manifest ??
      `schema: ${GHOST_FINGERPRINT_PACKAGE_SCHEMA}\nid: ${context.name}\n`,
  );
  await writeContextFile(
    options.outDir,
    files,
    "fingerprint/prose.yml",
    context.fingerprintLayers?.prose ??
      stringifyYaml(context.fingerprint.prose, { lineWidth: 0 }),
  );
  await writeContextFile(
    options.outDir,
    files,
    "fingerprint/inventory.yml",
    context.fingerprintLayers?.inventory ??
      stringifyYaml(context.fingerprint.inventory, { lineWidth: 0 }),
  );
  await writeContextFile(
    options.outDir,
    files,
    "fingerprint/composition.yml",
    context.fingerprintLayers?.composition ??
      stringifyYaml(context.fingerprint.composition, { lineWidth: 0 }),
  );
  if (context.checksRaw) {
    await writeContextFile(
      options.outDir,
      files,
      "fingerprint/enforcement/checks.yml",
      context.checksRaw,
    );
  }
  if (context.intent) {
    await writeContextFile(
      options.outDir,
      files,
      "fingerprint/memory/intent.md",
      context.intent,
    );
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
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, ensureTrailingNewline(content), "utf-8");
  files.push(outPath);
}

function buildPackageSkillMd(context: PackageContext): string {
  return `---
name: ${context.name}
description: Use this Ghost surface-composition fingerprint to preserve coherent UI generation and review.
user-invocable: true
---

This skill grounds work in the **${context.name}** Ghost fingerprint.

Treat this bundle as the upstream handoff for agentic UI work. Use it before
generation so the output extends the same product-surface composition, then
validate the resulting diff with Ghost checks or review when available.

Read the files in this order:

1. \`prompt.md\` - compact entrypoint: selected refs, suggested reads, omissions, and validation notes.
2. \`fingerprint/prose.yml\`, \`fingerprint/inventory.yml\`, and \`fingerprint/composition.yml\` - canonical core layers.
3. \`fingerprint/enforcement/checks.yml\` when present - deterministic gates; only \`active\` checks block.
4. \`fingerprint/memory/intent.md\` when present - supplemental human-authored context.

When generating UI, combine prose, inventory, and composition from
\`fingerprint/\`. Use generated cache only as replaceable source material
that may help satisfy canonical prose, inventory, and composition.
When reviewing, use active checks for blocking validation and keep other
findings advisory.

When fingerprint layers are silent, proceed from nearby product surfaces, local
components, token and copy conventions, optional rationale files when present,
and ordinary UX reasoning when safe. Label that reasoning as provisional and
non-Ghost-backed. Ask a human before making high-risk, irreversible,
privacy/security/legal, or product-surface-defining choices. Fingerprint edits
are ordinary Git-reviewed edits to \`fingerprint/\` files and optional local
\`config.yml\` when present.
`;
}

function buildPackagePromptMd(context: PackageContext): string {
  return formatContextEntrypointMarkdown(buildContextEntrypoint(context));
}

function buildPackageReadmeMd(context: PackageContext): string {
  return `# ${context.name} context bundle

Generated by \`ghost emit context-bundle\` from a root Ghost fingerprint
package.

This is an upstream agent handoff. Give it to Codex, Cursor, Claude, or another
host agent before asking for UI work, then validate the resulting diff with
Ghost checks or review when available.

## Files

- \`SKILL.md\` - agent skill manifest.
- \`prompt.md\` - compact entrypoint with selected refs, suggested reads, omissions, and validation notes.
- \`fingerprint/manifest.yml\` - portable fingerprint package anchor.
- \`fingerprint/prose.yml\` - surface intent.
- \`fingerprint/inventory.yml\` - canonical curated material and source links.
- \`fingerprint/composition.yml\` - canonical experience patterns.
${context.checksRaw ? "- `fingerprint/enforcement/checks.yml` - deterministic gates.\n" : ""}${context.intent ? "- `fingerprint/memory/intent.md` - supplemental human-authored context.\n" : ""}
Regenerate this bundle when \`fingerprint/\` core layers, active checks, or
optional rationale files change.
`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
