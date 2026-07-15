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

  it("derives concreteness from materials, substantial fences, and Skeleton sections", () => {
    const catalog = assembleCatalog({
      placedNodes: [
        placed("asset.tokens", {}, "Prose."),
        {
          ...placed("principle.sample", {}, "```txt\none\ntwo\nthree\n```"),
        },
        placed("pattern.shell", {}, "## Skeleton\n\n```tsx\n<section />\n```"),
        placed("principle.short", {}, "```txt\none\n```"),
      ].map((node) =>
        node.id === "asset.tokens"
          ? {
              ...node,
              doc: {
                frontmatter: { materials: ["tokens.css"] },
                body: node.doc.body,
              },
            }
          : node,
      ),
    });

    expect(catalog.nodes.get("asset.tokens")?.concrete).toBe(true);
    expect(catalog.nodes.get("principle.sample")?.concrete).toBe(true);
    expect(catalog.nodes.get("principle.sample")?.hasFencedExample).toBe(true);
    expect(catalog.nodes.get("pattern.shell")?.concrete).toBe(true);
    expect(catalog.nodes.get("pattern.shell")?.hasFencedExample).toBe(false);
    expect(catalog.nodes.get("pattern.shell")?.hasSkeleton).toBe(true);
    expect(catalog.nodes.get("principle.short")?.concrete).toBe(false);
    expect(catalog.nodes.get("principle.short")?.hasFencedExample).toBe(false);
  });
});
