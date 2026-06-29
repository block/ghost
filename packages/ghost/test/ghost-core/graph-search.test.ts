import { describe, expect, it } from "vitest";
import {
  assembleGraph,
  closestIds,
  type PlacedNode,
  searchGraph,
} from "../../src/ghost-core/index.js";

function root(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
): PlacedNode {
  return { id, parent: "core", folder: "", doc: { frontmatter: fm, body: id } };
}
function dir(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
  body = id,
): PlacedNode {
  const slash = id.lastIndexOf("/");
  const parent = slash === -1 ? "core" : id.slice(0, slash);
  return { id, parent, folder: id, doc: { frontmatter: fm, body } };
}
function leaf(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
  body = id,
): PlacedNode {
  const slash = id.lastIndexOf("/");
  const folder = slash === -1 ? "" : id.slice(0, slash);
  const parent = folder === "" ? "core" : folder;
  return { id, parent, folder, doc: { frontmatter: fm, body } };
}

function fixture() {
  return assembleGraph({
    placedNodes: [
      root("core"),
      dir("marketing", { description: "Outbound brand surfaces." }),
      leaf(
        "marketing/email",
        { description: "Lifecycle email." },
        "Restraint and a single call to action.",
      ),
      dir("checkout", { description: "The payment flow." }),
    ],
  });
}

describe("searchGraph", () => {
  it("ranks exact name over description over body", () => {
    const graph = fixture();
    // 'marketing' is an exact id and also appears in the email body? no — use
    // a query that hits all tiers across different nodes.
    const hits = searchGraph("marketing", { graph, checks: [] });
    expect(hits[0]?.id).toBe("marketing");
    expect(hits[0]?.reason).toBe("exact");
  });

  it("tags a node with children as a surface and a leaf as a node", () => {
    const graph = fixture();
    const hits = searchGraph("email", { graph, checks: [] });
    const email = hits.find((h) => h.id === "marketing/email");
    expect(email?.domain).toBe("node");
    expect(email?.next).toEqual(["ghost gather marketing/email"]);

    const surface = searchGraph("checkout", { graph, checks: [] })[0];
    expect(surface?.domain).toBe("surface");
    expect(surface?.next).toContain("ghost checks --surface checkout");
  });

  it("matches a body mention at the lowest tier", () => {
    const graph = fixture();
    const hits = searchGraph("restraint", { graph, checks: [] });
    expect(hits[0]?.id).toBe("marketing/email");
    expect(hits[0]?.reason).toBe("body");
  });

  it("finds a typo via the fuzzy fallback", () => {
    const graph = fixture();
    const hits = searchGraph("markting", { graph, checks: [] });
    expect(hits.map((h) => h.id)).toContain("marketing");
    expect(hits.find((h) => h.id === "marketing")?.reason).toBe("fuzzy");
  });

  it("restricts to a domain with --type and caps with --limit", () => {
    const graph = fixture();
    const onlyChecks = searchGraph(
      "email",
      { graph, checks: [] },
      { domain: "check" },
    );
    expect(onlyChecks).toEqual([]);

    const capped = searchGraph("e", { graph, checks: [] }, { limit: 1 });
    expect(capped.length).toBeLessThanOrEqual(1);
  });

  it("searches checks and points at their surface", () => {
    const graph = fixture();
    const hits = searchGraph("contrast", {
      graph,
      checks: [
        {
          name: "color-contrast",
          surface: "checkout",
          description: "Flag low contrast.",
          body: "Ensure WCAG AA.",
        },
      ],
    });
    const check = hits.find((h) => h.domain === "check");
    expect(check?.id).toBe("color-contrast");
    expect(check?.next).toEqual(["ghost checks --surface checkout"]);
  });

  it("matches a multi-word phrase by token coverage", () => {
    const graph = fixture();
    // "Outbound brand surfaces." — neither word is the id, but both are in the
    // description, so the phrase should still find the marketing surface.
    const hits = searchGraph("outbound brand", { graph, checks: [] });
    expect(hits[0]?.id).toBe("marketing");
  });

  it("ranks fuller phrase coverage above partial coverage", () => {
    const graph = fixture();
    // 'payment flow' — both words are in checkout's description; only 'payment'
    // weakly elsewhere. Checkout should lead.
    const hits = searchGraph("payment flow", { graph, checks: [] });
    expect(hits[0]?.id).toBe("checkout");
  });

  it("drops stopwords so they do not force false coverage", () => {
    const graph = fixture();
    // "the payment flow" — 'the' is a stopword; coverage is over payment+flow.
    const withStop = searchGraph("the payment flow", { graph, checks: [] });
    const withoutStop = searchGraph("payment flow", { graph, checks: [] });
    expect(withStop[0]?.id).toBe(withoutStop[0]?.id);
    expect(withStop[0]?.score).toBe(withoutStop[0]?.score);
  });

  it("excludes the implicit core root and returns nothing for an empty query", () => {
    const graph = fixture();
    expect(
      searchGraph("core", { graph, checks: [] }).every((h) => h.id !== "core"),
    ).toBe(true);
    expect(searchGraph("   ", { graph, checks: [] })).toEqual([]);
  });
});

describe("closestIds", () => {
  const ids = ["marketing", "marketing/email", "checkout", "core"];

  it("suggests the nearest id for a typo", () => {
    expect(closestIds("markting", ids)[0]).toBe("marketing");
  });

  it("ranks substring matches above pure edit-distance neighbours", () => {
    expect(closestIds("check", ids)[0]).toBe("checkout");
  });

  it("returns nothing for an empty query and respects max", () => {
    expect(closestIds("", ids)).toEqual([]);
    expect(closestIds("marketing", ids, 1).length).toBe(1);
  });
});
