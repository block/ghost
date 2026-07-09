import { describe, expect, it } from "vitest";
import {
  buildGatherMenu,
  type GhostCatalog,
  type GhostCatalogNode,
  orderPulledNodes,
  steeringBucket,
} from "../../src/ghost-core/index.js";

function node(
  id: string,
  extra: Partial<GhostCatalogNode> = {},
): GhostCatalogNode {
  return {
    id,
    slug: id.split(".").at(-1) ?? id,
    concrete: false,
    hasSkeleton: false,
    posture: "steady",
    body: "Prose.",
    ...extra,
  };
}

function catalog(nodes: GhostCatalogNode[]): GhostCatalog {
  return { nodes: new Map(nodes.map((entry) => [entry.id, entry])) };
}

describe("buildGatherMenu", () => {
  it("hides wild nodes by default and counts them as available", () => {
    const menu = buildGatherMenu(
      catalog([
        node("principle.trust"),
        node("provocation.noise", { posture: "wild", wild: true }),
      ]),
    );

    expect(menu.entries.map((entry) => entry.id)).toEqual(["principle.trust"]);
    expect(menu.wildAvailable).toBe(1);
    expect(menu.wildIncluded).toBe(false);
  });

  it("includes wild nodes on request and marks wildIncluded true", () => {
    const menu = buildGatherMenu(
      catalog([
        node("principle.trust"),
        node("provocation.noise", { posture: "wild", wild: true }),
      ]),
      { includeWild: true },
    );

    expect(menu.entries.map((entry) => entry.id)).toEqual([
      "principle.trust",
      "provocation.noise",
    ]);
    expect(
      menu.entries.find((entry) => entry.id === "provocation.noise"),
    ).toMatchObject({ wild: true });
    expect(menu.wildAvailable).toBe(0);
    expect(menu.wildIncluded).toBe(true);
  });

  it("reports zero wildAvailable when no wild nodes exist", () => {
    const menu = buildGatherMenu(
      catalog([node("index", { slug: "index" }), node("principle.trust")]),
    );

    expect(menu.wildAvailable).toBe(0);
    expect(menu.wildIncluded).toBe(false);
  });
});

describe("steering order", () => {
  it("assigns buckets for index, concrete, wild/default, and guard nodes", () => {
    expect(steeringBucket(node("index", { slug: "elsewhere" }))).toBe(0);
    expect(steeringBucket(node("principle.index", { slug: "index" }))).toBe(0);
    expect(steeringBucket(node("asset.tokens", { concrete: true }))).toBe(1);
    expect(steeringBucket(node("provocation.noise", { wild: true }))).toBe(2);
    expect(steeringBucket(node("principle.trust"))).toBe(2);
    expect(steeringBucket(node("anti-goal.generic", { guard: true }))).toBe(3);
  });

  it("orders by steering bucket while preserving original order within each bucket", () => {
    const guard = node("anti-goal.generic", { guard: true });
    const defaultNode = node("principle.trust");
    const concreteA = node("asset.tokens", { concrete: true });
    const index = node("index", { slug: "index" });
    const wild = node("provocation.noise", { posture: "wild", wild: true });
    const concreteB = node("pattern.card", { concrete: true });

    expect(
      orderPulledNodes([
        guard,
        defaultNode,
        concreteA,
        index,
        wild,
        concreteB,
      ]).map((entry) => entry.id),
    ).toEqual([
      "index",
      "asset.tokens",
      "pattern.card",
      "principle.trust",
      "provocation.noise",
      "anti-goal.generic",
    ]);
  });
});
