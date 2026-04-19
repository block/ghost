import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DesignDecision } from "../types.js";
import { splitRaw } from "./parser.js";

/**
 * If a `decisions/` directory exists next to the expression.md, each
 * .md file inside is read as a single DesignDecision:
 *
 *   ---
 *   dimension: warm-neutrals          # optional — falls back to filename
 *   evidence: ["#111", "#4d4c48"]     # optional — empty array if missing
 *   ---
 *   No cool blue-grays anywhere. Every gray carries a warm undertone.
 *
 * The file's markdown body becomes the decision's prose. The assembled
 * decisions are then merged into the main fingerprint's `decisions` via
 * the same by-dimension rules as extends composition.
 */
export async function loadDecisionFragments(
  expressionDir: string,
): Promise<DesignDecision[]> {
  const fragDir = join(expressionDir, "decisions");
  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(fragDir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) return [];

  const entries = await readdir(fragDir);
  const mdFiles = entries.filter((e) => e.endsWith(".md"));
  const decisions: DesignDecision[] = [];

  for (const name of mdFiles) {
    const path = join(fragDir, name);
    const raw = await readFile(path, "utf-8");
    const decision = parseFragment(raw, basename(name, extname(name)));
    if (decision) decisions.push(decision);
  }

  return decisions;
}

function parseFragment(
  raw: string,
  filenameSlug: string,
): DesignDecision | null {
  let yamlObj: Record<string, unknown> = {};
  let prose = raw;

  try {
    const { frontmatter, body } = splitRaw(raw);
    yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
    prose = body;
  } catch {
    // No frontmatter — treat the whole file as prose with filename as dimension.
  }

  const dimension =
    typeof yamlObj.dimension === "string" ? yamlObj.dimension : filenameSlug;
  const evidence = Array.isArray(yamlObj.evidence)
    ? yamlObj.evidence.filter((e): e is string => typeof e === "string")
    : [];

  const decisionText = prose.trim();
  if (!dimension || !decisionText) return null;

  return { dimension, decision: decisionText, evidence };
}
