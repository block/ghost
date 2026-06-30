import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type PlacedNode, parseNode } from "#ghost-core";
import { GHOST_CHECKS_DIRNAME } from "./checks-dir.js";
import { FINGERPRINT_MANIFEST_FILENAME } from "./constants.js";

/**
 * Reserved package-root entries that are never nodes. `checks/` is a reserved
 * top-level subtree (the markdown checks an agent evaluates). The manifest is
 * the package anchor.
 *
 * NOTE: `checks/` is reserved at the package root only. Internal/nested reuse
 * (e.g. teams that compose nested `.agents`-style trees) will want this set to
 * be configurable per package — a planned follow-up, deliberately not built yet.
 */
const RESERVED_ROOT_ENTRIES = new Set<string>([
  FINGERPRINT_MANIFEST_FILENAME,
  "manifest.yaml",
  GHOST_CHECKS_DIRNAME,
]);

export interface LoadedNodeTree {
  nodes: PlacedNode[];
  /** Files that failed lint, with their first error message (path-relative id). */
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load authored prose nodes from the package's directory tree.
 *
 * Every `*.md` file under the package directory is a node. Its id is its path
 * with `.md` dropped (`marketing/email.md` → `marketing/email`); its parent is
 * its containing directory (`marketing`), or the implicit `core` root at the
 * top level. A directory's own prose lives in its `index.md`: the root
 * `index.md` is the `core` node (parent absent); `marketing/index.md` is the
 * `marketing` node (id `marketing`, parent `core`). The `checks/` subtree and
 * `manifest.yml` are reserved and skipped.
 *
 * A file that fails per-node lint is collected in `invalid` (with its first
 * error) and skipped rather than throwing, so one bad node does not block
 * folding the rest. Absent or empty tree → no nodes.
 */
export async function loadNodeTree(
  packageDir: string,
): Promise<LoadedNodeTree> {
  const nodes: PlacedNode[] = [];
  const invalid: LoadedNodeTree["invalid"] = [];

  await walk(packageDir, "", true, nodes, invalid);

  // Deterministic order by id, mirroring the old sorted readdir.
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  invalid.sort((a, b) => a.file.localeCompare(b.file));
  return { nodes, invalid };
}

async function walk(
  packageDir: string,
  relDir: string,
  isRoot: boolean,
  nodes: PlacedNode[],
  invalid: LoadedNodeTree["invalid"],
): Promise<void> {
  const absDir = relDir === "" ? packageDir : join(packageDir, relDir);
  let entries: Array<{ name: string; isDir: boolean }>;
  try {
    const dirents = await readdir(absDir, { withFileTypes: true });
    entries = dirents.map((d) => ({ name: d.name, isDir: d.isDirectory() }));
  } catch {
    return;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (isRoot && RESERVED_ROOT_ENTRIES.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;

    const relPath = relDir === "" ? entry.name : `${relDir}/${entry.name}`;

    if (entry.isDir) {
      await walk(packageDir, relPath, false, nodes, invalid);
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;

    const raw = await readFile(join(packageDir, relPath), "utf-8");
    const { node, report } = parseNode(raw);
    if (node === null || report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      invalid.push({
        file: relPath,
        message: first?.message ?? "invalid node",
      });
      continue;
    }

    const { id, parent, folder } = locate(relPath);
    nodes.push({
      id,
      ...(parent !== undefined ? { parent } : {}),
      folder,
      doc: node,
    });
  }
}

/**
 * Compute a node's id, parent, and file folder from its package-relative path.
 * The folder is the directory the file sits in, the unit of containment for
 * slice composition, which differs from `parent` for index nodes.
 * - `index.md`            → id `core`, parent absent, folder ``.
 * - `a/index.md`          → id `a`,    parent `core`, folder `a`.
 * - `a/b/index.md`        → id `a/b`,  parent `a`,    folder `a/b`.
 * - `a.md`                → id `a`,    parent `core`, folder ``.
 * - `a/b.md`              → id `a/b`,  parent `a`,    folder `a`.
 */
function locate(relPath: string): {
  id: string;
  parent?: string;
  folder: string;
} {
  const withoutExt = relPath.replace(/\.md$/, "");
  const segments = withoutExt.split("/");
  const isIndex = segments[segments.length - 1] === "index";
  const idSegments = isIndex ? segments.slice(0, -1) : segments;
  // The file folder: drop the filename segment (`index` or the leaf name).
  const folder = segments.slice(0, -1).join("/");

  if (idSegments.length === 0) {
    // Root index.md → the core node, folder is the package root ("").
    return { id: "core", folder };
  }
  const id = idSegments.join("/");
  const parent =
    idSegments.length === 1 ? "core" : idSegments.slice(0, -1).join("/");
  return { id, parent: parent === "core" ? "core" : parent, folder };
}
