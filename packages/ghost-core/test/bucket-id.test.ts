import { describe, expect, it } from "vitest";
import { componentRowId, tokenRowId, valueRowId } from "../src/bucket/id.js";
import type { BucketSource } from "../src/bucket/types.js";

const SOURCE_A: BucketSource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

const SOURCE_A_OTHER_TIME: BucketSource = {
  ...SOURCE_A,
  scanned_at: "2099-12-31T00:00:00Z", // different time, same target+commit
};

const SOURCE_B_DIFFERENT_COMMIT: BucketSource = {
  ...SOURCE_A,
  commit: "def456",
};

const SOURCE_C_DIFFERENT_TARGET: BucketSource = {
  target: "github:block/other",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

describe("valueRowId", () => {
  it("produces stable hex IDs", () => {
    const id = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic — same inputs give same ID", () => {
    const id1 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    const id2 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    expect(id1).toBe(id2);
  });

  it("ignores scanned_at and scanner_version — same target+commit+content gives same ID", () => {
    const id1 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    const id2 = valueRowId(
      SOURCE_A_OTHER_TIME,
      "color",
      "#f97316",
      "bg-orange-500",
    );
    expect(id1).toBe(id2);
  });

  it("differs across commits", () => {
    const id1 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    const id2 = valueRowId(
      SOURCE_B_DIFFERENT_COMMIT,
      "color",
      "#f97316",
      "bg-orange-500",
    );
    expect(id1).not.toBe(id2);
  });

  it("differs across targets", () => {
    const id1 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    const id2 = valueRowId(
      SOURCE_C_DIFFERENT_TARGET,
      "color",
      "#f97316",
      "bg-orange-500",
    );
    expect(id1).not.toBe(id2);
  });

  it("differs across kinds", () => {
    const colorId = valueRowId(SOURCE_A, "color", "8", "8px");
    const spacingId = valueRowId(SOURCE_A, "spacing", "8", "8px");
    expect(colorId).not.toBe(spacingId);
  });

  it("differs when raw form differs but value matches", () => {
    const id1 = valueRowId(SOURCE_A, "color", "#f97316", "bg-orange-500");
    const id2 = valueRowId(SOURCE_A, "color", "#f97316", "var(--brand)");
    expect(id1).not.toBe(id2);
  });
});

describe("section-tagged IDs are non-colliding", () => {
  it("token vs value with same name does not collide", () => {
    const tokenId = tokenRowId(SOURCE_A, "Button");
    const valueId = valueRowId(SOURCE_A, "color", "Button", "Button");
    expect(tokenId).not.toBe(valueId);
  });

  it("token vs component with same name does not collide", () => {
    const tokenId = tokenRowId(SOURCE_A, "Button");
    const componentId = componentRowId(SOURCE_A, "Button");
    expect(tokenId).not.toBe(componentId);
  });
});

describe("token / component IDs", () => {
  it("are deterministic", () => {
    expect(tokenRowId(SOURCE_A, "--color-brand-primary")).toBe(
      tokenRowId(SOURCE_A, "--color-brand-primary"),
    );
    expect(componentRowId(SOURCE_A, "Button")).toBe(
      componentRowId(SOURCE_A, "Button"),
    );
  });

  it("differ across names within a section", () => {
    expect(tokenRowId(SOURCE_A, "--brand")).not.toBe(
      tokenRowId(SOURCE_A, "--accent"),
    );
  });
});
