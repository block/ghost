import { join } from "node:path";
import type { GhostCatalogNode } from "#ghost-core";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type { LoadedFingerprintPackage } from "../scan/fingerprint-package.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import { type BaselineProse, resolveBaseline } from "./baseline.js";
import { type ProbeEvidence, runProbe } from "./probes.js";
import type { CoverageGap } from "./resolve.js";
import { resolveReview } from "./resolve.js";

export type { BaselineProse, ProbeEvidence };

export interface PacketMaterialNode {
  id: string;
  kind?: string;
  description?: string;
  prose: string;
  materials: string[];
  matchedMaterials: string[];
  files: string[];
}

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always";
  via: string[];
  prose: string;
  baseline: BaselineProse[];
  probe?: ProbeEvidence;
}

export interface ReviewPacket {
  fingerprintId: string;
  touchedFiles: string[];
  materialNodes: PacketMaterialNode[];
  checks: PacketCheck[];
  gaps: CoverageGap[];
  diff: string;
}

export interface BuildReviewPacketOptions {
  /** Absolute path of the fingerprint package directory (default: cwd/.ghost). */
  packageDir?: string;
  runProbes?: boolean;
  cwd?: string;
  probeTimeoutMs?: number;
}

export async function buildReviewPacket(
  fingerprint: LoadedFingerprintPackage,
  diffText: string,
  options: BuildReviewPacketOptions = {},
): Promise<ReviewPacket> {
  const cwd = options.cwd ?? process.cwd();
  const resolution = resolveReview(
    fingerprint.catalog,
    fingerprint.checks,
    diffText,
    {
      repoRoot: await resolveGitRoot(cwd),
      packageDir: options.packageDir ?? join(cwd, ".ghost"),
      materialsDir: GHOST_MATERIALS_DIR,
    },
  );

  const materialNodes: PacketMaterialNode[] = resolution.materialNodes.map(
    (matched) => materialNodeFromMatch(fingerprint, matched),
  );

  const checks: PacketCheck[] = await Promise.all(
    resolution.offeredChecks.map(async (offered) => {
      const check = fingerprint.checks.get(offered.id);
      const probeCommand = check?.doc.frontmatter.probe;
      const probe =
        options.runProbes !== false && probeCommand !== undefined
          ? await runProbe(probeCommand, {
              cwd: options.cwd ?? process.cwd(),
              timeoutMs: options.probeTimeoutMs,
            })
          : undefined;
      return {
        id: offered.id,
        severity: offered.severity,
        offered: offered.offered,
        via: offered.via,
        prose: check?.doc.body.trim() ?? "",
        baseline:
          check?.references
            .map((ref) => resolveBaseline(ref, fingerprint.catalog))
            .filter((ref): ref is BaselineProse => ref !== null) ?? [],
        ...(probe ? { probe } : {}),
      };
    }),
  );

  return {
    fingerprintId: fingerprint.manifest.id,
    touchedFiles: resolution.touchedFiles.map((file) => file.path),
    materialNodes,
    checks,
    gaps: resolution.gaps,
    diff: diffText,
  };
}

function materialNodeFromMatch(
  fingerprint: LoadedFingerprintPackage,
  matched: { id: string; locators: string[]; files: string[] },
): PacketMaterialNode {
  const node = fingerprint.catalog.nodes.get(matched.id) as GhostCatalogNode;
  return {
    id: node.id,
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.description !== undefined
      ? { description: node.description }
      : {}),
    prose: node.body,
    materials: node.materials ?? [],
    matchedMaterials: matched.locators,
    files: matched.files,
  };
}

export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# Ghost review — fingerprint \`${packet.fingerprintId}\``, "");
  out.push(
    "You are reviewing a diff against a Ghost fingerprint. The command has",
    "assembled the touched files, matched material-backed nodes, offered",
    "checks, and optional probe evidence. Probes are repo-owned shell commands",
    "with the same trust class as npm scripts; git review is the boundary.",
    "Weigh which checks apply. Do not invent obligations that are not grounded",
    "in the fingerprint prose or check text.",
    "",
  );

  if (packet.touchedFiles.length > 0) {
    out.push("## Touched files");
    for (const file of packet.touchedFiles) out.push(`- \`${file}\``);
    out.push("");
  }

  if (packet.materialNodes.length > 0) {
    out.push("## Matched material-backed nodes");
    for (const node of packet.materialNodes) {
      const kind = node.kind ? ` _(${node.kind})_` : "";
      out.push(`### \`${node.id}\`${kind}`);
      if (node.description) out.push(`_${node.description}_`, "");
      out.push(node.prose, "");
      out.push("Matched materials:");
      for (const locator of node.matchedMaterials) out.push(`- \`${locator}\``);
      out.push("Files:");
      for (const file of node.files) out.push(`- \`${file}\``);
      out.push("");
    }
  }

  out.push("## Offered checks — weigh which apply");
  if (packet.checks.length === 0) {
    out.push("_No checks were offered for this diff._", "");
  } else {
    for (const check of packet.checks) {
      out.push(
        `### checks/${check.id}${check.severity ? ` · ${check.severity}` : ""}`,
      );
      const refs = check.via.map((ref) => `\`${ref}\``).join(", ");
      out.push(
        check.offered === "matched"
          ? `Offered via material match: ${refs}`
          : `Always offered — no referenced material-backed node gates it: ${refs}`,
        "",
      );
      if (check.baseline.length > 0) {
        out.push("Baseline prose:");
        for (const baseline of check.baseline) {
          out.push(`- ${baseline.ref}`);
          if (baseline.warning) out.push(`  - ⚠ ${baseline.warning}`);
        }
        out.push("");
      }
      if (check.probe) {
        out.push(
          "Probe evidence (shell run by Ghost; evidence only, not a pass/fail verdict):",
          `- command: \`${check.probe.command}\``,
          `- exit code: ${check.probe.exitCode ?? "unknown"}${check.probe.timedOut ? " (timed out)" : ""}`,
          "- stdout:",
          "```",
          check.probe.stdout.trimEnd(),
          "```",
          "- stderr:",
          "```",
          check.probe.stderr.trimEnd(),
          "```",
          "",
        );
      }
      out.push(check.prose, "");
    }
  }

  if (packet.gaps.length > 0) {
    out.push("## Coverage gaps — report, do not grade");
    for (const gap of packet.gaps) {
      out.push(`- **${gap.kind}**: ${gap.detail}`);
      for (const file of gap.files ?? []) out.push(`  - \`${file}\``);
      for (const node of gap.nodes ?? []) out.push(`  - \`${node}\``);
    }
    out.push("");
  }

  out.push("## Diff", "```diff", packet.diff.trimEnd(), "```", "");
  out.push("## Produce findings");
  out.push(
    "For each applicable check, emit findings with severity, location, baseline,",
    "observable, and smallest coherent fix. If nothing drifts, say so plainly.",
  );
  return `${out.join("\n")}\n`;
}
