import { buildCatalogMenu, type CatalogMenuEntry } from "#ghost-core";
import { guidanceDiagnostics } from "../internal/load-diagnostics.js";
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
  const allEntries = buildCatalogMenu({
    nodes: new Map(
      [...snapshot.catalog.nodes].map(([id, node]) => [
        id,
        {
          ...node,
          materials: node.materials ? [...node.materials] : undefined,
        },
      ]),
    ),
  });
  const automaticIds = new Set(snapshot.cascade?.automatic);
  const menu = allEntries.filter(
    (entry) => entry.id !== coverId && !automaticIds.has(entry.id),
  );
  const entriesById = new Map(allEntries.map((entry) => [entry.id, entry]));
  // Pull delivers automatic guidance in full; the menu only names it, so one
  // gather and pull cycle carries each body once.
  const automatic = snapshot.cascade?.automatic.map((id) => {
    const entry = entriesById.get(id);
    if (!entry)
      throw new Error(`Automatic node "${id}" is missing from the catalog.`);
    return entry;
  });
  const kinds = menuKinds(snapshot);

  return {
    kind: "menu",
    diagnostics: guidanceDiagnostics(snapshot),
    ...(ask ? { ask } : {}),
    source: {
      artifact: "ghost package",
      list: "Available guidance",
    },
    contract: gatherContract(
      snapshot.invalid.length === 0,
      Boolean(snapshot.cascade),
    ),
    ...(snapshot.cascade
      ? {
          core: snapshot.cascade.core,
          automatic,
          provenance: snapshot.cascade.provenance,
        }
      : {}),
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
 * and JSON emitters so the two surfaces cannot drift apart. Leads with an
 * instruction, not a description, since this is a contract, not a label.
 */
export const GATHER_SELECTION_INSTRUCTION =
  "Pull every node whose `for` payload matches the task. Skip clear non-matches; topic overlap alone is not a match. Do not rank matches or cap their count. When uncertain, pull unless the node's kind legend states a stricter rule.";

export const GATHER_IF_NONE_APPLY_INSTRUCTION =
  "If no selectable node applies, run bare `ghost pull` to receive the cover and uncovered-guidance policy.";

export const GATHER_NO_ASK_INSTRUCTION =
  "When no ask is supplied, this menu is not grounded to a task. Re-run `ghost gather <ask>` before pulling for a task.";

export function gatherContract(
  complete = true,
  cascade = false,
): GhostGatherContract {
  return {
    completeness: {
      complete,
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
    ifNoneApply: cascade
      ? "If no selectable node applies, run bare `ghost pull` with the same package options to receive automatic guidance and the uncovered-guidance policy."
      : GATHER_IF_NONE_APPLY_INSTRUCTION,
    noAsk: GATHER_NO_ASK_INSTRUCTION,
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

function menuKinds(snapshot: GhostEmbedSnapshot): GhostMenuKind[] {
  return (snapshot.glossary?.kinds ?? []).map((kind) => ({
    name: kind.name,
    // Later paragraphs may carry selection rules. Preserve the parsed purpose,
    // including Markdown structure, rather than silently shortening its meaning.
    purpose: kind.purpose.trim(),
  }));
}
