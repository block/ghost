import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type PlacedNode, parseNode } from "#ghost-core";
import { GHOST_CHECKS_DIRNAME } from "./checks-dir.js";
import {
  FINGERPRINT_MANIFEST_FILENAME,
  GHOST_GLOSSARY_FILENAME,
} from "./constants.js";

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
  GHOST_GLOSSARY_FILENAME,
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

    const { id, kind, slug } = locate(relPath);
    nodes.push({
      id,
      ...(kind !== undefined ? { kind } : {}),
      slug,
      doc: node,
    });
  }
}

/**
 * Compute a node's id and filename kind/slug from its package-relative path.
 *
 * The **kind** is the leaf filename's first dotted segment, and only exists when
 * the leaf has a dot; the **slug** is the rest of the leaf. The id is the path
 * with `.md` dropped (an `index.md` collapses to its directory name), so a kind
 * never changes a node's identity path.
 * - `index.md`               → id `core`,              slug `core`.
 * - `a/index.md`             → id `a`,                 slug `a`.
 * - `voice.md`               → id `voice`,             slug `voice` (no kind).
 * - `principle.density.md`   → id `principle.density`, kind `principle`, slug `density`.
 * - `a/principle.trust.md`   → id `a/principle.trust`, kind `principle`, slug `trust`.
 */
function locate(relPath: string): {
  id: string;
  kind?: string;
  slug: string;
} {
  const withoutExt = relPath.replace(/\.md$/, "");
  const segments = withoutExt.split("/");
  const leaf = segments[segments.length - 1] ?? "";
  const isIndex = leaf === "index";
  const idSegments = isIndex ? segments.slice(0, -1) : segments;

  if (idSegments.length === 0) {
    // Root index.md → the core node.
    return { id: "core", slug: "core" };
  }

  const id = idSegments.join("/");
  // Kind/slug come from the leaf name. An index node's leaf is the directory
  // name and carries no kind. A dotted leaf splits into kind (first segment)
  // and slug (the remainder); a bare leaf is all slug with no kind.
  const leafName = isIndex ? (idSegments[idSegments.length - 1] ?? "") : leaf;
  const dot = leafName.indexOf(".");
  if (!isIndex && dot > 0) {
    return {
      id,
      kind: leafName.slice(0, dot),
      slug: leafName.slice(dot + 1),
    };
  }
  return { id, slug: leafName };
}
