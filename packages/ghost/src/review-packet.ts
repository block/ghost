import { stringify as stringifyYaml } from "yaml";
import { buildContextEntrypoint } from "./context/entrypoint.js";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import {
  buildSelectedContext,
  formatSelectedContextMarkdown,
} from "./context/selected-context.js";
import { parseUnifiedDiff } from "./core/index.js";
import { resolveFingerprintPackage } from "./scan/fingerprint-package.js";
import {
  fingerprintStackToPackageContext,
  type GhostFingerprintStack,
  groupFingerprintStacksForPaths,
  resolveGhostDirDefault,
} from "./scan/fingerprint-stack.js";

const DEFAULT_REVIEW_MAX_DIFF_BYTES = 200_000;

export async function buildReviewPacket(options: {
  packageDir?: string;
  ghostDir?: string;
  diffText: string;
  maxDiffBytes?: number;
}): Promise<ReviewPacket> {
  return options.packageDir
    ? buildSinglePackageReviewPacket(options)
    : buildStackReviewPacket(options);
}

async function buildSinglePackageReviewPacket(options: {
  packageDir?: string;
  diffText: string;
  maxDiffBytes?: number;
}): Promise<ReviewPacket> {
  const paths = resolveFingerprintPackage(options.packageDir, process.cwd());
  const changedFiles = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );
  const context = await loadPackageContext(paths);
  context.targetPaths = changedFiles;
  const packet: ReviewPacket = {
    ...baseReviewPacket(paths.dir, options.diffText, {
      maxDiffBytes: options.maxDiffBytes,
    }),
    fingerprint: context.fingerprint,
    context_markdown: formatReviewContextMarkdown([
      {
        title: paths.dir,
        markdown: formatReviewSelectedContextMarkdown(context, changedFiles),
      },
    ]),
    checks: context.checksRaw ?? null,
  };
  return packet;
}

async function buildStackReviewPacket(options: {
  ghostDir?: string;
  diffText: string;
  maxDiffBytes?: number;
}): Promise<ReviewPacket> {
  const changedFiles = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );
  const groups = await groupFingerprintStacksForPaths(
    changedFiles,
    process.cwd(),
    { ghostDir: resolveGhostDirDefault(options.ghostDir) },
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
      title: group.stack.layers.at(-1)?.dir ?? group.stack.ghost_dir,
      markdown: formatReviewSelectedContextMarkdown(
        context,
        group.changed_files,
        groups.length > 1 ? "#### Selected Context" : "### Selected Context",
      ),
    };
  });
  const first = stacks[0];
  const packet: ReviewPacket = {
    ...baseReviewPacket(
      stacks.length === 1 ? first.package_dir : "fingerprint-stack/multiple",
      options.diffText,
      { maxDiffBytes: options.maxDiffBytes },
    ),
    fingerprint: first.merged.fingerprint,
    context_markdown: formatReviewContextMarkdown(contextSections),
    checks: stringifyYaml(first.merged.checks, { lineWidth: 0 }),
    stacks,
  };
  return packet;
}

function baseReviewPacket(
  packageDir: string,
  diffText: string,
  options: { maxDiffBytes?: number } = {},
): ReviewPacketBase {
  const budget = budgetDiff(diffText, options.maxDiffBytes);
  return {
    schema: "ghost.advisory-review/v1",
    package_dir: packageDir,
    diff: budget.diff,
    budgets: budget.budgets,
    truncated: budget.truncated,
    finding_categories: [
      "fix",
      "intentional-divergence",
      "missing-fingerprint",
      "experience-gap",
      "eval-uncertainty",
    ],
    required_finding_citations: [
      "diff location",
      "fingerprint facet refs",
      "active check when blocking",
      "selected-context gap or local-evidence rationale when context is silent",
      "repair or intentional-divergence rationale",
    ],
  };
}

function formatReviewSelectedContextMarkdown(
  context: PackageContext,
  targetPaths: string[],
  heading = "### Selected Context",
): string {
  const entrypoint = buildContextEntrypoint(context, { targetPaths });
  const selectedContext = buildSelectedContext(context, entrypoint);
  return formatSelectedContextMarkdown(selectedContext, {
    heading,
    includeIntro: false,
  });
}

function budgetDiff(
  diffText: string,
  maxDiffBytes = DEFAULT_REVIEW_MAX_DIFF_BYTES,
): { diff: string; budgets: ReviewPacketBudgets; truncated: boolean } {
  if (!Number.isSafeInteger(maxDiffBytes) || maxDiffBytes < 1) {
    throw new Error("--max-diff-bytes must be a positive integer");
  }
  const bytes = Buffer.byteLength(diffText, "utf-8");
  if (bytes <= maxDiffBytes) {
    return {
      diff: diffText,
      budgets: {
        diff_bytes: bytes,
        max_diff_bytes: maxDiffBytes,
        included_diff_bytes: bytes,
      },
      truncated: false,
    };
  }
  const truncatedDiff = truncateUtf8(diffText, maxDiffBytes);
  const includedBytes = Buffer.byteLength(truncatedDiff, "utf-8");
  return {
    diff: `${truncatedDiff}\n\n[Ghost truncated diff: included ${includedBytes} of ${bytes} byte(s). Re-run with --max-diff-bytes ${bytes} to include the full diff.]`,
    budgets: {
      diff_bytes: bytes,
      max_diff_bytes: maxDiffBytes,
      included_diff_bytes: includedBytes,
    },
    truncated: true,
  };
}

function truncateUtf8(value: string, maxBytes: number): string {
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(value.slice(0, mid), "utf-8") <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  let out = value.slice(0, low);
  if (endsWithHighSurrogate(out)) {
    out = out.slice(0, -1);
  }
  return out;
}

function endsWithHighSurrogate(value: string): boolean {
  if (value.length === 0) return false;
  const code = value.charCodeAt(value.length - 1);
  return code >= 0xd800 && code <= 0xdbff;
}

function reviewStackFromFingerprintStack(
  stack: GhostFingerprintStack,
  changedFiles: string[],
): ReviewStackPacket {
  const leaf = stack.layers.at(-1);
  return {
    target_path: stack.target_path,
    package_dir: leaf?.dir ?? stack.layers[0].dir,
    ghost_dir: stack.ghost_dir,
    changed_files: changedFiles,
    stack_dirs: stack.layers.map((layer) => layer.dir),
    merged: {
      fingerprint: stack.merged.fingerprint,
      checks: stack.merged.checks,
    },
    provenance: {
      merge: stack.provenance.merge,
      stack: stack.provenance.layers,
    },
  };
}

interface ReviewPacketBudgets {
  diff_bytes: number;
  max_diff_bytes: number;
  included_diff_bytes: number;
}

interface ReviewPacketBase {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  diff: string;
  budgets: ReviewPacketBudgets;
  truncated: boolean;
  finding_categories: string[];
  required_finding_citations: string[];
}

interface ReviewPacket {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  fingerprint: unknown;
  context_markdown: string;
  checks: string | null;
  stacks?: ReviewStackPacket[];
  diff: string;
  budgets: ReviewPacketBudgets;
  truncated: boolean;
  finding_categories: string[];
  required_finding_citations: string[];
}

interface ReviewStackPacket {
  target_path: string;
  package_dir: string;
  ghost_dir: string;
  changed_files: string[];
  stack_dirs: string[];
  merged: {
    fingerprint: unknown;
    checks: unknown;
  };
  provenance: {
    merge: "child-wins-by-id";
    stack: GhostFingerprintStack["provenance"]["layers"];
  };
}

export function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to an active deterministic check in validate.yml. Keep findings grounded in intent.yml, inventory.yml, composition.yml, active deterministic checks, and diff evidence; do not expand the review into unrelated audit categories.

Use the selected context first: intent → composition → inventory → validation. When selected context exposes gaps, label the reasoning provisional or report missing-fingerprint / experience-gap instead of pretending the fingerprint is more specific than it is.

Use these finding categories: ${packet.finding_categories.join(", ")}. 

${formatReviewBudgetSection(packet)}

When fingerprint facets are silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, token or copy conventions. Ask the human before assessing high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.

If the diff exposes missing fingerprint grounding or facet coverage, report it as missing-fingerprint or experience-gap. Do not silently rewrite the Ghost package during review; fingerprint and check edits are ordinary Git-reviewed edits.

${formatReviewStacksSection(packet.stacks ?? null)}

${packet.context_markdown}

## Diff

\`\`\`diff
${packet.diff}
\`\`\`
`;
}

function formatReviewBudgetSection(packet: ReviewPacket): string {
  const lines = [
    "## Review Packet Budget",
    "",
    `- Diff bytes: ${packet.budgets.diff_bytes}`,
    `- Included diff bytes: ${packet.budgets.included_diff_bytes}`,
    `- Max diff bytes: ${packet.budgets.max_diff_bytes}`,
    `- Truncated: ${packet.truncated ? "yes" : "no"}`,
  ];
  if (packet.truncated) {
    lines.push(
      "- Note: The diff below is truncated. Re-run with a larger `--max-diff-bytes` value for the full diff.",
    );
  }
  return lines.join("\n");
}

function formatReviewStacksSection(stacks: ReviewStackPacket[] | null): string {
  if (!stacks?.length) return "";

  const lines = ["## Resolved Fingerprint Stacks", ""];
  for (const [index, stack] of stacks.entries()) {
    lines.push(`### Stack ${index + 1}: ${stack.package_dir}`);
    lines.push("");
    lines.push(`Changed files: ${stack.changed_files.join(", ") || "none"}`);
    lines.push(`Stack: ${stack.stack_dirs.join(" -> ")}`);
    lines.push(`Merge: ${stack.provenance.merge}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function formatReviewContextMarkdown(
  sections: Array<{ title: string; markdown: string }>,
): string {
  const lines = ["## Selected Context", ""];
  for (const [index, section] of sections.entries()) {
    if (sections.length > 1) {
      lines.push(`### Context ${index + 1}: ${section.title}`, "");
    }
    lines.push(section.markdown);
  }
  return lines.join("\n").trim();
}
