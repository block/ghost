import type { BaselineProse } from "../baseline/resolve.js";
import { resolveBaseline } from "../baseline/resolve.js";
import { matchesGlob } from "../bridge/glob.js";
import { partitionInventory } from "../bridge/tree.js";
import type { LoadedFingerprintPackage } from "../fingerprint/load.js";
import { classifyReference } from "../model/ids.js";
import type { HauntCheck, HauntPackage } from "../model/types.js";
import type { PacketFingerprintNode } from "./review-packet.js";

/**
 * The integrity packet — the audit tense of the review packet. Review grades
 * a change; integrity grades the whole: does what we own still cohere with
 * what we said, and with itself?
 *
 * The packet is a **map, not a payload**: it embeds authored prose only
 * (material prose, check prose, resolved baselines) and points at code with
 * glob pointers plus mechanically-verified match counts. No embedded file
 * lists — the host agent (BYOA, has file tools) explores from the pointers.
 */

/** One inventory `paths` glob with its mechanically-verified match count. */
export interface IntegrityGlobPointer {
  glob: string;
  /** How many tracked repo files the glob matches (0 → dead-paths gap). */
  matches: number;
}

/** A check bound into a material section (or the global section). */
export interface IntegrityCheck {
  id: string;
  severity: string | undefined;
  referencesFingerprint: boolean;
  /** The references that bound this check here. */
  via: string[];
  /** The check's own prose (the assertion to grade). */
  prose: string;
  /** The referenced baseline prose this check enforces. */
  baseline: BaselineProse[];
}

/** A sibling material — a pointer (id + description + paths), never a body. */
export interface IntegritySibling {
  id: string;
  description?: string;
  paths: string[];
}

/** One material's section: pointers, prose, bound checks, siblings. */
export interface IntegrityMaterial {
  id: string;
  description?: string;
  /** The material's prose (what it is / how it should behave). */
  prose: string;
  /** The material's `paths` globs with match counts — pointers, not files. */
  paths: IntegrityGlobPointer[];
  /** Total tracked files the material's globs claim. */
  fileCount: number;
  /** Every check whose `references` names this material. */
  checks: IntegrityCheck[];
  /** The other materials, as pointers — the relational shape of the audit. */
  siblings: IntegritySibling[];
}

/** A place where the audit cannot grade — report, do not grade. */
export interface IntegrityGap {
  kind: "dead-paths" | "unreferenced-material";
  detail: string;
  /** The material ids the gap concerns. */
  materials: string[];
}

export interface IntegrityPacket {
  fingerprintId: string;
  /** Per-material sections — the packet's internal structure. */
  materials: IntegrityMaterial[];
  /** The fingerprint truths in play — resolved from the checks' refs. */
  fingerprint: PacketFingerprintNode[];
  /** Checks referencing no material — offered globally, listed once. */
  globalChecks: IntegrityCheck[];
  /** Where the audit cannot grade — the anti-rot signal. */
  gaps: IntegrityGap[];
}

interface ClassifiedCheck {
  check: HauntCheck;
  localRefs: Map<string, string>;
  referencesFingerprint: boolean;
}

function buildCheckEntry(
  classified: ClassifiedCheck,
  via: string[],
  pkg: HauntPackage,
  fingerprint: LoadedFingerprintPackage,
  localIds: ReadonlySet<string>,
  fingerprintNodes: Map<string, PacketFingerprintNode>,
): IntegrityCheck {
  const { check, referencesFingerprint } = classified;
  const baseline: BaselineProse[] = [];
  for (const raw of check.references) {
    const resolved = resolveBaseline(raw, pkg, fingerprint, localIds);
    if (resolved === null) continue;
    baseline.push(resolved);
    if (resolved.kind === "fingerprint" && !fingerprintNodes.has(raw)) {
      const parsed = classifyReference(raw, localIds);
      if (parsed.kind === "fingerprint") {
        fingerprintNodes.set(raw, {
          ref: raw,
          nodeId: parsed.nodeId,
          ...(parsed.heading !== undefined ? { heading: parsed.heading } : {}),
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
    id: check.id,
    severity: check.frontmatter.severity,
    referencesFingerprint,
    via,
    prose: check.body,
    baseline,
  };
}

/**
 * Assemble the integrity packet: partition the repo tree by inventory
 * `paths`, bind each material to its prose, the checks that reference it
 * (with resolved baselines — a check referencing several materials appears
 * in each of their sections), and its sibling materials as pointers.
 * Fingerprint-only checks go to the global section. Dead globs and
 * unreferenced materials surface as gaps.
 */
export function buildIntegrityPacket(
  pkg: HauntPackage,
  fingerprint: LoadedFingerprintPackage,
  files: readonly string[],
): IntegrityPacket {
  const localIds = new Set(pkg.inventory.keys());
  const partition = partitionInventory(pkg, files);
  const fingerprintNodes = new Map<string, PacketFingerprintNode>();

  // Classify every check once: which materials it binds to, whether it
  // touches the fingerprint.
  const classified: ClassifiedCheck[] = [...pkg.checks.values()].map(
    (check) => {
      const localRefs = new Map<string, string>();
      let referencesFingerprint = false;
      for (const raw of check.references) {
        const ref = classifyReference(raw, localIds);
        if (ref.kind === "local") {
          localRefs.set(ref.id, raw);
        } else if (ref.kind === "fingerprint") {
          referencesFingerprint = true;
        }
      }
      return { check, localRefs, referencesFingerprint };
    },
  );

  const referencedMaterials = new Set<string>();
  for (const c of classified) {
    for (const id of c.localRefs.keys()) referencedMaterials.add(id);
  }

  const materials: IntegrityMaterial[] = [...pkg.inventory.values()].map(
    (inv) => {
      const globs = inv.frontmatter.paths ?? [];
      const matched = partition.get(inv.id) ?? [];
      const paths: IntegrityGlobPointer[] = globs.map((glob) => ({
        glob,
        matches: matched.filter((f) => matchesGlob(glob, f)).length,
      }));
      const checks = classified
        .filter((c) => c.localRefs.has(inv.id))
        .map((c) =>
          buildCheckEntry(
            c,
            [c.localRefs.get(inv.id) as string],
            pkg,
            fingerprint,
            localIds,
            fingerprintNodes,
          ),
        );
      const siblings: IntegritySibling[] = [...pkg.inventory.values()]
        .filter((other) => other.id !== inv.id)
        .map((other) => ({
          id: other.id,
          ...(other.frontmatter.description !== undefined
            ? { description: other.frontmatter.description }
            : {}),
          paths: other.frontmatter.paths ?? [],
        }));
      return {
        id: inv.id,
        ...(inv.frontmatter.description !== undefined
          ? { description: inv.frontmatter.description }
          : {}),
        prose: inv.body,
        paths,
        fileCount: matched.length,
        checks,
        siblings,
      };
    },
  );

  const globalChecks = classified
    .filter((c) => c.localRefs.size === 0)
    .map((c) =>
      buildCheckEntry(
        c,
        c.check.references.slice(),
        pkg,
        fingerprint,
        localIds,
        fingerprintNodes,
      ),
    );

  const gaps: IntegrityGap[] = [];
  const dead = materials.filter((m) => m.fileCount === 0).map((m) => m.id);
  if (dead.length > 0) {
    gaps.push({
      kind: "dead-paths",
      detail:
        "these materials' `paths` globs match zero tracked repo files — the map has rotted away from the territory",
      materials: dead,
    });
  }
  const unreferenced = materials
    .filter((m) => !referencedMaterials.has(m.id))
    .map((m) => m.id);
  if (unreferenced.length > 0) {
    gaps.push({
      kind: "unreferenced-material",
      detail:
        "no check references these materials — they are unguarded against sprawl",
      materials: unreferenced,
    });
  }

  return {
    fingerprintId: fingerprint.manifest.id,
    materials,
    fingerprint: [...fingerprintNodes.values()],
    globalChecks,
    gaps,
  };
}

function renderCheck(out: string[], c: IntegrityCheck, heading: string): void {
  const kind = c.referencesFingerprint ? "high-altitude" : "structural";
  out.push(
    `${heading} checks/${c.id}${c.severity ? ` · ${c.severity}` : ""} · ${kind}`,
  );
  out.push(`Bound via: ${c.via.map((v) => `\`${v}\``).join(", ")}`, "");
  out.push(c.prose, "");
  for (const b of c.baseline) {
    out.push(`${heading}# Baseline: ${b.ref} (${b.kind})`);
    if (b.description) out.push(`_${b.description}_`, "");
    if (b.warning) out.push(`> ⚠ ${b.warning}`, "");
    out.push(b.body, "");
  }
}

/**
 * Render the packet as an agent-facing markdown prompt: the preamble (two
 * baselines, five axes as orientation), per-material sections, the
 * fingerprint truths, the global checks, and the gaps. Advisory — the agent
 * decides.
 */
export function formatIntegrityPacket(packet: IntegrityPacket): string {
  const out: string[] = [];
  out.push(`# Haunt integrity — fingerprint \`${packet.fingerprintId}\``);
  out.push("");
  out.push(
    "You are auditing the **whole inventory** for sprawl: the design system",
    "quietly stopping being one system. Review grades a change; integrity grades",
    "the whole. Grade each material against **two baselines**:",
    "",
    "1. **The stated truths** — the fingerprint prose and check baselines below.",
    "2. **The inventory's own pattern** — how the sibling materials solve the same",
    "   job. The pattern is latent in the corpus; sensing it is your job. Is this",
    "   material (or a recent addition to it) on pattern, or an outlier? An",
    "   outlier finding must **name the pattern it breaks**.",
    "",
    "Five sprawl axes, as orientation (not grading instructions):",
    "**contract congruence** (do equivalent components expose congruent props/APIs?),",
    "**naming coherence** (does naming follow the corpus and the glossary?),",
    "**token discipline** (hardcoded values where tokens exist?),",
    "**variant proliferation** (near-duplicate variants accumulating?),",
    "**pattern forks** (the same composition solved two different ways?).",
    "",
    "This packet is a **map, not a payload**: globs point at code with verified",
    "match counts; read the actual files yourself. Weigh which bound checks",
    "apply — every check is offered, you decide relevance.",
    "Do not grade what no check covers; note it as a gap instead.",
    "",
  );

  for (const m of packet.materials) {
    out.push(`## Material: inventory/${m.id}`);
    if (m.description) out.push(`_${m.description}_`, "");
    out.push(
      `Paths (${m.fileCount} tracked file${m.fileCount === 1 ? "" : "s"} total):`,
    );
    for (const p of m.paths) {
      out.push(
        `- \`${p.glob}\` — ${p.matches} file${p.matches === 1 ? "" : "s"}`,
      );
    }
    out.push("");
    out.push(m.prose, "");

    if (m.checks.length === 0) {
      out.push("_No check references this material — see gaps._", "");
    } else {
      for (const c of m.checks) renderCheck(out, c, "###");
    }

    if (m.siblings.length > 0) {
      out.push("### Siblings (pointers — pull whatever depth you need)");
      for (const s of m.siblings) {
        const desc = s.description ? ` — ${s.description}` : "";
        const paths = s.paths.map((p) => `\`${p}\``).join(", ");
        out.push(`- **${s.id}**${desc}${paths ? ` (${paths})` : ""}`);
      }
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

  if (packet.globalChecks.length > 0) {
    out.push("## Fingerprint-only checks — in play across the whole surface");
    for (const c of packet.globalChecks) renderCheck(out, c, "###");
  }

  if (packet.gaps.length > 0) {
    out.push("## Gaps — ungraded (report, do not grade)");
    for (const g of packet.gaps) {
      out.push(`- **${g.kind}**: ${g.detail}`);
      for (const id of g.materials) out.push(`  - \`inventory/${id}\``);
    }
    out.push("");
  }

  out.push("## Produce findings");
  out.push(
    "Group findings **per material**. For each finding:",
    "- **Severity**: P0 (blocks primary task / severe) · P1 (likely failure / misleading)",
    "  · P2 (meaningful friction, weak hierarchy) · P3 (minor craft).",
    "- **Location**: file:line or the material it concerns.",
    "- **Baseline**: the stated truth it diverges from — or, for outlier findings,",
    "  the latent sibling pattern it breaks (name the pattern).",
    "- **Observable**: what the code does that pulls away from the baseline.",
    "- **Fix**: the smallest coherent change.",
    "Lead with the highest-severity findings. If the inventory coheres, say so plainly.",
  );

  return out.join("\n");
}
