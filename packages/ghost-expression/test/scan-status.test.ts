import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/core/scan-status.js";

describe("scanStatus", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-scan-status-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports all-missing for an empty directory", async () => {
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("missing");
    expect(status.survey.state).toBe("missing");
    expect(status.expression.state).toBe("missing");
    expect(status.recommended_next).toBe("map");
  });

  it("recommends survey when only map.md exists", async () => {
    await writeFile(join(dir, "map.md"), "---\nschema: ghost.map/v2\n---\n");
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("present");
    expect(status.survey.state).toBe("missing");
    expect(status.recommended_next).toBe("survey");
  });

  it("recommends expression when map + survey exist but expression is missing", async () => {
    await writeFile(join(dir, "map.md"), "---\nschema: ghost.map/v2\n---\n");
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify({ schema: "ghost.survey/v2" }),
    );
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("present");
    expect(status.survey.state).toBe("present");
    expect(status.expression.state).toBe("missing");
    expect(status.recommended_next).toBe("expression");
  });

  it("returns recommended_next: null when every stage is present", async () => {
    await writeFile(join(dir, "map.md"), "x");
    await writeFile(join(dir, "survey.json"), "{}");
    await writeFile(join(dir, "expression.md"), "y");
    const status = await scanStatus(dir);
    expect(status.recommended_next).toBeNull();
  });

  it("treats empty (zero-byte) artifacts as missing", async () => {
    await writeFile(join(dir, "map.md"), "");
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("missing");
    expect(status.recommended_next).toBe("map");
  });

  it("paths returned in the report are absolute", async () => {
    const status = await scanStatus(dir);
    expect(status.map.path.startsWith("/")).toBe(true);
    expect(status.dir).toBe(dir);
  });
});
