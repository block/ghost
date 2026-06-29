import { type GhostNodeDocument, serializeNode } from "#ghost-core";

/**
 * One-shot migration of a legacy `.ghost/` package (pre-surface coordinates)
 * onto the directory-tree node model. Operates on raw parsed YAML, because the
 * current schema rejects the legacy fields (`topology`, `applies_to`,
 * `surface_type`, `scope`) and a legacy package no longer parses through the
 * loader.
 *
 * Core discipline: report, don't guess. A node whose home cannot be derived
 * unambiguously is left unplaced (at the package root, cascading from core) and
 * recorded for human review, never auto-placed into a surface.
 */

type Yaml = Record<string, unknown>;

export interface MigrationNote {
  /** Dotted location, e.g. `intent.principles[2]`. */
  path: string;
  node_id?: string;
  reason:
    | "multiple-scopes"
    | "surface-type-only"
    | "paths-not-migrated"
    | "no-coordinates";
  detail: string;
}

export interface MigrationResult {
  /** Derived surface ids (directories), each a child of the implicit `core`. */
  surfaceIds: string[];
  intent: Yaml | undefined;
  inventory: Yaml | undefined;
  composition: Yaml | undefined;
  notes: MigrationNote[];
}

export interface LegacyPackageInput {
  intent?: Yaml;
  inventory?: Yaml;
  composition?: Yaml;
}

/**
 * Transform parsed legacy facet docs into surface-model docs plus a report.
 * Pure: no I/O, no mutation of the inputs.
 */
export function migrateLegacyPackage(
  input: LegacyPackageInput,
): MigrationResult {
  const notes: MigrationNote[] = [];

  const inventory = input.inventory
    ? structuredClone(input.inventory)
    : undefined;
  const intent = input.intent ? structuredClone(input.intent) : undefined;
  const composition = input.composition
    ? structuredClone(input.composition)
    : undefined;

  // --- surface ids (directories) from inventory.topology.scopes ---
  const surfaceIds = collectScopeIds(inventory);

  // Drop topology from inventory (its data is now the directory layout).
  if (inventory && "topology" in inventory) delete inventory.topology;

  // --- place + clean nodes ---
  placeArray(intent, "situations", "intent.situations", notes);
  placeArray(intent, "principles", "intent.principles", notes);
  placeArray(
    intent,
    "experience_contracts",
    "intent.experience_contracts",
    notes,
  );
  placeArray(composition, "patterns", "composition.patterns", notes);
  placeArray(inventory, "exemplars", "inventory.exemplars", notes);

  return { surfaceIds, intent, inventory, composition, notes };
}

function collectScopeIds(inventory: Yaml | undefined): string[] {
  const topology = inventory?.topology;
  if (!isRecord(topology)) return [];
  const scopes = topology.scopes;
  if (!Array.isArray(scopes)) return [];
  const ids: string[] = [];
  for (const scope of scopes) {
    if (isRecord(scope) && typeof scope.id === "string") ids.push(scope.id);
  }
  return [...new Set(ids)];
}

function placeArray(
  doc: Yaml | undefined,
  key: string,
  pathPrefix: string,
  notes: MigrationNote[],
): void {
  if (!doc) return;
  const list = doc[key];
  if (!Array.isArray(list)) return;
  list.forEach((entry, index) => {
    if (isRecord(entry)) placeNode(entry, `${pathPrefix}[${index}]`, notes);
  });
}

/**
 * Derive a single `surface:` for one node from its legacy coordinates, then
 * strip the legacy fields. Mutates the (already-cloned) node in place.
 */
function placeNode(node: Yaml, path: string, notes: MigrationNote[]): void {
  const id = typeof node.id === "string" ? node.id : undefined;
  const placement = derivePlacement(node, path, id, notes);

  if (placement !== undefined) node.surface = placement;

  // Strip legacy coordinate fields regardless of placement outcome.
  delete node.applies_to;
  delete node.surface_type;
  delete node.scope;
}

function derivePlacement(
  node: Yaml,
  path: string,
  id: string | undefined,
  notes: MigrationNote[],
): string | undefined {
  // 1. exemplar's explicit single `scope`.
  if (typeof node.scope === "string") return node.scope;

  // 2. applies_to.scopes with exactly one entry.
  const appliesTo = node.applies_to;
  const scopes =
    isRecord(appliesTo) && Array.isArray(appliesTo.scopes)
      ? appliesTo.scopes.filter((s): s is string => typeof s === "string")
      : [];
  if (scopes.length === 1) {
    if (
      isRecord(appliesTo) &&
      Array.isArray(appliesTo.paths) &&
      appliesTo.paths.length > 0
    ) {
      notes.push({
        path,
        ...(id ? { node_id: id } : {}),
        reason: "paths-not-migrated",
        detail: `applies_to.paths preserved for review only; paths are not part of the surface model.`,
      });
    }
    return scopes[0];
  }
  if (scopes.length > 1) {
    notes.push({
      path,
      ...(id ? { node_id: id } : {}),
      reason: "multiple-scopes",
      detail: `node declared ${scopes.length} scopes (${scopes.join(", ")}); left unplaced for human review.`,
    });
    return undefined;
  }

  // 3. surface_type only (no scope) — not a placement concept.
  if (typeof node.surface_type === "string") {
    notes.push({
      path,
      ...(id ? { node_id: id } : {}),
      reason: "surface-type-only",
      detail: `node had surface_type '${node.surface_type}' but no scope; surface_type is not a placement. Left unplaced.`,
    });
    return undefined;
  }

  // 4. no coordinates at all — legitimately unplaced (cascades from core).
  notes.push({
    path,
    ...(id ? { node_id: id } : {}),
    reason: "no-coordinates",
    detail: "node had no legacy coordinates; left unplaced (resolves at core).",
  });
  return undefined;
}

function isRecord(value: unknown): value is Yaml {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True if a parsed fingerprint doc looks like the legacy (pre-surface) shape. */
export function looksLegacy(input: LegacyPackageInput): boolean {
  const inv = input.inventory;
  if (isRecord(inv) && "topology" in inv) return true;
  for (const doc of [input.intent, input.composition, input.inventory]) {
    if (!isRecord(doc)) continue;
    for (const value of Object.values(doc)) {
      if (!Array.isArray(value)) continue;
      for (const entry of value) {
        if (
          isRecord(entry) &&
          ("applies_to" in entry || "surface_type" in entry || "scope" in entry)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/** A node file the migration writes, relative to the package dir. */
export interface MigratedNodeFile {
  relativePath: string;
  content: string;
}

/**
 * Convert the migrated facet docs into a directory tree of `*.md` nodes — the
 * persistent form of the facet→node projection. Each facet entry becomes one
 * prose node placed by the directory layout: a placed node lands at
 * `<surface>/<id>.md` (its directory is its parent), an unplaced node at
 * `<id>.md` (the package root, cascading from core). Each derived surface also
 * gets a bare `<surface>/index.md` so the directory survives even when no node
 * lands in it. Lossy by design: structured affordances (evidence, check_refs,
 * exemplar paths) are dropped, in line with Option A.
 */
export function migratedNodeFiles(result: MigrationResult): MigratedNodeFile[] {
  const files: MigratedNodeFile[] = [];
  const seen = new Set<string>();

  // Seed each derived surface as a directory with an index node, so an empty
  // surface still exists as a tree position.
  for (const surfaceId of result.surfaceIds) {
    files.push({
      relativePath: `${surfaceId}/index.md`,
      content: serializeNode({
        frontmatter: {},
        body: `The \`${surfaceId}\` surface.`,
      }),
    });
  }

  const emit = (entry: Yaml, body: string) => {
    const id = typeof entry.id === "string" ? entry.id : undefined;
    if (!id || seen.has(id)) return;
    seen.add(id);
    const surface =
      typeof entry.surface === "string" ? entry.surface : undefined;
    const doc: GhostNodeDocument = {
      frontmatter: {},
      body: body.trim(),
    };
    const relativePath =
      surface !== undefined ? `${surface}/${id}.md` : `${id}.md`;
    files.push({
      relativePath,
      content: serializeNode(doc),
    });
  };

  collect(result.intent, "situations", (e) =>
    emit(
      e,
      str(e.user_intent) ?? str(e.product_obligation) ?? str(e.title) ?? id(e),
    ),
  );
  collect(result.intent, "principles", (e) =>
    emit(e, str(e.principle) ?? id(e)),
  );
  collect(result.intent, "experience_contracts", (e) =>
    emit(e, str(e.contract) ?? id(e)),
  );
  collect(result.composition, "patterns", (e) =>
    emit(e, str(e.pattern) ?? id(e)),
  );
  collect(result.inventory, "exemplars", (e) =>
    emit(e, str(e.why) ?? str(e.note) ?? str(e.title) ?? str(e.path) ?? id(e)),
  );

  return files;
}

function collect(
  doc: Yaml | undefined,
  key: string,
  visit: (entry: Yaml) => void,
): void {
  if (!doc) return;
  const list = doc[key];
  if (!Array.isArray(list)) return;
  for (const entry of list) if (isRecord(entry)) visit(entry);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function id(entry: Yaml): string {
  return typeof entry.id === "string" ? entry.id : "node";
}
