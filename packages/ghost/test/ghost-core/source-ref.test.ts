import { describe, expect, it } from "vitest";
import {
  parseSourceRef,
  sliceNodeSection,
} from "../../src/ghost-core/index.js";

describe("parseSourceRef", () => {
  it("parses a plain node id", () => {
    expect(parseSourceRef("checkout/payment")).toEqual({
      nodeId: "checkout/payment",
    });
  });

  it("parses an id with a heading anchor", () => {
    expect(parseSourceRef("checkout/payment > Confirmation")).toEqual({
      nodeId: "checkout/payment",
      heading: "Confirmation",
    });
  });

  it("trims extra whitespace around both parts", () => {
    expect(parseSourceRef("  checkout/payment  >   Confirmation  ")).toEqual({
      nodeId: "checkout/payment",
      heading: "Confirmation",
    });
  });

  it("splits on the first `>` only", () => {
    expect(parseSourceRef("core > A > B")).toEqual({
      nodeId: "core",
      heading: "A > B",
    });
  });

  it("omits the heading when the anchor is empty", () => {
    expect(parseSourceRef("core > ")).toEqual({ nodeId: "core" });
  });

  it("returns null on a malformed node id", () => {
    expect(parseSourceRef("/bad")).toBeNull();
    expect(parseSourceRef("Bad Id > Heading")).toBeNull();
    expect(parseSourceRef("")).toBeNull();
  });
});

describe("sliceNodeSection", () => {
  const BODY = `# Top

Intro prose.

## Confirmation

Confirmation prose.

### Details

Detail prose.

## Next Section

Other prose.
`;

  it("slices the section under a matching heading", () => {
    expect(sliceNodeSection(BODY, "Confirmation")).toBe(
      "Confirmation prose.\n\n### Details\n\nDetail prose.",
    );
  });

  it("matches heading text case-insensitively", () => {
    expect(sliceNodeSection(BODY, "confirmation")).toContain(
      "Confirmation prose.",
    );
  });

  it("stops at the next heading of the same level", () => {
    const slice = sliceNodeSection(BODY, "Confirmation");
    expect(slice).not.toContain("Next Section");
    expect(slice).not.toContain("Other prose.");
  });

  it("stops at a higher-level heading", () => {
    const body = "## Section\n\nBody text.\n\n# Higher\n\nAfter.\n";
    expect(sliceNodeSection(body, "Section")).toBe("Body text.");
  });

  it("runs to the end of the body when nothing follows", () => {
    expect(sliceNodeSection(BODY, "Next Section")).toBe("Other prose.");
  });

  it("returns null when no heading matches", () => {
    expect(sliceNodeSection(BODY, "Missing")).toBeNull();
  });
});
