import type { GhostCatalogNode } from "#ghost-core";
import type { LoadedFingerprintPackage } from "../scan/fingerprint-package.js";
import { type BaselineProse, resolveBaseline } from "./baseline.js";
import type { CoverageGap } from "./resolve.js";
import { resolveReview } from "./resolve.js";

export type { BaselineProse };

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
}

export interface ReviewPacket {
  fingerprintId: string;
  touchedFiles: string[];
  materialNodes: PacketMaterialNode[];
  checks: PacketCheck[];
  gaps: CoverageGap[];
  diff: string;
}

export function buildReviewPacket(
  fingerprint: LoadedFingerprintPackage,
  diffText: string,
): ReviewPacket {
  const resolution = resolveReview(
    fingerprint.catalog,
    fingerprint.checks,
    diffText,
  );

  const materialNodes: PacketMaterialNode[] = resolution.materialNodes.map(
    (matched) => {
      const node = fingerprint.catalog.nodes.get(
        matched.id,
      ) as GhostCatalogNode;
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
    },
  );

  const checks: PacketCheck[] = resolution.offeredChecks.map((offered) => {
    const check = fingerprint.checks.get(offered.id);
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
    };
  });

  return {
    fingerprintId: fingerprint.manifest.id,
    touchedFiles: resolution.touchedFiles.map((file) => file.path),
    materialNodes,
    checks,
    gaps: resolution.gaps,
    diff: diffText,
  };
}

export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# Ghost review — fingerprint \`${packet.fingerprintId}\``, "");
  out.push(
    "You are reviewing a diff against a Ghost fingerprint. The command has",
    "assembled the touched files, matched material-backed nodes, and offered",
    "checks. Weigh which checks apply. Do not invent obligations that are not",
    "grounded in the fingerprint prose or check text.",
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
        `### haunts/checks/${check.id}${check.severity ? ` · ${check.severity}` : ""}`,
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
