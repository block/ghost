import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  FLEET_FILENAME,
  FLEET_JSON_FILENAME,
  FleetFrontmatterSchema,
  REQUIRED_BODY_SECTIONS,
} from "../src/core/schema.js";
import {
  buildFleetView,
  renderFleetJson,
  renderFleetMarkdown,
  writeFleetView,
} from "../src/core/view.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FLEET = resolve(HERE, "fixtures/small-fleet");

describe("buildFleetView", () => {
  it("returns the canonical FleetView shape", async () => {
    const { view } = await buildFleetView(FLEET, {
      now: new Date("2026-04-27T00:00:00Z"),
      id: "small-fleet",
    });

    expect(view.schema).toBe("ghost.fleet/v1");
    expect(view.id).toBe("small-fleet");
    expect(view.generated_at).toBe("2026-04-27");
    expect(view.members.map((m) => m.id).sort()).toEqual([
      "cash-android",
      "cash-web",
      "ghost-ui",
    ]);
    expect(view.distances).toHaveLength(3);
    expect(view.tracks).toEqual([{ from: "cash-web", to: "ghost-ui" }]);
    expect(Object.keys(view.groupings).sort()).toEqual([
      "by_build_system",
      "by_platform",
      "by_registry",
      "by_rendering",
      "by_styling",
    ]);
  });

  it("emits a frontmatter shape that validates against FleetFrontmatterSchema", async () => {
    const { view } = await buildFleetView(FLEET, {
      now: new Date("2026-04-27T00:00:00Z"),
      id: "small-fleet",
    });
    // Composition: view → frontmatter, run through the schema. This is
    // the same shape the lint verb (when added) would gate on.
    const result = FleetFrontmatterSchema.safeParse(view);
    expect(result.success).toBe(true);
  });
});

describe("renderFleetJson", () => {
  it("serializes the view as stable JSON ending in a newline", async () => {
    const { view } = await buildFleetView(FLEET, {
      now: new Date("2026-04-27T00:00:00Z"),
      id: "small-fleet",
    });
    const json = renderFleetJson(view);
    expect(json.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe("ghost.fleet/v1");
    expect(parsed.id).toBe("small-fleet");
  });
});

describe("renderFleetMarkdown", () => {
  it("emits a frontmatter block plus the three required body section headings", async () => {
    const { view } = await buildFleetView(FLEET, {
      now: new Date("2026-04-27T00:00:00Z"),
      id: "small-fleet",
    });
    const md = renderFleetMarkdown(view);
    expect(md.startsWith("---\n")).toBe(true);
    for (const section of REQUIRED_BODY_SECTIONS) {
      expect(md).toContain(`## ${section}`);
    }
    // Frontmatter block must be parseable YAML and validate against the schema.
    const fmMatch = /^---\n([\s\S]*?)\n---/.exec(md);
    expect(fmMatch).not.toBeNull();
    const fm = parseYaml(fmMatch?.[1] ?? "");
    const result = FleetFrontmatterSchema.safeParse(fm);
    expect(result.success).toBe(true);
  });
});

describe("writeFleetView", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "ghost-fleet-test-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("writes fleet.md and fleet.json into <dir>/reports/", async () => {
    const result = await writeFleetView(FLEET, {
      outDir: tmp,
      now: new Date("2026-04-27T00:00:00Z"),
      id: "small-fleet",
    });
    expect(result.files).toEqual([FLEET_FILENAME, FLEET_JSON_FILENAME]);

    const md = await readFile(join(tmp, FLEET_FILENAME), "utf-8");
    expect(md).toContain("schema: ghost.fleet/v1");
    expect(md).toContain("## World shape");

    const json = JSON.parse(
      await readFile(join(tmp, FLEET_JSON_FILENAME), "utf-8"),
    );
    expect(json.id).toBe("small-fleet");
    expect(json.distances).toHaveLength(3);
  });
});
