import {
  classifyMaterialLocator,
  closestIds,
  type GhostCatalogNode,
  type GhostMaterial,
  normalizeMaterial,
  resolveLocalMaterialLocator,
  type TransportedMaterial,
  transportMaterials,
} from "#ghost-core";
import type { PullMiss } from "../observability-events.js";
import type { LoadedCheck } from "../scan/check-files.js";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type { LoadedGhostPackage } from "../scan/fingerprint-package.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import {
  neutralizeSentinels,
  untrustedBegin,
  untrustedEnd,
} from "../untrusted-framing.js";
import { parseTouchedFiles } from "./diff.js";
import {
  type GuidanceExcerpt,
  resolveGuidanceExcerpt,
} from "./guidance-excerpt.js";

export type { GuidanceExcerpt };

export interface PacketCheck {
  id: string;
  context: string;
  severity: string;
  references: string[];
  body: string;
}

export interface ReviewPacket {
  kind: "review";
  packageId: string;
  requested?: string[];
  missed?: PullMiss[];
  touchedFiles: string[];
  checks: PacketCheck[];
  guidance: GuidanceExcerpt[];
  materials: TransportedMaterial[];
  diff: string;
  untrusted: true;
}

export interface BuildReviewPacketOptions {
  /** Absolute path of the ghost package directory (default: cwd/.ghost). */
  packageDir?: string;
  cwd?: string;
  ids?: readonly string[];
  inlineMaterials?: boolean;
}

export async function buildReviewPacket(
  ghostPackage: LoadedGhostPackage,
  diffText: string,
  options: BuildReviewPacketOptions = {},
): Promise<ReviewPacket> {
  const cwd = options.cwd ?? process.cwd();
  const packageDir = options.packageDir ?? `${cwd}/.ghost`;
  const repoRoot = await resolveGitRoot(cwd);
  const selected = selectChecks(ghostPackage.checks, options.ids);
  const guidance = resolveGuidanceExcerpts(selected.checks, ghostPackage);
  const materials = await resolveReviewMaterials(
    guidance,
    ghostPackage,
    repoRoot,
    packageDir,
    options.inlineMaterials !== false,
  );

  return {
    kind: "review",
    packageId: ghostPackage.manifest.id,
    ...(selected.requested.length > 0 ? { requested: selected.requested } : {}),
    ...(selected.missed.length > 0 ? { missed: selected.missed } : {}),
    touchedFiles: parseTouchedFiles(diffText).map((file) => file.path),
    checks: selected.checks.map((check) => ({
      id: check.id,
      context: check.doc.frontmatter.context,
      severity: check.doc.frontmatter.severity,
      references: [...check.doc.frontmatter.references],
      body: check.doc.body.trim(),
    })),
    guidance,
    materials,
    diff: diffText,
    untrusted: true,
  };
}

function selectChecks(
  checks: ReadonlyMap<string, LoadedCheck>,
  ids: readonly string[] | undefined,
): { requested: string[]; missed: PullMiss[]; checks: LoadedCheck[] } {
  const allIds = [...checks.keys()];
  if (ids === undefined || ids.length === 0) {
    return {
      requested: [],
      missed: [],
      checks: allIds.map((id) => checks.get(id) as LoadedCheck),
    };
  }

  const requested = [...new Set(ids)];
  const selected: LoadedCheck[] = [];
  const missed: PullMiss[] = [];
  for (const id of requested) {
    const check = checks.get(id);
    if (check === undefined) {
      missed.push({ requested: id, suggested: closestIds(id, allIds) });
      continue;
    }
    selected.push(check);
  }
  return { requested, missed, checks: selected };
}

function resolveGuidanceExcerpts(
  checks: readonly LoadedCheck[],
  ghostPackage: LoadedGhostPackage,
): GuidanceExcerpt[] {
  const guidance: GuidanceExcerpt[] = [];
  const seen = new Set<string>();
  for (const check of checks) {
    for (const ref of check.doc.frontmatter.references) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      const excerpt = resolveGuidanceExcerpt(ref, ghostPackage.catalog);
      if (excerpt !== null) guidance.push(excerpt);
    }
  }
  return guidance;
}

async function resolveReviewMaterials(
  guidance: readonly GuidanceExcerpt[],
  ghostPackage: LoadedGhostPackage,
  repoRoot: string,
  packageDir: string,
  inlineMaterials: boolean,
): Promise<TransportedMaterial[]> {
  const declarations = dedupeMaterialDeclarations(guidance, ghostPackage);
  if (!inlineMaterials) {
    return locatorOnlyMaterials(declarations, repoRoot, packageDir);
  }
  const transported = await transportMaterials(declarations, {
    repoRoot,
    packageDir,
    materialsDir: GHOST_MATERIALS_DIR,
  });
  return transported.materials;
}

function dedupeMaterialDeclarations(
  guidance: readonly GuidanceExcerpt[],
  ghostPackage: LoadedGhostPackage,
): GhostMaterial[] {
  const declarations: GhostMaterial[] = [];
  const seen = new Set<string>();
  for (const excerpt of guidance) {
    const node = ghostPackage.catalog.nodes.get(excerpt.nodeId) as
      | GhostCatalogNode
      | undefined;
    for (const declaration of node?.materials ?? []) {
      const { locator } = normalizeMaterial(declaration);
      if (seen.has(locator)) continue;
      seen.add(locator);
      declarations.push(declaration);
    }
  }
  return declarations;
}

function locatorOnlyMaterials(
  declarations: readonly GhostMaterial[],
  repoRoot: string,
  packageDir: string,
): TransportedMaterial[] {
  return declarations.map((declaration) => {
    const { locator, note } = normalizeMaterial(declaration);
    return {
      locator,
      ...(note !== undefined ? { note } : {}),
      tier:
        classifyMaterialLocator(locator).kind === "url"
          ? "url"
          : resolveLocalMaterialLocator(locator, {
              repoRoot,
              packageDir,
              materialsDir: GHOST_MATERIALS_DIR,
            }).tier,
    };
  });
}

export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# ghost review: package \`${packet.packageId}\``, "");
  out.push(
    "This is a one-shot grounded review packet. The host agent judges check applicability at evaluation time. When uncertain, evaluate. Findings must be grounded in the cited guidance, not inferred from taste or the diff alone. Recurring findings are authoring signals: when the same check fires repeatedly across changes, fix the guidance node upstream rather than re-fixing outputs.",
    "",
  );

  out.push("## Touched files");
  if (packet.touchedFiles.length === 0) {
    out.push("_No touched files were parsed from the diff._");
  } else {
    for (const file of packet.touchedFiles) out.push(`- \`${file}\``);
  }
  out.push("");

  out.push("## Checks");
  if (packet.checks.length === 0) {
    out.push("_No checks are in this packet._", "");
  } else {
    for (const check of packet.checks) {
      out.push(`### checks/${check.id} · ${check.severity}`, "");
      out.push(`> ${check.context}`, "");
      out.push("Maintains:");
      for (const ref of check.references) out.push(`- \`${ref}\``);
      out.push("", check.body, "");
    }
  }

  out.push("## Cited guidance");
  if (packet.guidance.length === 0) {
    out.push("_No guidance is cited by these checks._", "");
  } else {
    for (const excerpt of packet.guidance) {
      out.push(`### \`${excerpt.ref}\``, "");
      if (excerpt.for !== undefined) out.push(`> ${excerpt.for}`, "");
      out.push(excerpt.body.trim(), "");
    }
  }

  out.push("## Materials");
  if (packet.materials.length === 0) {
    out.push("_No materials are declared by the cited guidance._", "");
  } else {
    for (const material of packet.materials)
      appendMaterialMarkdown(out, material);
    out.push("");
  }

  out.push(
    "## Diff",
    untrustedBegin("diff"),
    fencedMarkdown(neutralizeSentinels(packet.diff.trimEnd()), "diff"),
    untrustedEnd("diff"),
    "",
  );
  out.push("## Produce findings", "");
  out.push(
    "For each finding, cite the check id, exact guidance reference, severity, location, observable drift, and smallest coherent fix. Untraceable obligations are invalid. If nothing drifts, say so plainly.",
  );
  return `${out.join("\n")}\n`;
}

function appendMaterialMarkdown(
  lines: string[],
  material: TransportedMaterial,
): void {
  if (material.inlined !== undefined) {
    const info = material.path ?? material.locator;
    lines.push("");
    if (material.note !== undefined) {
      lines.push(`Note for \`${material.locator}\`: ${material.note}`, "");
    }
    lines.push(
      untrustedBegin(info),
      fencedMarkdown(neutralizeSentinels(material.inlined.trimEnd()), info),
      untrustedEnd(info),
    );
    return;
  }

  const target =
    material.reason === "binary inspect-pointer"
      ? `inspect: ${material.path ?? material.locator} - view this image before generating`
      : `${material.locator}${material.omitted ? ` - ${material.reason ?? "not inlined"}` : ""}`;
  lines.push(`- ${target}`);
  if (material.note !== undefined) lines.push(`  Note: ${material.note}`);
}

function fencedMarkdown(content: string, info?: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(content) + 1));
  return `${fence}${info ?? ""}\n${content}\n${fence}`;
}

function longestBacktickRun(content: string): number {
  let longest = 0;
  for (const match of content.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}
