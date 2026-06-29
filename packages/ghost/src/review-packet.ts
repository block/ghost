import {
  groundSurface,
  type RoutedCheck,
  resolvePathToSurface,
  type SurfaceGrounding,
  selectChecksForSurfaces,
} from "#ghost-core";
import { discoverBindingsForPath } from "./scan/binding-discovery.js";
import { loadChecksDir } from "./scan/checks-dir.js";
import {
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./scan/fingerprint-package.js";
import { parseUnifiedDiff } from "./scan/unified-diff.js";

const DEFAULT_REVIEW_MAX_DIFF_BYTES = 200_000;

/**
 * Build an advisory review packet on the surface rails: resolve the diff's
 * changed paths to the surfaces that own them (bindings), select the markdown
 * checks governing those surfaces and their ancestors, and ground each in the
 * surface's fingerprint slice. No `validate.yml`, no dormant context entrypoint.
 */
export async function buildReviewPacket(options: {
  packageDir?: string;
  diffText: string;
  maxDiffBytes?: number;
}): Promise<ReviewPacket> {
  const cwd = process.cwd();
  const paths = resolveFingerprintPackage(options.packageDir, cwd);
  const loaded = await loadFingerprintPackage(paths);
  const { checks, invalid } = await loadChecksDir(paths.dir);

  const changedPaths = parseUnifiedDiff(options.diffText).map(
    (file) => file.path,
  );

  // Resolve each changed path to its surface via bindings; union them.
  const touched = new Set<string>();
  for (const path of changedPaths) {
    const discovered = await discoverBindingsForPath(path, cwd);
    const resolution = resolvePathToSurface(
      discovered.target_path,
      discovered.candidates,
      { hasRootContract: discovered.hasRootContract || !!loaded.surfaces },
    );
    if (resolution.surface) touched.add(resolution.surface);
  }

  const routed = selectChecksForSurfaces(checks, loaded.surfaces, [...touched]);
  const grounding = [...touched].map((surface) =>
    groundSurface(loaded.surfaces, loaded.fingerprint, surface),
  );

  return {
    ...baseReviewPacket(paths.dir, options.diffText, {
      maxDiffBytes: options.maxDiffBytes,
    }),
    touched_surfaces: [...touched],
    routed_checks: routed,
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
      "routed check when blocking",
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
  routed_checks: RoutedCheck[];
  grounding: SurfaceGrounding[];
  invalid_checks: Array<{ file: string; message: string }>;
}

export function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to a routed check. Keep findings grounded in the touched surfaces' principles, contracts, patterns, exemplars, and routed checks; do not expand the review into unrelated audit categories.

Use the surface grounding first: why (principles, contracts) → what good looks like (patterns, exemplars). When a surface's grounding is silent, label the reasoning provisional or report missing-fingerprint / experience-gap instead of pretending the fingerprint is more specific than it is.

Use these finding categories: ${packet.finding_categories.join(", ")}.

${formatReviewBudgetSection(packet)}

When a surface's grounding is silent, local evidence can still support advisory critique. Label those findings as provisional and non-Ghost-backed, and ground them in nearby product surfaces, local components, token or copy conventions. Ask the human before assessing high-risk, irreversible, privacy/security/legal, or product-surface-defining choices.

If the diff exposes missing fingerprint grounding or surface coverage, report it as missing-fingerprint or experience-gap. Do not silently rewrite the Ghost package during review; fingerprint and check edits are ordinary Git-reviewed edits.

${formatTouchedSurfacesSection(packet)}

${formatRoutedChecksSection(packet)}

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

function formatRoutedChecksSection(packet: ReviewPacket): string {
  const lines = ["## Routed Checks", ""];
  if (packet.routed_checks.length === 0) {
    lines.push("No checks govern the touched surfaces.");
  } else {
    for (const { check, relevance } of packet.routed_checks) {
      const why =
        relevance.kind === "own"
          ? `own \`${relevance.surface}\``
          : `inherited from \`${relevance.surface}\` (via \`${relevance.via}\`)`;
      lines.push(
        `- **${check.frontmatter.name}** (${check.frontmatter.severity}) — ${why}`,
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

function formatGroundingSection(packet: ReviewPacket): string {
  const lines = ["## Grounding", ""];
  if (
    packet.grounding.every((g) => g.why.length === 0 && g.what.length === 0)
  ) {
    lines.push("No fingerprint grounding for the touched surfaces.");
    return lines.join("\n");
  }
  for (const surface of packet.grounding) {
    if (surface.why.length === 0 && surface.what.length === 0) continue;
    lines.push(`### \`${surface.surface}\``);
    if (surface.why.length > 0) {
      lines.push("", "Why:");
      for (const item of surface.why) {
        lines.push(`- ${item.statement} (\`${item.ref}\`)`);
      }
    }
    if (surface.what.length > 0) {
      lines.push("", "What good looks like:");
      for (const item of surface.what) {
        const where = item.path ? ` — \`${item.path}\`` : "";
        lines.push(`- ${item.statement}${where} (\`${item.ref}\`)`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
