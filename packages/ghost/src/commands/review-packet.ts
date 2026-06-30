import {
  type GhostCheckDocument,
  type GraphSlice,
  resolveGraphSlice,
  UsageError,
} from "#ghost-core";
import { loadChecksDir } from "../scan/checks-dir.js";
import {
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "../scan/fingerprint-package.js";
import { findUnknownSurfaces, UnknownSurfaceError } from "./surface-guard.js";

const DEFAULT_REVIEW_MAX_DIFF_BYTES = 200_000;

/**
 * Build an advisory review packet on the surface rails: ground the agent-stated
 * touched surfaces in their fingerprint slices, and offer every markdown check
 * for the reviewer to apply (the agent judges relevance against the diff and the
 * grounded prose; a check's `source:` names the prose it enforces). The diff is
 * embedded verbatim; it is not used to resolve surfaces (the agent already
 * analyzed it and names the surfaces).
 */
export async function buildReviewPacket(options: {
  packageDir?: string;
  diffText: string;
  surfaces: string[];
  maxDiffBytes?: number;
}): Promise<ReviewPacket> {
  const cwd = process.cwd();
  const paths = resolveFingerprintPackage(options.packageDir, cwd);
  const loaded = await loadFingerprintPackage(paths);
  const { checks, invalid } = await loadChecksDir(paths.dir);

  // The agent names the touched surfaces; dedupe and route.
  const touched = [...new Set(options.surfaces.filter((s) => s.length > 0))];

  // A named surface absent from the graph is an error, not a silent empty
  // route. The command renders this with suggestions.
  const unknown = findUnknownSurfaces(loaded.graph, touched);
  if (unknown.length > 0) throw new UnknownSurfaceError(unknown);

  // Grounding is the gather slice: the prose nodes a finding can cite.
  const grounding = touched.map((surface) =>
    resolveGraphSlice(loaded.graph, surface),
  );

  return {
    ...baseReviewPacket(paths.dir, options.diffText, {
      maxDiffBytes: options.maxDiffBytes,
    }),
    touched_surfaces: touched,
    checks,
    grounding,
    invalid_checks: invalid,
  };
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
      "surface the change touches",
      "the applicable check when blocking (cite its `source:` section when the check declares one)",
      "grounding ref (why / what) or local-evidence rationale when the surface is silent",
      "repair or intentional-divergence rationale",
    ],
  };
}

function budgetDiff(
  diffText: string,
  maxDiffBytes = DEFAULT_REVIEW_MAX_DIFF_BYTES,
): { diff: string; budgets: ReviewPacketBudgets; truncated: boolean } {
  if (!Number.isSafeInteger(maxDiffBytes) || maxDiffBytes < 1) {
    throw new UsageError("--max-diff-bytes must be a positive integer");
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

interface ReviewPacket extends ReviewPacketBase {
  touched_surfaces: string[];
  checks: GhostCheckDocument[];
  grounding: GraphSlice[];
  invalid_checks: Array<{ file: string; message: string }>;
}

export function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to a check. Every check below is offered; judge which apply to this diff and the grounded prose, and ignore the rest. Keep findings grounded in the touched surfaces' grounded nodes and the applicable checks; do not expand the review into unrelated audit categories.

Read the grounded nodes for each touched surface (own first, then inherited from ancestors, then related). When a surface's grounding is silent, label the reasoning provisional or report missing-fingerprint / experience-gap instead of pretending the fingerprint is more specific than it is.

Use these finding categories: ${packet.finding_categories.join(", ")}.

${formatReviewBudgetSection(packet)}

When a surface's grounding is silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, token or copy conventions. Ask the human before assessing high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.

If the diff exposes missing fingerprint grounding or surface coverage, report it as missing-fingerprint or experience-gap. Do not silently rewrite the Ghost package during review; fingerprint and check edits are ordinary Git-reviewed edits.

${formatTouchedSurfacesSection(packet)}

${formatChecksSection(packet)}

${formatGroundingSection(packet)}

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

function formatTouchedSurfacesSection(packet: ReviewPacket): string {
  const surfaces = packet.touched_surfaces.length
    ? packet.touched_surfaces.map((s) => `\`${s}\``).join(", ")
    : "none (core only)";
  return `## Touched Surfaces\n\n${surfaces}`;
}

function formatChecksSection(packet: ReviewPacket): string {
  const lines = ["## Checks", ""];
  if (packet.checks.length === 0) {
    lines.push("No checks defined.");
  } else {
    for (const check of packet.checks) {
      const source = check.frontmatter.source
        ? ` — enforces \`${check.frontmatter.source}\``
        : "";
      lines.push(
        `- **${check.frontmatter.name}** (${check.frontmatter.severity})${source}`,
      );
    }
  }
  if (packet.invalid_checks.length > 0) {
    lines.push("", "Skipped (invalid):");
    for (const { file, message } of packet.invalid_checks) {
      lines.push(`- \`${file}\`: ${message}`);
    }
  }
  return lines.join("\n");
}

const GROUNDING_PROVENANCE_RANK = { own: 0, ancestor: 1, edge: 2 } as const;

function groundingProvenanceLabel(
  provenance: GraphSlice["nodes"][number]["provenance"],
): string {
  switch (provenance.kind) {
    case "own":
      return "own";
    case "ancestor":
      return `from \`${provenance.from}\``;
    case "edge":
      return provenance.via
        ? `${provenance.via} \`${provenance.from}\``
        : `relates \`${provenance.from}\``;
  }
}

function formatGroundingSection(packet: ReviewPacket): string {
  const lines = ["## Grounding", ""];
  if (packet.grounding.every((slice) => slice.nodes.length === 0)) {
    lines.push("No fingerprint grounding for the touched surfaces.");
    return lines.join("\n");
  }
  for (const slice of packet.grounding) {
    if (slice.nodes.length === 0) continue;
    lines.push(`### \`${slice.surface}\``, "");
    const ordered = [...slice.nodes].sort(
      (a, b) =>
        GROUNDING_PROVENANCE_RANK[a.provenance.kind] -
        GROUNDING_PROVENANCE_RANK[b.provenance.kind],
    );
    for (const node of ordered) {
      const tag = node.incarnation ? ` _(as ${node.incarnation})_` : "";
      lines.push(
        `- \`${node.id}\` (${groundingProvenanceLabel(node.provenance)})${tag}: ${node.body}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
