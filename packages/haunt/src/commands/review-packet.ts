import type { BridgeResolution } from "../bridge/resolve.js";
import { resolveBridge } from "../bridge/resolve.js";
import type { HauntPackage } from "../model/types.js";

/**
 * The advisory review packet (Slice 4). Deterministic assembly only — the CLI
 * gathers the evidence, the host agent renders the findings (P0–P3, evidence
 * cited). Haunt does not grade. The packet is the payload behind the "oh" demo.
 *
 * For each offered check we assemble the three things the synthesis names:
 *   - the check's prose (what to grade)
 *   - the grounded tenet/surface prose      → the BASELINE (stated composition)
 *   - the matched code facts via inventory  → the OBSERVABLE (what code now does)
 *   - the diff hunks                         → what changed
 */
export interface GroundedProse {
  ref: string;
  description?: string;
  body: string;
}

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  groundsTenet: boolean;
  /** Refs that put this check in play. */
  via: string[];
  /** The check's own prose (the assertion to grade). */
  prose: string;
  /** The grounded baseline prose this check enforces. */
  baseline: GroundedProse[];
}

export interface PacketInventory {
  id: string;
  description?: string;
  /** The material's prose (what it is / how it should behave). */
  prose: string;
  /** Touched files that matched this material's `paths`. */
  files: string[];
}

export interface ReviewPacket {
  packageId: string;
  touchedFiles: string[];
  /** Matched materials with prose + the code facts (files). */
  inventory: PacketInventory[];
  surfaces: GroundedProse[];
  tenets: GroundedProse[];
  /** Offered checks with prose + baseline. The agent judges relevance. */
  checks: PacketCheck[];
  /** Coverage gaps — where the fingerprint cannot grade. */
  gaps: BridgeResolution["gaps"];
  /** The raw diff, embedded verbatim. */
  diff: string;
}

export function buildReviewPacket(
  pkg: HauntPackage,
  diffText: string,
): ReviewPacket {
  const res = resolveBridge(pkg, diffText);

  const groundedFor = (ref: string): GroundedProse | null => {
    const slash = ref.indexOf("/");
    const tier = ref.slice(0, slash);
    const id = ref.slice(slash + 1);
    const bucket =
      tier === "tenets"
        ? pkg.tenets
        : tier === "surfaces"
          ? pkg.surfaces
          : pkg.inventory;
    const doc = bucket.get(id);
    if (!doc) return null;
    return { ref, description: doc.frontmatter.description, body: doc.body };
  };

  const checks: PacketCheck[] = res.offeredChecks.map((offered) => {
    const check = pkg.checks.get(offered.id);
    return {
      id: offered.id,
      severity: offered.severity,
      groundsTenet: offered.groundsTenet,
      via: offered.via,
      prose: check?.body ?? "",
      baseline: (check?.frontmatter.grounds ?? [])
        .map(groundedFor)
        .filter((g): g is GroundedProse => g !== null),
    };
  });

  const inventory: PacketInventory[] = res.inventory.map((m) => {
    const doc = pkg.inventory.get(m.id);
    return {
      id: m.id,
      description: doc?.frontmatter.description,
      prose: doc?.body ?? "",
      files: m.files,
    };
  });

  const surfaces = res.surfaces
    .map((id) => groundedFor(`surfaces/${id}`))
    .filter((g): g is GroundedProse => g !== null);
  const tenets = res.tenets
    .map((id) => groundedFor(`tenets/${id}`))
    .filter((g): g is GroundedProse => g !== null);

  return {
    packageId: pkg.manifest.id,
    touchedFiles: res.touchedFiles.map((f) => f.path),
    inventory,
    surfaces,
    tenets,
    checks,
    gaps: res.gaps,
    diff: diffText,
  };
}

/**
 * Render the packet as an agent-facing markdown prompt: the evidence, the
 * offered checks, the coverage gaps, and instructions to produce P0–P3 findings
 * with cited evidence (an evidence-cited finding format). Advisory — the agent judges.
 */
export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# Haunt review — package \`${packet.packageId}\``);
  out.push("");
  out.push(
    "You are grading **high-altitude compositional drift**: hierarchy collapsing,",
    "density creeping, restraint eroding — the drift linters can't see. The prose",
    "below is the **baseline** (stated composition); the diff is what changed; the",
    "matched files are the **observable**. Judge which offered checks apply — every",
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

  if (packet.tenets.length > 0 || packet.surfaces.length > 0) {
    out.push("## Baseline prose in play");
    for (const t of packet.tenets) {
      out.push(`### ${t.ref}`);
      if (t.description) out.push(`_${t.description}_`, "");
      out.push(t.body, "");
    }
    for (const s of packet.surfaces) {
      out.push(`### ${s.ref}`);
      if (s.description) out.push(`_${s.description}_`, "");
      out.push(s.body, "");
    }
  }

  out.push("## Offered checks — judge which apply");
  if (packet.checks.length === 0) {
    out.push("_No checks were offered for this diff._", "");
  } else {
    for (const c of packet.checks) {
      const kind = c.groundsTenet ? "high-altitude (judgment)" : "structural";
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
    "- **Baseline**: the grounded prose ref it diverges from.",
    "- **Observable**: what the diff does that pulls away from the baseline.",
    "- **Fix**: the smallest coherent change.",
    "Lead with the highest-severity findings. If nothing drifts, say so plainly.",
  );

  return out.join("\n");
}
