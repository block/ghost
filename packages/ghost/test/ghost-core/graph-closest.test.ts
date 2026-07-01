import { describe, expect, it } from "vitest";
import { closestIds } from "../../src/ghost-core/index.js";

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
