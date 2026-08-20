import { buildCatalogMenu, type CatalogMenuEntry } from "#ghost-core";
import type {
  GhostEmbedSnapshot,
  GhostGatherContract,
  GhostGatherCoverage,
  GhostGatherResult,
  GhostMenuKind,
} from "./types.js";

export function gatherGhostPackage(
  snapshot: GhostEmbedSnapshot,
  options: { ask?: string } = {},
): GhostGatherResult {
  const ask = normalizeAsk(options.ask);
  const coverId =
    snapshot.cover.state === "resolved" ? snapshot.cover.id : undefined;
  const menu = buildCatalogMenu({
    nodes: new Map(
      [...snapshot.catalog.nodes].map(([id, node]) => [
        id,
        {
          ...node,
          materials: node.materials ? [...node.materials] : undefined,
        },
      ]),
    ),
  }).filter((entry) => entry.id !== coverId);
  const kinds = menuKinds(snapshot);

  return {
    kind: "menu",
    ...(ask ? { ask } : {}),
    source: {
      artifact: "ghost package",
      list: "Available guidance",
    },
    contract: gatherContract(ask),
    cover: snapshot.cover,
    silence: {
      ifNoneApply:
        "If no node applies, say the package is silent on the task. Check whether the cover above states its own rule for missing guidance and follow that; otherwise reason provisionally and label it as such. Never invent ghost-backed guidance.",
    },
    coverage: menuCoverage(menu),
    ...(kinds.length > 0 ? { kinds } : {}),
    nodes: menu,
  };
}

export function normalizeAsk(ask: string | undefined): string | undefined {
  const normalized = (ask ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * The gather selection contract, worded once and shared by both the markdown
 * and JSON emitters so the two surfaces cannot drift apart. `context.*`
 * nodes get a stricter uncertainty rule than other kinds: a wrong-situation
 * context node is contamination (see the context kind's own glossary
 * convention), so "when uncertain, pull" is qualified rather than blanket.
 * Leads with an instruction, not a description, since this is a contract,
 * not a label.
 */
export const GATHER_SELECTION_INSTRUCTION =
  "Pull every node whose `for` payload matches the task; do not filter or rank beyond that. Skip clear non-matches. Topic overlap alone is not a match. When uncertain, pull — except for `context.*` nodes: a wrong-situation rule is contamination, so when unsure there, skip or ask instead.";

export const GATHER_NO_ASK_INSTRUCTION =
  "No ask supplied. Re-run `ghost gather <ask>` with the real task before pulling.";

export function gatherContract(ask: string | undefined): GhostGatherContract {
  return {
    completeness: {
      complete: true,
      filtered: false,
      ranked: false,
      selectedByGhost: false,
    },
    selection: {
      basis: "applicability",
      instruction: GATHER_SELECTION_INSTRUCTION,
      topicOverlapAloneIsApplicability: false,
      addForCompleteness: false,
      omitApplicableForCount: false,
    },
    ...(ask ? {} : { noAsk: GATHER_NO_ASK_INSTRUCTION }),
  };
}

export function menuCoverage(
  menu: readonly CatalogMenuEntry[],
): GhostGatherCoverage {
  const withoutFor = menu.filter(
    (entry) => !entry.for || entry.for.trim().length === 0,
  ).length;
  return {
    nodes: menu.length,
    concrete: menu.filter((entry) => entry.concrete).length,
    payloads: {
      materials: menu.filter((entry) => entry.materials !== undefined).length,
      fencedExamples: menu.filter((entry) => entry.hasFencedExample).length,
      skeletons: menu.filter((entry) => entry.hasSkeleton).length,
    },
    withoutFor,
  };
}

/**
 * Group menu entries by kind, in the glossary's declared order, falling back
 * to id order within a kind and for any kind the glossary does not declare.
 * Grouping puts each kind's legend adjacent to the nodes it governs instead
 * of relying on a per-entry kind tag the model must cross-reference.
 */
export function groupMenuByKind(
  menu: readonly CatalogMenuEntry[],
  kinds: readonly GhostMenuKind[],
): { kind: string | undefined; entries: CatalogMenuEntry[] }[] {
  const order = kinds.map((kind) => kind.name);
  const groups = new Map<string | undefined, CatalogMenuEntry[]>();
  for (const entry of menu) {
    const key = entry.kind;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  const orderedKeys = [
    ...order.filter((name) => groups.has(name)),
    ...[...groups.keys()]
      .filter((key) => key === undefined || !order.includes(key))
      .sort((a, b) => (a ?? "").localeCompare(b ?? "")),
  ];
  return orderedKeys.map((kind) => ({ kind, entries: groups.get(kind) ?? [] }));
}

function menuKinds(snapshot: GhostEmbedSnapshot): GhostMenuKind[] {
  return (snapshot.glossary?.kinds ?? [])
    .filter((kind) => kind.purpose.length > 0)
    .map((kind) => ({
      name: kind.name,
      // Legend entries are one line each: keep the section's first paragraph
      // and collapse internal wrapping.
      purpose: (kind.purpose.split(/\n\s*\n/, 1)[0] ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    }));
}
