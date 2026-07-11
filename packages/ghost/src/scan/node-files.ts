import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type PlacedNode, parseNode } from "#ghost-core";
import {
  FINGERPRINT_MANIFEST_FILENAME,
  GHOST_GLOSSARY_FILENAME,
  GHOST_MATERIALS_DIR,
} from "./constants.js";

/**
 * Reserved package-root entries that are never nodes: the manifest (the
 * package anchor), the glossary, `materials/` (bundled materials), and
 * `checks/` (review checks — feed-back only, never generation context). The
 * list is closed.
 */
const RESERVED_ROOT_ENTRIES = new Set<string>([
  FINGERPRINT_MANIFEST_FILENAME,
  "manifest.yaml",
  GHOST_GLOSSARY_FILENAME,
  GHOST_MATERIALS_DIR,
  "checks",
]);

export interface LoadedNodeFiles {
  nodes: PlacedNode[];
  /** Files that failed lint, with their first error message (path-relative id). */
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load authored prose nodes from the package directory. The corpus is flat:
 * there is no hierarchy, no inheritance, no edges. Nesting into directories is a
 * browsing convenience only.
 *
 * Every `*.md` file under the package directory is a node. Its id is its path
 * with `.md` dropped, uniformly (`marketing/email.md` → `marketing/email`,
 * `index.md` → `index`). The reserved root entries — `manifest.yml`,
 * `glossary.md`, `materials/`, and `checks/` — are skipped.
 *
 * A file that fails per-node lint is collected in `invalid` (with its first
 * error) and skipped rather than throwing, so one bad node does not block
 * loading the rest. A missing package directory or empty corpus yields no nodes.
 */
export async function loadNodeFiles(
  packageDir: string,
): Promise<LoadedNodeFiles> {
  const nodes: PlacedNode[] = [];
  const invalid: LoadedNodeFiles["invalid"] = [];

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
  invalid: LoadedNodeFiles["invalid"],
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
 * The rule is uniform: the **id** is the path with `.md` dropped. The **kind**
 * is the leaf filename's first dotted segment, and only exists when the leaf
 * has a dot; the **slug** is the rest of the leaf. A kind never changes a
 * node's identity path. `index.md` is an ordinary node with id `index` — by
 * convention the human-curated front door, but nothing special to the loader.
 * - `index.md`               → id `index`,             slug `index` (no kind).
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
  const id = withoutExt;

  // A dotted leaf splits into kind (first segment) and slug (the remainder);
  // a bare leaf is all slug with no kind.
  const dot = leaf.indexOf(".");
  if (dot > 0) {
    return {
      id,
      kind: leaf.slice(0, dot),
      slug: leaf.slice(dot + 1),
    };
  }
  return { id, slug: leaf };
}
