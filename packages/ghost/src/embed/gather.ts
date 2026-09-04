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
    contract: gatherContract(),
    cover: snapshot.cover,
    silence: silenceContract(snapshot.cover),
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

export const GATHER_NO_ASK_INSTRUCTION =
  "When no ask is supplied, this menu is not grounded to a task. Re-run `ghost gather <ask>` before pulling for a task.";

export function gatherContract(): GhostGatherContract {
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
    // Legend entries are one line each: keep the section's first paragraph
    // and collapse internal wrapping. Empty purpose stays explicit so
    // declared kind order survives even when the glossary has no prose yet.
    purpose: (kind.purpose.split(/\n\s*\n/, 1)[0] ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  }));
}

function silenceContract(
  cover: GhostEmbedSnapshot["cover"],
): GhostGatherResult["silence"] {
  if (cover.state === "resolved") {
    return {
      ifNoneApply: `If no node applies, say the package is silent on the task. Check the resolved cover \`${cover.id}\` for any silence rule; otherwise reason provisionally and label it as such. Never invent ghost-backed guidance.`,
    };
  }

  return {
    ifNoneApply:
      "If no node applies, say the package is silent on the task. Reason provisionally and label it as such. Never invent ghost-backed guidance.",
  };
}
