import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type GhostNodeDocument, parseNode } from "#ghost-core";

export const GHOST_NODES_DIRNAME = "nodes";

export interface LoadedNodesDir {
  nodes: GhostNodeDocument[];
  /** Files that failed lint, with their first error message. */
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load authored prose nodes from `<packageDir>/nodes/*.md`. Each file is parsed
 * and validated per-node; a file with errors is collected in `invalid` (with
 * its first error) and skipped rather than throwing, so one bad node does not
 * block folding the rest. Absent directory → no nodes.
 *
 * Phase 2 keeps discovery deliberately minimal (one default `nodes/` directory,
 * mirroring `checks/`). Loose-anywhere and custom layouts are a later
 * refinement.
 */
export async function loadNodesDir(
  packageDir: string,
): Promise<LoadedNodesDir> {
  const dir = join(packageDir, GHOST_NODES_DIRNAME);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { nodes: [], invalid: [] };
  }

  const nodes: GhostNodeDocument[] = [];
  const invalid: LoadedNodesDir["invalid"] = [];

  for (const name of entries.sort()) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(dir, name), "utf-8");
    const { node, report } = parseNode(raw);
    if (node === null || report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      invalid.push({ file: name, message: first?.message ?? "invalid node" });
      continue;
    }
    nodes.push(node);
  }

  return { nodes, invalid };
}
