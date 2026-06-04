import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/scan/scan-status.js";

describe("scanStatus readiness", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-readiness-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports fingerprint-missing before fingerprint.yml exists", async () => {
    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("missing");
    expect(status.recommended_next).toBe("fingerprint");
    expect(status.readiness.state).toBe("fingerprint-missing");
    expect(status.readiness.missing_layers).toEqual([
      "prose",
      "inventory",
      "composition",
    ]);
    expect(status.readiness.reasons.join(" ")).toContain(
      "fingerprint.yml is missing",
    );
  });

  it("reports fingerprint-empty when no layer has useful content", async () => {
    await writeFile(join(dir, "fingerprint.yml"), fingerprintFile());

    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("present");
    expect(status.cache.state).toBe("missing");
    expect(status.recommended_next).toBeNull();
    expect(status.readiness.state).toBe("fingerprint-empty");
    expect(status.readiness.layer_counts).toEqual({
      prose: 0,
      inventory: 0,
      composition: 0,
    });
    expect(status.readiness.cannot_review).toEqual([
      "prose",
      "inventory",
      "composition",
    ]);
  });

  it("does not count generated cache as canonical inventory readiness", async () => {
    await mkdir(join(dir, "cache"), { recursive: true });
    await writeFile(join(dir, "cache", "inventory.json"), "{}\n");
    await writeFile(join(dir, "fingerprint.yml"), fingerprintFile());

    const status = await scanStatus(dir);

    expect(status.cache.state).toBe("present");
    expect(status.readiness.state).toBe("fingerprint-empty");
    expect(status.readiness.layer_counts.inventory).toBe(0);
  });

  it("reports prose-only when only summary prose is recorded", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
prose:
  summary:
    product: Cash iOS
`),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("prose-only");
    expect(status.readiness.layer_counts).toEqual({
      prose: 1,
      inventory: 0,
      composition: 0,
    });
    expect(status.readiness.missing_layers).toEqual([
      "inventory",
      "composition",
    ]);
  });

  it("reports inventory-only when only curated inventory is recorded", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
inventory:
  building_blocks:
    tokens:
      - color.background
    components:
      - DataTable
`),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("inventory-only");
    expect(status.readiness.layer_counts).toEqual({
      prose: 0,
      inventory: 2,
      composition: 0,
    });
    expect(status.readiness.building_block_rows.tokens).toBe(1);
    expect(status.readiness.building_block_rows.components).toBe(1);
    expect(status.readiness.missing_layers).toEqual(["prose", "composition"]);
  });

  it("reports composition-only when only patterns are recorded", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
composition:
  patterns:
    - id: preserve-table-density
      kind: layout
      pattern: Keep dense operational tables scannable.
`),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("composition-only");
    expect(status.readiness.layer_counts).toEqual({
      prose: 0,
      inventory: 0,
      composition: 1,
    });
    expect(status.readiness.missing_layers).toEqual(["prose", "inventory"]);
  });

  it("reports fingerprint-partial when exactly one useful layer is missing", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
prose:
  principles:
    - id: dense-workflows-prioritize-scanning
      principle: Dense workflows optimize for comparison and recovery.
inventory:
  topology:
    scopes:
      - id: dashboard
        paths: [apps/dashboard]
        surface_types: [dense-dashboard]
    surface_types: [dense-dashboard]
`),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("fingerprint-partial");
    expect(status.readiness.layer_counts).toEqual({
      prose: 1,
      inventory: 2,
      composition: 0,
    });
    expect(status.readiness.missing_layers).toEqual(["composition"]);
  });

  it("reports fingerprint-ready only when prose, inventory, and composition are useful", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
prose:
  principles:
    - id: dense-workflows-prioritize-scanning
      principle: Dense workflows optimize for comparison and recovery.
inventory:
  topology:
    scopes:
      - id: dashboard
        paths: [apps/dashboard]
        surface_types: [dense-dashboard]
    surface_types: [dense-dashboard]
  exemplars:
    - id: orders-table
      path: apps/dashboard/orders.tsx
      surface_type: dense-dashboard
      scope: dashboard
      refs:
        - composition.pattern:preserve-table-density
  building_blocks:
    tokens:
      - color.background
    components:
      - DataTable
composition:
  patterns:
    - id: preserve-table-density
      kind: layout
      pattern: Keep dense operational tables scannable.
`),
    );

    const status = await scanStatus(dir);

    expect(status.cache.state).toBe("missing");
    expect(status.readiness.state).toBe("fingerprint-ready");
    expect(status.readiness.layer_counts).toEqual({
      prose: 1,
      inventory: 5,
      composition: 1,
    });
    expect(status.readiness.missing_layers).toEqual([]);
    expect(status.readiness.building_block_rows.tokens).toBe(1);
    expect(status.readiness.building_block_rows.components).toBe(1);
    expect(status.readiness.product_surface_count).toBe(1);
    expect(status.readiness.can_review).toEqual([
      "prose",
      "inventory",
      "composition",
    ]);
  });
});

function fingerprintFile(overrides = ""): string {
  if (overrides.trim()) {
    return `schema: ghost.fingerprint/v2
${overrides}`;
  }
  return "schema: ghost.fingerprint/v2\n";
}
