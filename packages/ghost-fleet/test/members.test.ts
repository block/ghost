import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadMembers, summarizeMember } from "../src/core/members.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FLEET = resolve(HERE, "fixtures/small-fleet");

describe("loadMembers", () => {
  it("loads each member directory under <dir>/members/", async () => {
    const members = await loadMembers(FLEET);
    expect(members.map((m) => m.id).sort()).toEqual([
      "cash-android",
      "cash-web",
      "ghost-ui",
    ]);
  });

  it("parses each member's map.md frontmatter", async () => {
    const members = await loadMembers(FLEET);
    const cashWeb = members.find((m) => m.id === "cash-web");
    expect(cashWeb?.mapStatus).toBe("ok");
    expect(cashWeb?.map?.platform).toBe("web");
    expect(cashWeb?.map?.build_system).toBe("pnpm");
    expect(cashWeb?.map?.registry?.components).toBe(24);

    const cashAndroid = members.find((m) => m.id === "cash-android");
    expect(cashAndroid?.map?.platform).toBe("android");
    expect(cashAndroid?.map?.registry).toBeUndefined();
  });

  it("loads each member's expression with embedding backfilled", async () => {
    const members = await loadMembers(FLEET);
    for (const member of members) {
      expect(member.expressionStatus).toBe("ok");
      expect(member.expression).toBeDefined();
      // Embedding is the load-bearing data structure for fleet's pairwise
      // distances; it must be present (computed if missing in YAML).
      expect(member.expression?.embedding.length).toBeGreaterThan(0);
      expect(typeof member.expressionMtime).toBe("string");
    }
  });

  it("surfaces tracks targets from .ghost-sync.json when present", async () => {
    const members = await loadMembers(FLEET);
    const cashWeb = members.find((m) => m.id === "cash-web");
    const ghostUi = members.find((m) => m.id === "ghost-ui");
    expect(cashWeb?.tracks).toBe("ghost-ui");
    // ghost-ui has no .ghost-sync.json → tracks is undefined
    expect(ghostUi?.tracks).toBeUndefined();
  });

  it("returns an empty list when the directory has no member subdirectories", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "ghost-fleet-empty-"));
    try {
      const members = await loadMembers(tmp);
      expect(members).toEqual([]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("summarizeMember", () => {
  it("flattens a member into the freshness row", async () => {
    const members = await loadMembers(FLEET);
    const cashWeb = members.find((m) => m.id === "cash-web");
    if (!cashWeb) throw new Error("missing cash-web");
    const summary = summarizeMember(cashWeb);
    expect(summary.id).toBe("cash-web");
    expect(summary.platform).toBe("web");
    expect(summary.build_system).toBe("pnpm");
    expect(summary.registry).toBe("registry.json");
    expect(summary.ok).toBe(true);
    expect(summary.expression_mtime).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("renders 'none' as null for non-shadcn members", async () => {
    const members = await loadMembers(FLEET);
    const cashAndroid = members.find((m) => m.id === "cash-android");
    if (!cashAndroid) throw new Error("missing cash-android");
    const summary = summarizeMember(cashAndroid);
    expect(summary.registry).toBeNull();
  });
});
