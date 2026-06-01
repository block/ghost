import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_DECISIONS_DIRNAME,
  GHOST_PROPOSALS_DIRNAME,
  type GhostDecisionDocument,
  type GhostProposalDocument,
  lintGhostDecision,
  lintGhostProposal,
} from "#ghost-core";
import { parseUnifiedDiff } from "./core/index.js";
import {
  type GhostMemoryStack,
  type GhostPackageConfig,
  groupMemoryStacksForPaths,
  readOptionalPackageConfig,
  resolveFingerprintPackage,
} from "./scan/index.js";

export async function buildReviewPacket(options: {
  packageDir?: string;
  memoryDir?: string;
  diffText: string;
  includeMemory: boolean;
}): Promise<ReviewPacket> {
  return options.packageDir
    ? buildSingleBundleReviewPacket(options)
    : buildStackReviewPacket(options);
}

async function buildSingleBundleReviewPacket(options: {
  packageDir?: string;
  diffText: string;
  includeMemory: boolean;
}): Promise<ReviewPacket> {
  const paths = resolveFingerprintPackage(options.packageDir, process.cwd());
  const packet: ReviewPacket = {
    ...baseReviewPacket(paths.dir, options.diffText),
    fingerprint: parseYaml(await readFile(paths.fingerprintYml, "utf-8")),
    intent: (await readOptional(paths.intent)) ?? null,
    checks: (await readOptional(paths.checks)) ?? null,
    config: (await readOptionalPackageConfig(paths.config)) ?? null,
    open_proposals: await readOpenProposals(
      resolve(paths.dir, GHOST_PROPOSALS_DIRNAME),
    ),
  };
  if (options.includeMemory) {
    packet.memory = {
      decisions: await readAcceptedDecisions(
        resolve(paths.dir, GHOST_DECISIONS_DIRNAME),
      ),
    };
  }
  return packet;
}

async function buildStackReviewPacket(options: {
  memoryDir?: string;
  diffText: string;
  includeMemory: boolean;
}): Promise<ReviewPacket> {
  const changedFiles = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );
  const groups = await groupMemoryStacksForPaths(changedFiles, process.cwd(), {
    memoryDir: options.memoryDir,
  });
  const stacks = groups.map((group) =>
    reviewStackFromMemoryStack(group.stack, group.changed_files),
  );
  const first = stacks[0];
  const config = await readOptionalPackageConfig(
    resolve(first.package_dir, "config.yml"),
  );
  const packet: ReviewPacket = {
    ...baseReviewPacket(
      stacks.length === 1 ? first.package_dir : "memory-stack/multiple",
      options.diffText,
    ),
    fingerprint: first.merged.fingerprint,
    intent: first.merged.intent,
    checks: stringifyYaml(first.merged.checks, { lineWidth: 0 }),
    config: config ?? null,
    open_proposals: first.merged.open_proposals,
    stacks,
  };
  if (options.includeMemory) {
    packet.memory = {
      decisions: stacks
        .flatMap((stack) => stack.merged.decisions)
        .filter((decision) => decision.status === "accepted"),
    };
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
    proposal_types: [
      "missing-memory",
      "intentional-divergence",
      "experience-gap",
      "check-candidate",
    ],
    required_finding_citations: [
      "diff location",
      "fingerprint.yml memory",
      "active check when blocking",
      "open proposal when relevant",
      "repair or intentional-divergence rationale",
    ],
  };
}

function reviewStackFromMemoryStack(
  stack: GhostMemoryStack,
  changedFiles: string[],
): ReviewStackPacket {
  const leaf = stack.layers.at(-1);
  return {
    target_path: stack.target_path,
    package_dir: leaf?.dir ?? stack.layers[0].dir,
    memory_dir: stack.memory_dir,
    changed_files: changedFiles,
    layer_dirs: stack.layers.map((layer) => layer.dir),
    merged: {
      fingerprint: stack.merged.fingerprint,
      intent: stack.merged.intent,
      checks: stack.merged.checks,
      proposals: stack.merged.proposals,
      open_proposals: stack.merged.open_proposals,
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
  proposal_types: string[];
  required_finding_citations: string[];
}

interface ReviewPacket {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  fingerprint: unknown;
  intent: string | null;
  checks: string | null;
  config: GhostPackageConfig | null;
  open_proposals: GhostProposalDocument[];
  memory?: { decisions: GhostDecisionDocument[] };
  stacks?: ReviewStackPacket[];
  diff: string;
  finding_categories: string[];
  proposal_types: string[];
  required_finding_citations: string[];
}

interface ReviewStackPacket {
  target_path: string;
  package_dir: string;
  memory_dir: string;
  changed_files: string[];
  layer_dirs: string[];
  merged: {
    fingerprint: unknown;
    intent: string | null;
    checks: unknown;
    proposals: GhostProposalDocument[];
    open_proposals: GhostProposalDocument[];
    decisions: GhostDecisionDocument[];
  };
  provenance: GhostMemoryStack["provenance"];
}

export function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to an active deterministic check in checks.yml. Keep findings grounded in fingerprint memory, human intent, open proposals, or active deterministic checks; do not expand the review into unrelated audit categories.

Use these finding categories: ${packet.finding_categories.join(", ")}.

If the diff exposes missing or contradictory memory, report it as missing-memory or experience-gap and propose one of: ${packet.proposal_types.join(", ")}. Do not silently rewrite canonical memory.

${formatReviewStacksSection(packet.stacks ?? null)}

## Fingerprint Memory

\`\`\`yaml
${stringifyYaml(packet.fingerprint)}
\`\`\`

## Human Intent

\`\`\`markdown
${packet.intent ?? "_No intent.md present. Treat fingerprint.yml as the canonical product-experience memory._"}
\`\`\`

${formatMemorySection(packet.memory ?? null)}

${formatConfigSection(packet.config)}

${formatProposalSection(packet.open_proposals)}

## Active Checks

\`\`\`yaml
${packet.checks ?? "schema: ghost.checks/v1\nid: none\nchecks: []\n"}
\`\`\`

## Diff

\`\`\`diff
${packet.diff}
\`\`\`
`;
}

function formatReviewStacksSection(stacks: ReviewStackPacket[] | null): string {
  if (!stacks?.length) return "";

  const lines = ["## Resolved Memory Stacks", ""];
  for (const [index, stack] of stacks.entries()) {
    lines.push(`### Stack ${index + 1}: ${stack.package_dir}`);
    lines.push("");
    lines.push(`Changed files: ${stack.changed_files.join(", ") || "none"}`);
    lines.push(`Layers: ${stack.layer_dirs.join(" -> ")}`);
    lines.push("");
    lines.push("```yaml");
    lines.push(
      stringifyYaml(
        {
          fingerprint: stack.merged.fingerprint,
          checks: stack.merged.checks,
          open_proposals: stack.merged.open_proposals,
          provenance: stack.provenance,
        },
        { lineWidth: 0 },
      ).trim(),
    );
    lines.push("```", "");
    if (stack.merged.intent?.trim()) {
      lines.push("```markdown", stack.merged.intent.trim(), "```", "");
    }
  }

  return `${lines.join("\n")}\n`;
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
    const parsed = parseYaml(await readFile(path, "utf-8"));
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

function formatMemorySection(
  memory: { decisions: GhostDecisionDocument[] } | null,
): string {
  if (!memory) return "";
  if (memory.decisions.length === 0) {
    return `## Accepted Product-Experience Decisions

_No accepted decisions found in .ghost/decisions._
`;
  }

  const lines = ["## Accepted Product-Experience Decisions", ""];
  for (const decision of memory.decisions) {
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

_No config.yml present. Review uses fingerprint.yml memory and the provided diff only._
`;
  }

  return `## Implementation Config

\`\`\`yaml
${stringifyYaml(config)}
\`\`\`
`;
}

function formatProposalSection(proposals: GhostProposalDocument[]): string {
  if (proposals.length === 0) {
    return `## Open Proposals

_No open proposals found in .ghost/proposals._
`;
  }

  const lines = ["## Open Proposals", ""];
  for (const proposal of proposals) {
    lines.push(`### ${proposal.title}`);
    lines.push("");
    lines.push(`- **ID:** \`${proposal.id}\``);
    lines.push(`- **Kind:** ${proposal.kind}`);
    lines.push(`- **Claim:** ${proposal.claim}`);
    lines.push(`- **Rationale:** ${proposal.rationale}`);
    lines.push(`- **Proposed action:** ${proposal.proposed_action.summary}`);
    lines.push("");
  }

  return lines.join("\n");
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
