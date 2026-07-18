import { readFile } from "node:fs/promises";
import type { GhostCheckFrontmatter } from "#ghost-core";
import { type GhostCatalogNode, parseGlossary } from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import type { LoadedCheck } from "../scan/check-files.js";
import type { GhostPackagePaths } from "../scan/fingerprint-package.js";
import { loadGhostPackage } from "../scan/fingerprint-package.js";
import { snapshotMap } from "./readonly-map.js";
import type { GhostCoverState, GhostEmbedSnapshot } from "./types.js";

export async function loadGhostSnapshot(
  paths: GhostPackagePaths,
): Promise<GhostEmbedSnapshot> {
  const loaded = await loadGhostPackage(paths);
  const nodes = snapshotMap(cloneNodeMap(loaded.catalog.nodes));
  const cover = resolveCoverState(loaded.manifest.cover, nodes);
  const glossary = await loadSnapshotGlossary(paths.glossary);

  return deepFreeze({
    package: {
      id: loaded.manifest.id,
      dir: paths.packageDir,
      manifest: loaded.manifest,
      manifestRaw: loaded.manifestRaw,
    },
    catalog: {
      nodes,
    },
    cover,
    ...(glossary ? { glossary } : {}),
    checks: snapshotMap(cloneCheckMap(loaded.checks)),
    invalid: loaded.invalid.map((entry) => ({ ...entry })),
    invalidChecks: loaded.invalidChecks.map((entry) => ({ ...entry })),
  });
}

function resolveCoverState(
  coverId: string | undefined,
  nodes: ReadonlyMap<string, Readonly<GhostCatalogNode>>,
): GhostCoverState {
  if (coverId === undefined) return { state: "absent" };
  const node = nodes.get(coverId);
  if (node === undefined) return { state: "dangling", id: coverId };
  return { state: "resolved", id: coverId, node };
}

function cloneNodeMap(
  source: ReadonlyMap<string, GhostCatalogNode>,
): Map<string, Readonly<GhostCatalogNode>> {
  return new Map(
    [...source.entries()].map(([id, node]) => [
      id,
      deepFreeze({
        ...node,
        ...(node.materials ? { materials: [...node.materials] } : {}),
      }),
    ]),
  );
}

function cloneCheckMap(
  source: ReadonlyMap<string, LoadedCheck>,
): Map<string, Readonly<LoadedCheck>> {
  return new Map(
    [...source.entries()].map(([id, check]) => [
      id,
      deepFreeze({
        id: check.id,
        doc: {
          frontmatter: cloneCheckFrontmatter(check.doc.frontmatter),
          body: check.doc.body,
        },
        references: [...check.references],
      }),
    ]),
  );
}

function cloneCheckFrontmatter(
  frontmatter: GhostCheckFrontmatter,
): GhostCheckFrontmatter {
  return {
    ...frontmatter,
    ...(frontmatter.tools ? { tools: [...frontmatter.tools] } : {}),
    ...(frontmatter.references
      ? { references: [...frontmatter.references] }
      : {}),
  };
}

async function loadSnapshotGlossary(
  glossaryPath: string,
): Promise<GhostEmbedSnapshot["glossary"] | undefined> {
  let raw: string;
  try {
    raw = await readFile(glossaryPath, "utf-8");
  } catch (err) {
    if (isMissingPathError(err)) return undefined;
    throw err;
  }
  const result = parseGlossary(raw);
  if (result.glossary === null) return undefined;
  return {
    path: glossaryPath,
    kinds: result.glossary.kinds.map((kind) => ({ ...kind })),
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    if (value instanceof Map) {
      for (const [key, item] of value) {
        deepFreeze(key);
        deepFreeze(item);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) deepFreeze(item);
    } else {
      for (const item of Object.values(value)) deepFreeze(item);
    }
    Object.freeze(value);
  }
  return value;
}
