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
    snapshot.framing.state === "resolved" ? snapshot.framing.id : undefined;
  const core = new Set(snapshot.core ?? snapshot.package.manifest.core ?? []);
  const entries = buildCatalogMenu({
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
  const menu = entries.filter(
    (entry) => entry.id !== coverId && !core.has(entry.id),
  );
  const kinds = menuKinds(snapshot);

  return {
    kind: "menu",
    provenance: snapshot.provenance,
    diagnostics: snapshot.invalid,
    ...(ask ? { ask } : {}),
    source: {
      artifact: "ghost package",
      list: "Available guidance",
    },
    contract: {
      ...gatherContract(snapshot.invalid.length === 0),
      ...(core.size > 0
        ? {
            ifNoneApply:
              "If no selectable node applies, run bare `ghost pull` to receive the framing, automatic core fundamentals, and uncovered-guidance policy. Do not select automatic nodes.",
          }
        : {}),
    },
    coverage: menuCoverage(menu),
    ...(kinds.length > 0 ? { kinds } : {}),
    nodes: menu,
    ...((snapshot.core ?? snapshot.package.manifest.core) !== undefined
      ? { automatic: entries.filter((entry) => core.has(entry.id)) }
      : {}),
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
  "If no selectable node applies, run bare `ghost pull` to receive the framing and uncovered-guidance policy.";

export const GATHER_NO_ASK_INSTRUCTION =
  "When no ask is supplied, this menu is not grounded to a task. Re-run `ghost gather <ask>` before pulling for a task.";

export function gatherContract(complete = true): GhostGatherContract {
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
    ifNoneApply: GATHER_IF_NONE_APPLY_INSTRUCTION,
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
  const kinds = new Map<string, GhostMenuKind>();
  for (const kind of [
    ...(snapshot.baseline?.glossary?.kinds ?? []),
    ...(snapshot.glossary?.kinds ?? []),
  ]) {
    const purpose = kind.purpose.trim();
    const previous = kinds.get(kind.name);
    // A shared built-in kind has one menu heading with both selection legends.
    kinds.set(kind.name, {
      name: kind.name,
      purpose:
        previous?.purpose && purpose && previous.purpose !== purpose
          ? `${previous.purpose}\n\n${purpose}`
          : previous?.purpose || purpose,
    });
  }
  return [...kinds.values()];
}
