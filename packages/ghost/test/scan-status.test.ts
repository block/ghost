import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
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

  it("reports fingerprint-missing before manifest.yml exists", async () => {
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
      "fingerprint/manifest.yml is missing",
    );
  });

  it("reports fingerprint-empty when no layer has useful content", async () => {
    await writeFingerprint(dir);

    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("present");
    expect("cache" in status).toBe(false);
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

  it("does not report sources cache as package readiness", async () => {
    await mkdir(join(dir, "fingerprint", "sources", "cache"), {
      recursive: true,
    });
    await writeFile(
      join(dir, "fingerprint", "sources", "cache", "inventory.json"),
      "{}\n",
    );
    await writeFingerprint(dir);

    const status = await scanStatus(dir);

    expect("cache" in status).toBe(false);
    expect(status.readiness.state).toBe("fingerprint-empty");
    expect(status.readiness.layer_counts.inventory).toBe(0);
  });

  it("reports prose-only when only summary prose is recorded", async () => {
    await writeFingerprint(
      dir,
      `
prose:
  summary:
    product: Cash iOS
`,
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
    await writeFingerprint(
      dir,
      `
inventory:
  building_blocks:
    tokens:
      - color.background
    components:
      - DataTable
`,
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
    await writeFingerprint(
      dir,
      `
composition:
  patterns:
    - id: preserve-table-density
      kind: layout
      pattern: Keep dense operational tables scannable.
`,
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
    await writeFingerprint(
      dir,
      `
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
`,
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
    await writeFingerprint(
      dir,
      `
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
`,
    );

    const status = await scanStatus(dir);

    expect("cache" in status).toBe(false);
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

async function writeFingerprint(dir: string, overrides = ""): Promise<void> {
  const fingerprintDir = join(dir, "fingerprint");
  await mkdir(fingerprintDir, { recursive: true });
  await writeFile(
    join(fingerprintDir, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: test\n",
  );
  const doc = overrides.trim()
    ? (parseYaml(`schema: ghost.fingerprint/v1\n${overrides}`) as Record<
        string,
        unknown
      >)
    : {};
  await Promise.all([
    writeFile(
      join(fingerprintDir, "prose.yml"),
      stringifyYaml(
        doc.prose ?? {
          summary: {},
          situations: [],
          principles: [],
          experience_contracts: [],
        },
      ),
    ),
    writeFile(
      join(fingerprintDir, "inventory.yml"),
      stringifyYaml(
        doc.inventory ?? {
          topology: {},
          building_blocks: {},
          exemplars: [],
          sources: [],
        },
      ),
    ),
    writeFile(
      join(fingerprintDir, "composition.yml"),
      stringifyYaml(doc.composition ?? { patterns: [] }),
    ),
  ]);
}
