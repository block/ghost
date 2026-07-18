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
        "Name the package's silence, follow the cover silence posture when present, and do not invent ghost-backed guidance.",
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
      instruction: ask
        ? "Pull every node whose description indicates its stated situation applies and whose guidance, material, structure, or refusal governs the work; skip inapplicable nodes."
        : "Bare gather is catalog inspection. Do not treat the menu as task grounding until an ask is supplied; when grounding a task, pull every applicable node and skip inapplicable nodes.",
      topicOverlapAloneIsApplicability: false,
      addForCompleteness: false,
      omitApplicableForCount: false,
    },
    noAsk:
      "Bare gather is catalog inspection and does not imply task grounding.",
  };
}

export function menuCoverage(
  menu: readonly CatalogMenuEntry[],
): GhostGatherCoverage {
  return {
    nodes: menu.length,
    concrete: menu.filter((entry) => entry.concrete).length,
    payloads: {
      materials: menu.filter((entry) => entry.materials !== undefined).length,
      fencedExamples: menu.filter((entry) => entry.hasFencedExample).length,
      skeletons: menu.filter((entry) => entry.hasSkeleton).length,
    },
    undescribed: menu.filter(
      (entry) => !entry.description || entry.description.trim().length === 0,
    ).length,
  };
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
