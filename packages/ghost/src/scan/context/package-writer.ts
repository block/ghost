import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";
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

1. \`prompt.md\` - generation packet: prose, inventory, composition, and active checks.
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
  const parts = [
    `You are working inside the **${context.name}** product-surface composition as captured by Ghost.`,
  ];

  parts.push(`# Agent Handoff

This packet is upstream input for agentic UI work, not post-hoc commentary. Use it before writing or revising product surfaces so the output extends the same surface composition instead of merely passing local checks.

After generating, validate the diff with Ghost checks or review when available, and keep Ghost package edits as ordinary Git-reviewed edits to the source \`.ghost\` package.`);

  parts.push(`# Prose

Surface intent lives in \`fingerprint/prose.yml\`. Use situations, principles, and experience contracts as the source of intent for the work.

\`\`\`yaml
${stringifyYaml(context.fingerprint.prose, { lineWidth: 0 }).trim()}
\`\`\``);

  parts.push(`# Inventory

${formatTopology(context)}

${formatBuildingBlocks(context)}

${formatExemplars(context)}

${formatGeneratedCache(context)}`);

  parts.push(`# Composition

${formatComposition(context)}`);

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

- Treat this packet as the upstream handoff before generating or revising UI.
- Generate from prose + inventory + composition.
- Select the relevant situation before generating or reviewing UI.
- Preserve applicable principles, experience contracts, and composition patterns.
- Inspect inventory exemplars as concrete anchors for what good looks like.
- Use inventory building blocks only when they support the selected prose and composition.
- Treat checks as validation; only active checks are blocking.
- After generating, run or request Ghost review/check when available so output is validated against the same fingerprint layers.
- When fingerprint layers are silent, proceed from nearby product surfaces, local components, token and copy conventions, optional rationale files when present, and ordinary UX reasoning when safe.
- Label silent-layer reasoning as provisional and non-Ghost-backed; ask the human before high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.
- Treat fingerprint edits as ordinary Git-reviewed edits to \`fingerprint/\` files and optional local \`config.yml\` when present.`);

  return `${parts.join("\n\n")}\n`;
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
- \`prompt.md\` - portable generation packet: prose, inventory, composition, and checks.
- \`fingerprint/manifest.yml\` - portable fingerprint package anchor.
- \`fingerprint/prose.yml\` - surface intent.
- \`fingerprint/inventory.yml\` - canonical curated material and source links.
- \`fingerprint/composition.yml\` - canonical experience patterns.
${context.checksRaw ? "- `fingerprint/enforcement/checks.yml` - deterministic gates.\n" : ""}${context.intent ? "- `fingerprint/memory/intent.md` - supplemental human-authored context.\n" : ""}
Regenerate this bundle when \`fingerprint/\` core layers, active checks, or
optional rationale files change.
`;
}

function formatTopology(context: PackageContext): string {
  const { topology } = context.fingerprint.inventory;
  const lines = ["## Topology"];
  pushJoined(lines, "Surface types", topology.surface_types, { code: true });
  if (topology.scopes?.length) {
    for (const scope of topology.scopes.slice(0, 16)) {
      const details = [
        scope.paths.length
          ? `paths: ${scope.paths.map((path) => `\`${path}\``).join(", ")}`
          : undefined,
        scope.surface_types?.length
          ? `surface types: ${scope.surface_types.map((surfaceType) => `\`${surfaceType}\``).join(", ")}`
          : undefined,
      ].filter(Boolean);
      lines.push(
        `- \`${scope.id}\`${details.length ? ` - ${details.join("; ")}` : ""}`,
      );
    }
    if (topology.scopes.length > 16) {
      lines.push(
        `- ${topology.scopes.length - 16} more scope(s); read \`fingerprint/inventory.yml\` before generating.`,
      );
    }
  }
  if (lines.length === 1) {
    lines.push("- No inventory topology recorded yet.");
  }
  return lines.join("\n");
}

function formatGeneratedCache(context: PackageContext): string {
  const { inventory } = context;
  if (inventory.state === "missing") {
    return `## Generated Cache

No generated cache is present. Generated cache is optional source material; create it when useful with \`mkdir -p .ghost/fingerprint/sources/cache && ghost inventory > .ghost/fingerprint/sources/cache/inventory.json\`.`;
  }
  if (inventory.state === "unreadable") {
    return `## Generated Cache

Generated cache exists at \`${inventory.path}\`, but it could not be read: ${inventory.error}. Treat generated cache as unavailable until it is regenerated.`;
  }

  const { summary } = inventory;
  const lines = [
    "## Generated Cache",
    `- Cache path: \`${inventory.path}\``,
    "- Generated cache is optional source material, not canonical inventory.",
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

function formatBuildingBlocks(context: PackageContext): string {
  const { building_blocks: blocks } = context.fingerprint.inventory;
  const lines = [
    "## Building Blocks",
    "- Use these as available material, not surface-composition authority.",
  ];
  pushJoined(lines, "Tokens", blocks.tokens, { code: true });
  pushJoined(lines, "Components", blocks.components, { code: true });
  pushJoined(lines, "Libraries", blocks.libraries, { code: true });
  pushJoined(lines, "Assets", blocks.assets, { code: true });
  pushJoined(lines, "Routes", blocks.routes, { code: true });
  pushJoined(lines, "Files", blocks.files, { code: true });
  pushJoined(lines, "Notes", blocks.notes);
  if (lines.length === 2) {
    lines.push("- No curated inventory building blocks recorded yet.");
  }
  return lines.join("\n");
}

function formatComposition(context: PackageContext): string {
  const { patterns } = context.fingerprint.composition;
  if (patterns.length === 0) {
    return "No composition patterns are recorded yet. Use nearby product surfaces as provisional anchors and label that reasoning as non-Ghost-backed.";
  }
  const lines: string[] = [];
  for (const pattern of patterns.slice(0, 16)) {
    lines.push(`- \`${pattern.id}\` (${pattern.kind}) - ${pattern.pattern}`);
    for (const guidance of pattern.guidance ?? []) {
      lines.push(`  - ${guidance}`);
    }
    if (pattern.anti_patterns?.length) {
      lines.push(`  - Avoid: ${pattern.anti_patterns.join("; ")}`);
    }
  }
  if (patterns.length > 16) {
    lines.push(
      `- ${patterns.length - 16} more composition pattern(s); read \`fingerprint/composition.yml\` before generating.`,
    );
  }
  return lines.join("\n");
}

function formatExemplars(context: PackageContext): string {
  const { exemplars } = context.fingerprint.inventory;
  if (exemplars.length === 0) {
    return "## Exemplars\n\nNo curated exemplars are recorded yet. Use nearby product surfaces as provisional anchors and label that reasoning as non-Ghost-backed.";
  }
  const lines: string[] = ["## Exemplars"];
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
        `  - Fingerprint refs: ${exemplar.refs.map((ref) => `\`${ref}\``).join(", ")}`,
      );
    }
  }
  if (exemplars.length > 16) {
    lines.push(
      `- ${exemplars.length - 16} more exemplar(s); read \`fingerprint/inventory.yml\` before generating.`,
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
