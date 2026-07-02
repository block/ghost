import type { BaselineProse } from "../baseline/resolve.js";
import { resolveBaseline } from "../baseline/resolve.js";
import type { BridgeResolution } from "../bridge/resolve.js";
import { resolveBridge } from "../bridge/resolve.js";
import type { LoadedFingerprintPackage } from "../fingerprint/load.js";
import { classifyReference } from "../model/ids.js";
import type { HauntPackage } from "../model/types.js";

/**
 * The advisory review packet. Deterministic assembly only — the CLI gathers
 * the evidence, the host agent renders the findings (P0–P3, evidence cited).
 * Haunt does not grade.
 *
 * For each offered check we assemble:
 *   - the check's prose (what to grade)
 *   - the referenced prose (local inventory, or fingerprint node bodies —
 *     sliced to the anchored heading section)   → the BASELINE
 *   - the matched code facts via inventory       → the OBSERVABLE
 *   - the diff hunks                              → what changed
 */
export type { BaselineProse };

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  referencesFingerprint: boolean;
  /** Refs that put this check in play. */
  via: string[];
  /** The check's own prose (the assertion to grade). */
  prose: string;
  /** The referenced baseline prose this check enforces. */
  baseline: BaselineProse[];
}

export interface PacketInventory {
  id: string;
  description?: string;
  /** The material's prose (what it is / how it should behave). */
  prose: string;
  /** Touched files that matched this material's `paths`. */
  files: string[];
}

export interface PacketFingerprintNode {
  /** The reference string that pulled this node in. */
  ref: string;
  nodeId: string;
  heading?: string;
  description?: string;
  /** The node body — sliced to the anchored section when a heading matched. */
  body: string;
  warning?: string;
}

export interface ReviewPacket {
  packageId: string;
  fingerprintId: string;
  touchedFiles: string[];
  /** Matched materials with prose + the code facts (files). */
  inventory: PacketInventory[];
  /** The fingerprint truths in play — resolved from the offered checks' refs. */
  fingerprint: PacketFingerprintNode[];
  /** Offered checks with prose + baseline. The agent decides relevance. */
  checks: PacketCheck[];
  /** Coverage gaps — where the fingerprint cannot grade. */
  gaps: BridgeResolution["gaps"];
  /** The raw diff, embedded verbatim. */
  diff: string;
}

export function buildReviewPacket(
  pkg: HauntPackage,
  fingerprint: LoadedFingerprintPackage,
  diffText: string,
): ReviewPacket {
  const res = resolveBridge(pkg, diffText);
  const localIds = new Set(pkg.inventory.keys());

  const fingerprintNodes = new Map<string, PacketFingerprintNode>();

  const checks: PacketCheck[] = res.offeredChecks.map((offered) => {
    const check = pkg.checks.get(offered.id);
    const baseline: BaselineProse[] = [];
    for (const raw of check?.references ?? []) {
      const resolved = resolveBaseline(raw, pkg, fingerprint, localIds);
      if (resolved === null) continue;
      baseline.push(resolved);
      if (resolved.kind === "fingerprint" && !fingerprintNodes.has(raw)) {
        const parsed = classifyReference(raw, localIds);
        if (parsed.kind === "fingerprint") {
          fingerprintNodes.set(raw, {
            ref: raw,
            nodeId: parsed.nodeId,
            ...(parsed.heading !== undefined
              ? { heading: parsed.heading }
              : {}),
            ...(resolved.description !== undefined
              ? { description: resolved.description }
              : {}),
            body: resolved.body,
            ...(resolved.warning !== undefined
              ? { warning: resolved.warning }
              : {}),
          });
        }
      }
    }
    return {
      id: offered.id,
      severity: offered.severity,
      referencesFingerprint: offered.referencesFingerprint,
      via: offered.via,
      prose: check?.body ?? "",
      baseline,
    };
  });

  const inventory: PacketInventory[] = res.inventory.map((m) => {
    const doc = pkg.inventory.get(m.id);
    return {
      id: m.id,
      ...(doc?.frontmatter.description !== undefined
        ? { description: doc.frontmatter.description }
        : {}),
      prose: doc?.body ?? "",
      files: m.files,
    };
  });

  return {
    packageId: pkg.manifest.id,
    fingerprintId: fingerprint.manifest.id,
    touchedFiles: res.touchedFiles.map((f) => f.path),
    inventory,
    fingerprint: [...fingerprintNodes.values()],
    checks,
    gaps: res.gaps,
    diff: diffText,
  };
}

/**
 * Render the packet as an agent-facing markdown prompt: the evidence, the
 * offered checks, the coverage gaps, and instructions to produce P0–P3 findings
 * with cited evidence. Advisory — the agent decides.
 */
export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# Haunt review — package \`${packet.packageId}\``);
  out.push("");
  out.push(
    "You are grading **high-altitude compositional drift**: hierarchy collapsing,",
    "density creeping, restraint eroding — the drift linters can't see. The prose",
    "below is the **baseline** (stated composition); the diff is what changed; the",
    "matched files are the **observable**. Weigh which offered checks apply — every",
    "check is offered, you decide relevance. Do not grade what no check covers; note",
    "it as a gap instead.",
    "",
  );

  if (packet.touchedFiles.length > 0) {
    out.push("## Touched files");
    for (const f of packet.touchedFiles) out.push(`- \`${f}\``);
    out.push("");
  }

  if (packet.inventory.length > 0) {
    out.push("## Matched materials (inventory → code)");
    for (const inv of packet.inventory) {
      out.push(`### inventory/${inv.id}`);
      if (inv.description) out.push(`_${inv.description}_`, "");
      out.push(inv.prose, "");
      out.push("Files:");
      for (const f of inv.files) out.push(`- \`${f}\``);
      out.push("");
    }
  }

  if (packet.fingerprint.length > 0) {
    out.push(
      `## Fingerprint truths in play (.ghost/ \`${packet.fingerprintId}\`)`,
    );
    for (const node of packet.fingerprint) {
      out.push(`### ${node.ref}`);
      if (node.description) out.push(`_${node.description}_`, "");
      if (node.warning) out.push(`> ⚠ ${node.warning}`, "");
      out.push(node.body, "");
    }
  }

  out.push("## Offered checks — weigh which apply");
  if (packet.checks.length === 0) {
    out.push("_No checks were offered for this diff._", "");
  } else {
    for (const c of packet.checks) {
      const kind = c.referencesFingerprint ? "high-altitude" : "structural";
      out.push(
        `### checks/${c.id}${c.severity ? ` · ${c.severity}` : ""} · ${kind}`,
      );
      out.push(`Offered via: ${c.via.map((v) => `\`${v}\``).join(", ")}`, "");
      out.push(c.prose, "");
    }
  }

  if (packet.gaps.length > 0) {
    out.push("## Coverage gaps — ungraded (report, do not grade)");
    for (const g of packet.gaps) {
      out.push(`- **${g.kind}**: ${g.detail}`);
      for (const f of g.files ?? []) out.push(`  - \`${f}\``);
    }
    out.push("");
  }

  out.push("## Diff");
  out.push("```diff", packet.diff.trimEnd(), "```", "");

  out.push("## Produce findings");
  out.push(
    "For each applicable check, emit a finding:",
    "- **Severity**: P0 (blocks primary task / severe) · P1 (likely failure / misleading)",
    "  · P2 (meaningful friction, weak hierarchy) · P3 (minor craft).",
    "- **Location**: file:line or the material it concerns.",
    "- **Baseline**: the referenced prose it diverges from.",
    "- **Observable**: what the diff does that pulls away from the baseline.",
    "- **Fix**: the smallest coherent change.",
    "Lead with the highest-severity findings. If nothing drifts, say so plainly.",
  );

  return out.join("\n");
}
