import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/scan/scan-status.js";

describe("scanStatus contribution", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-contribution-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports missing before manifest.yml exists", async () => {
    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("missing");
    expect(status.recommended_next).toBe("fingerprint");
    expect(status.contribution.state).toBe("missing");
    expect(status.contribution.contributing_facets).toEqual([]);
    expect(status.contribution.absent_facets).toEqual([
      "intent",
      "inventory",
      "composition",
    ]);
    expect(status.contribution.reasons.join(" ")).toContain(
      "manifest.yml is missing",
    );
  });

  it("reports empty contribution for manifest-only packages", async () => {
    await writePackage(dir, {});

    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("present");
    expect("cache" in status).toBe(false);
    expect("readiness" in status).toBe(false);
    expect("checks" in status).toBe(false);
    expect(status.recommended_next).toBeNull();
    expect(status.contribution.state).toBe("empty");
    expect(status.contribution.contributing_facets).toEqual([]);
    expect(status.contribution.empty_facets).toEqual([]);
    expect(status.contribution.absent_facets).toEqual([
      "intent",
      "inventory",
      "composition",
    ]);
    expect(status.contribution.facets.intent).toMatchObject({
      state: "absent",
      count: 0,
      file_present: false,
    });
  });

  it("reports empty facets when starter facet files are present but blank", async () => {
    await writePackage(dir, {
      intent: `summary: {}
situations: []
principles: []
experience_contracts: []
`,
      inventory: `building_blocks: {}
exemplars: []
sources: []
`,
      composition: `patterns: []
`,
    });

    const status = await scanStatus(dir);

    expect(status.contribution.state).toBe("empty");
    expect(status.contribution.contributing_facets).toEqual([]);
    expect(status.contribution.empty_facets).toEqual([
      "intent",
      "inventory",
      "composition",
    ]);
    expect(status.contribution.absent_facets).toEqual([]);
  });

  it("does not report sources cache as package contribution", async () => {
    await mkdir(join(dir, "sources", "cache"), {
      recursive: true,
    });
    await writeFile(join(dir, "sources", "cache", "inventory.json"), "{}\n");
    await writePackage(dir, {});

    const status = await scanStatus(dir);

    expect("cache" in status).toBe(false);
    expect(status.contribution.state).toBe("empty");
    expect(status.contribution.facets.inventory.count).toBe(0);
  });

  it("reports intent contribution without requiring inventory or composition", async () => {
    await writePackage(dir, {
      intent: `summary:
  product: Cash iOS
`,
    });

    const status = await scanStatus(dir);

    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual(["intent"]);
    expect(status.contribution.absent_facets).toEqual([
      "inventory",
      "composition",
    ]);
    expect(status.contribution.facets.intent).toMatchObject({
      state: "useful",
      count: 1,
      file_present: true,
    });
  });

  it("reports inventory contribution and counts curated sources", async () => {
    await writePackage(dir, {
      inventory: `building_blocks:
  tokens:
    - color.background
  components:
    - DataTable
exemplars: []
sources:
  - id: writing-guide
    kind: file
    ref: docs/writing.md
`,
    });

    const status = await scanStatus(dir);

    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual(["inventory"]);
    expect(status.contribution.facets.inventory).toMatchObject({
      state: "useful",
      count: 3,
    });
    expect(status.contribution.building_block_rows.tokens).toBe(1);
    expect(status.contribution.building_block_rows.components).toBe(1);
    expect(status.contribution.absent_facets).toEqual([
      "intent",
      "composition",
    ]);
  });

  it("reports composition contribution without requiring sibling facets", async () => {
    await writePackage(dir, {
      composition: `patterns:
  - id: preserve-table-density
    kind: layout
    pattern: Keep dense operational tables scannable.
`,
    });

    const status = await scanStatus(dir);

    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual(["composition"]);
    expect(status.contribution.facets.composition).toMatchObject({
      state: "useful",
      count: 1,
    });
    expect(status.contribution.absent_facets).toEqual(["intent", "inventory"]);
  });

  it("reports multiple sparse contributions without calling absent facets missing", async () => {
    await writePackage(dir, {
      intent: `principles:
  - id: dense-workflows-prioritize-scanning
    principle: Dense workflows optimize for comparison and recovery.
`,
      inventory: `building_blocks:
  tokens:
    - color.background
`,
    });

    const status = await scanStatus(dir);

    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual([
      "intent",
      "inventory",
    ]);
    expect(status.contribution.absent_facets).toEqual(["composition"]);
    expect(status.contribution.reasons[0]).toContain(
      "Absent facets may be inherited",
    );
  });

  it("reports all useful facets when the package contributes the full local set", async () => {
    await writePackage(dir, {
      intent: `principles:
  - id: dense-workflows-prioritize-scanning
    principle: Dense workflows optimize for comparison and recovery.
`,
      inventory: `exemplars:
  - id: orders-table
    path: apps/dashboard/orders.tsx
    surface: dashboard
    refs:
      - composition.pattern:preserve-table-density
building_blocks:
  tokens:
    - color.background
  components:
    - DataTable
sources: []
`,
      composition: `patterns:
  - id: preserve-table-density
    kind: layout
    pattern: Keep dense operational tables scannable.
`,
    });

    const status = await scanStatus(dir);

    expect("cache" in status).toBe(false);
    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual([
      "intent",
      "inventory",
      "composition",
    ]);
    expect(status.contribution.facets).toMatchObject({
      intent: { state: "useful", count: 1 },
      inventory: { state: "useful", count: 3 },
      composition: { state: "useful", count: 1 },
    });
    expect(status.contribution.building_block_rows.tokens).toBe(1);
    expect(status.contribution.building_block_rows.components).toBe(1);
    expect(status.contribution.product_surface_count).toBe(1);
  });
});

async function writePackage(
  dir: string,
  facets: {
    intent?: string;
    inventory?: string;
    composition?: string;
  },
): Promise<void> {
  const packageDir = dir;
  await mkdir(packageDir, { recursive: true });
  await writeFile(
    join(packageDir, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: test\n",
  );
  await Promise.all(
    Object.entries(facets).map(([facet, content]) =>
      writeFile(join(packageDir, `${facet}.yml`), content),
    ),
  );
}
