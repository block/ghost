import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  computeGroupings,
  computePairwiseDistances,
  computeTracks,
} from "../src/core/compute.js";
import { loadMembers } from "../src/core/members.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FLEET = resolve(HERE, "fixtures/small-fleet");

describe("computePairwiseDistances", () => {
  it("computes one entry per unordered pair, sorted by id", async () => {
    const members = await loadMembers(FLEET);
    const distances = computePairwiseDistances(members);

    // 3 members → 3 unique pairs
    expect(distances).toHaveLength(3);

    const pairs = distances.map((d) => `${d.a}|${d.b}`);
    expect(pairs).toEqual([
      "cash-android|cash-web",
      "cash-android|ghost-ui",
      "cash-web|ghost-ui",
    ]);

    for (const d of distances) {
      expect(d.distance).toBeGreaterThan(0);
      expect(d.distance).toBeLessThanOrEqual(1);
      expect(typeof d.distance).toBe("number");
    }
  });

  it("returns the same distance for equivalent expressions across calls", async () => {
    const members = await loadMembers(FLEET);
    const a = computePairwiseDistances(members);
    const b = computePairwiseDistances(members);
    expect(a).toEqual(b);
  });

  it("uses each member's id from map.md (not the directory basename) for the pair labels", async () => {
    const members = await loadMembers(FLEET);
    const distances = computePairwiseDistances(members);
    const ids = new Set(distances.flatMap((d) => [d.a, d.b]));
    expect(ids).toEqual(new Set(["cash-android", "cash-web", "ghost-ui"]));
  });
});

describe("computeGroupings", () => {
  it("groups by the five axes from each member's map.md", async () => {
    const members = await loadMembers(FLEET);
    const groupings = computeGroupings(members);

    expect(groupings.by_platform.web).toEqual(["cash-web", "ghost-ui"]);
    expect(groupings.by_platform.android).toEqual(["cash-android"]);

    expect(groupings.by_build_system.pnpm).toEqual(["cash-web", "ghost-ui"]);
    expect(groupings.by_build_system.gradle).toEqual(["cash-android"]);

    expect(groupings.by_registry.shadcn).toEqual(["cash-web", "ghost-ui"]);
    expect(groupings.by_registry.none).toEqual(["cash-android"]);

    expect(groupings.by_rendering.react).toEqual(["cash-web", "ghost-ui"]);
    expect(groupings.by_rendering.compose).toEqual(["cash-android"]);

    expect(groupings.by_styling.tailwind).toEqual(["cash-web", "ghost-ui"]);
    expect(groupings.by_styling.material3).toEqual(["cash-android"]);
  });
});

describe("computeTracks", () => {
  it("emits one edge per member that declares a tracks target", async () => {
    const members = await loadMembers(FLEET);
    const tracks = computeTracks(members);
    expect(tracks).toEqual([{ from: "cash-web", to: "ghost-ui" }]);
  });

  it("emits no edges when no members track anyone", async () => {
    const tracks = computeTracks([]);
    expect(tracks).toEqual([]);
  });
});
