import { describe, expect, it } from "vitest";
import {
  assembleCatalog,
  type PlacedNode,
} from "../../src/ghost-core/index.js";

function placed(
  id: string,
  extra: Partial<Pick<PlacedNode, "kind" | "slug">> = {},
  body = "Prose.",
): PlacedNode {
  return { id, ...extra, doc: { frontmatter: {}, body } };
}

describe("assembleCatalog (flat catalog assembly)", () => {
  it("assembles placed nodes into a flat map keyed by id", () => {
    const catalog = assembleCatalog({
      placedNodes: [
        placed(
          "principle.trust",
          { kind: "principle", slug: "trust" },
          "Reduce felt risk near payment.",
        ),
        placed("voice", { slug: "voice" }, "Calm, never hypey."),
      ],
    });

    const trust = catalog.nodes.get("principle.trust");
    expect(trust?.body).toBe("Reduce felt risk near payment.");
    expect(trust?.kind).toBe("principle");
    expect(trust?.slug).toBe("trust");

    const voice = catalog.nodes.get("voice");
    expect(voice?.body).toBe("Calm, never hypey.");
    // Uncategorized: no kind.
    expect(voice?.kind).toBeUndefined();
  });

  it("defaults slug from the id leaf when not supplied", () => {
    const catalog = assembleCatalog({ placedNodes: [placed("a/b/c")] });
    expect(catalog.nodes.get("a/b/c")?.slug).toBe("c");
  });

  it("marks nodes wild from glossary posture input", () => {
    const catalog = assembleCatalog({
      placedNodes: [
        placed("principle.trust", { kind: "principle" }),
        placed("provocation.noise", { kind: "provocation" }),
      ],
      wildKinds: ["provocation"],
    });

    expect(catalog.nodes.get("principle.trust")?.wild).toBeUndefined();
    expect(catalog.nodes.get("provocation.noise")?.wild).toBe(true);
  });
});
