import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { type GhostDecisionDocument, lintGhostDecision } from "#ghost-core";
import { buildContextEntrypoint } from "./context/entrypoint.js";
import { formatContextEntrypointMarkdown } from "./context/entrypoint-markdown.js";
import { loadPackageContext } from "./context/package-context.js";
import { parseUnifiedDiff } from "./core/index.js";
import { resolveFingerprintPackage } from "./scan/fingerprint-package.js";
import {
  fingerprintStackToPackageContext,
  type GhostFingerprintStack,
  groupFingerprintStacksForPaths,
} from "./scan/fingerprint-stack.js";
import {
  type GhostPackageConfig,
  readOptionalPackageConfig,
} from "./scan/package-config.js";

export async function buildReviewPacket(options: {
  packageDir?: string;
  memoryDir?: string;
  diffText: string;
  includeAcceptedDecisions: boolean;
}): Promise<ReviewPacket> {
  return options.packageDir
    ? buildSinglePackageReviewPacket(options)
    : buildStackReviewPacket(options);
}

async function buildSinglePackageReviewPacket(options: {
  packageDir?: string;
  diffText: string;
  includeAcceptedDecisions: boolean;
}): Promise<ReviewPacket> {
  const paths = resolveFingerprintPackage(options.packageDir, process.cwd());
  const changedFiles = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );
  const context = await loadPackageContext(paths);
  context.targetPaths = changedFiles;
  const packet: ReviewPacket = {
    ...baseReviewPacket(paths.dir, options.diffText),
    fingerprint: context.fingerprint,
    context_markdown: formatReviewContextMarkdown([
      {
        title: paths.dir,
        markdown: formatContextEntrypointMarkdown(
          buildContextEntrypoint(context, { targetPaths: changedFiles }),
          {
            heading: "### Selected Fingerprint Context",
            includeIntro: false,
          },
        ),
      },
    ]),
    intent: (await readOptional(paths.intent)) ?? null,
    checks: context.checksRaw ?? null,
    config: (await readOptionalPackageConfig(paths.config)) ?? null,
  };
  if (options.includeAcceptedDecisions) {
    packet.accepted_decisions = await readAcceptedDecisions(paths.decisions);
  }
  return packet;
}

async function buildStackReviewPacket(options: {
  memoryDir?: string;
  diffText: string;
  includeAcceptedDecisions: boolean;
}): Promise<ReviewPacket> {
  const changedFiles = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );
  const groups = await groupFingerprintStacksForPaths(
    changedFiles,
    process.cwd(),
    { memoryDir: options.memoryDir },
  );
  const stacks = groups.map((group) =>
    reviewStackFromFingerprintStack(group.stack, group.changed_files),
  );
  const contextSections = groups.map((group) => {
    const context = fingerprintStackToPackageContext(
      group.stack,
      undefined,
      group.changed_files,
    );
    return {
      title: group.stack.layers.at(-1)?.dir ?? group.stack.fingerprint_dir,
      markdown: formatContextEntrypointMarkdown(
        buildContextEntrypoint(context, {
          targetPaths: group.changed_files,
        }),
        {
          heading: "### Selected Fingerprint Context",
          includeIntro: false,
        },
      ),
    };
  });
  const first = stacks[0];
  const config = await readOptionalPackageConfig(
    resolve(first.package_dir, "config.yml"),
  );
  const packet: ReviewPacket = {
    ...baseReviewPacket(
      stacks.length === 1 ? first.package_dir : "fingerprint-stack/multiple",
      options.diffText,
    ),
    fingerprint: first.merged.fingerprint,
    context_markdown: formatReviewContextMarkdown(contextSections),
    intent: first.merged.intent,
    checks: stringifyYaml(first.merged.checks, { lineWidth: 0 }),
    config: config ?? null,
    stacks,
  };
  if (options.includeAcceptedDecisions) {
    packet.accepted_decisions = stacks
      .flatMap((stack) => stack.merged.decisions)
      .filter((decision) => decision.status === "accepted");
  }
  return packet;
}

function baseReviewPacket(
  packageDir: string,
  diffText: string,
): ReviewPacketBase {
  return {
    schema: "ghost.advisory-review/v1",
    package_dir: packageDir,
    diff: diffText,
    finding_categories: [
      "fix",
      "intentional-divergence",
      "missing-memory",
      "experience-gap",
      "eval-uncertainty",
    ],
    required_finding_citations: [
      "diff location",
      "fingerprint core layer refs",
      "active check when blocking",
      "repair or intentional-divergence rationale",
    ],
  };
}

function reviewStackFromFingerprintStack(
  stack: GhostFingerprintStack,
  changedFiles: string[],
): ReviewStackPacket {
  const leaf = stack.layers.at(-1);
  return {
    target_path: stack.target_path,
    package_dir: leaf?.dir ?? stack.layers[0].dir,
    fingerprint_dir: stack.fingerprint_dir,
    changed_files: changedFiles,
    layer_dirs: stack.layers.map((layer) => layer.dir),
    merged: {
      fingerprint: stack.merged.fingerprint,
      intent: stack.merged.intent,
      checks: stack.merged.checks,
      decisions: stack.merged.decisions,
    },
    provenance: stack.provenance,
  };
}

interface ReviewPacketBase {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  diff: string;
  finding_categories: string[];
  required_finding_citations: string[];
}

interface ReviewPacket {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  fingerprint: unknown;
  context_markdown: string;
  intent: string | null;
  checks: string | null;
  config: GhostPackageConfig | null;
  accepted_decisions?: GhostDecisionDocument[];
  stacks?: ReviewStackPacket[];
  diff: string;
  finding_categories: string[];
  required_finding_citations: string[];
}

interface ReviewStackPacket {
  target_path: string;
  package_dir: string;
  fingerprint_dir: string;
  changed_files: string[];
  layer_dirs: string[];
  merged: {
    fingerprint: unknown;
    intent: string | null;
    checks: unknown;
    decisions: GhostDecisionDocument[];
  };
  provenance: GhostFingerprintStack["provenance"];
}

export function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to an active deterministic check in fingerprint/enforcement/checks.yml. Keep findings grounded in fingerprint/prose.yml, fingerprint/inventory.yml, fingerprint/composition.yml, active deterministic checks, and optional rationale files when present; do not expand the review into unrelated audit categories.

Use these finding categories: ${packet.finding_categories.join(", ")}.

When fingerprint layers are silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, token or copy conventions, or optional rationale files when present. Ask the human before assessing high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.

If the diff exposes missing fingerprint grounding or layer coverage, report it as missing-memory or experience-gap. Do not silently rewrite the Ghost package during review; fingerprint and check edits are ordinary Git-reviewed edits.

${formatReviewStacksSection(packet.stacks ?? null)}

${packet.context_markdown}

## Human Intent

\`\`\`markdown
${packet.intent ?? "_No fingerprint/memory/intent.md present. Treat fingerprint core layers as the canonical prose, inventory, and composition source._"}
\`\`\`

${formatAcceptedDecisionsSection(packet.accepted_decisions ?? null)}

${formatConfigSection(packet.config)}

## Diff

\`\`\`diff
${packet.diff}
\`\`\`
`;
}

function formatReviewStacksSection(stacks: ReviewStackPacket[] | null): string {
  if (!stacks?.length) return "";

  const lines = ["## Resolved Fingerprint Stacks", ""];
  for (const [index, stack] of stacks.entries()) {
    lines.push(`### Stack ${index + 1}: ${stack.package_dir}`);
    lines.push("");
    lines.push(`Changed files: ${stack.changed_files.join(", ") || "none"}`);
    lines.push(`Layers: ${stack.layer_dirs.join(" -> ")}`);
    lines.push(`Merge: ${stack.provenance.merge}`);
    lines.push("");
    if (stack.merged.intent?.trim()) {
      lines.push("```markdown", stack.merged.intent.trim(), "```", "");
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatReviewContextMarkdown(
  sections: Array<{ title: string; markdown: string }>,
): string {
  const lines = ["## Selected Fingerprint Context", ""];
  for (const [index, section] of sections.entries()) {
    if (sections.length > 1) {
      lines.push(`### Context ${index + 1}: ${section.title}`, "");
    }
    lines.push(
      section.markdown.replace(/^### Selected Fingerprint Context\n\n?/, ""),
    );
  }
  return lines.join("\n").trim();
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function readAcceptedDecisions(
  dirPath: string,
): Promise<GhostDecisionDocument[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const decisions: GhostDecisionDocument[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!/\.ya?ml$/i.test(entry.name)) continue;

    const path = resolve(dirPath, entry.name);
    const parsed = parseYaml(await readFile(path, "utf-8"));
    const report = lintGhostDecision(parsed);
    if (report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      const suffix = first?.path ? ` @ ${first.path}` : "";
      throw new Error(
        `${path} failed decision lint: ${first?.message ?? "invalid decision"}${suffix}`,
      );
    }
    const decision = parsed as GhostDecisionDocument;
    if (decision.status === "accepted") decisions.push(decision);
  }

  return decisions;
}

function formatAcceptedDecisionsSection(
  decisions: GhostDecisionDocument[] | null,
): string {
  if (!decisions) return "";
  if (decisions.length === 0) {
    return `## Accepted Surface-Composition Decisions

_No accepted decisions found in fingerprint/memory/decisions._
`;
  }

  const lines = ["## Accepted Surface-Composition Decisions", ""];
  for (const decision of decisions) {
    lines.push(`### ${decision.title}`);
    lines.push("");
    lines.push(`- **ID:** \`${decision.id}\``);
    lines.push(`- **Claim:** ${decision.claim}`);
    lines.push(`- **Rationale:** ${decision.rationale}`);
    if (decision.scope) {
      lines.push(`- **Scope:** ${formatDecisionScope(decision.scope)}`);
    }
    lines.push(
      `- **Evidence:** ${decision.evidence
        .map(
          (entry) =>
            entry.path ??
            entry.survey_surface_id ??
            entry.locator ??
            entry.note,
        )
        .join(", ")}`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

function formatConfigSection(config: GhostPackageConfig | null): string {
  if (!config) {
    return `## Implementation Config

_No config.yml present. Review uses canonical fingerprint core layers and the provided diff only._
`;
  }

  return `## Implementation Config

\`\`\`yaml
${stringifyYaml(config)}
\`\`\`
`;
}

function formatDecisionScope(
  scope: NonNullable<GhostDecisionDocument["scope"]>,
): string {
  const parts: string[] = [];
  if (scope.roles?.length) parts.push(`roles=${scope.roles.join("/")}`);
  if (scope.scopes?.length) parts.push(`scopes=${scope.scopes.join("/")}`);
  if (scope.surface_types?.length) {
    parts.push(`surface_types=${scope.surface_types.join("/")}`);
  }
  if (scope.pattern_ids?.length) {
    parts.push(`pattern_ids=${scope.pattern_ids.join("/")}`);
  }
  if (scope.paths?.length) parts.push(`paths=${scope.paths.join("/")}`);
  return parts.length ? parts.join("; ") : "global";
}
