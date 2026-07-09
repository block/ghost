import { describe, expect, it } from "vitest";
import { stampGhostEvent } from "../src/observability-events.js";

describe("stampGhostEvent", () => {
  it("adds an ISO timestamp and preserves the event shape", () => {
    const before = Date.now();

    const stamped = stampGhostEvent({
      event: "gather",
      ask: "checkout",
      menu: ["checkout/principle.trust"],
      materials: ["checkout/copy.md"],
      wild: true,
      wildIds: ["checkout/provocation.speed"],
    });

    const after = Date.now();
    const stampedTime = Date.parse(stamped.ts);

    expect(stamped).toEqual({
      ts: expect.any(String),
      event: "gather",
      ask: "checkout",
      menu: ["checkout/principle.trust"],
      materials: ["checkout/copy.md"],
      wild: true,
      wildIds: ["checkout/provocation.speed"],
    });
    expect(stamped.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(stampedTime).toBeGreaterThanOrEqual(before);
    expect(stampedTime).toBeLessThanOrEqual(after);
  });
});
