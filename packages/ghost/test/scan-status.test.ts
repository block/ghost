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

  it("reports pending readiness before fingerprint.yml exists", async () => {
    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("missing");
    expect(status.recommended_next).toBe("fingerprint");
    expect(status.readiness.state).toBe("pending");
    expect(status.readiness.reasons.join(" ")).toContain(
      "fingerprint.yml is missing",
    );
  });

  it("reports empty memory when fingerprint.yml has no product-experience entries", async () => {
    await writeFile(join(dir, "fingerprint.yml"), fingerprintFile());

    const status = await scanStatus(dir);

    expect(status.fingerprint.state).toBe("present");
    expect(status.cache.state).toBe("missing");
    expect(status.recommended_next).toBeNull();
    expect(status.readiness.state).toBe("memory-empty");
    expect(status.readiness.cannot_review).toContain("product identity");
  });

  it("reports ready memory when fingerprint.yml has experience entries", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
principles:
  - id: dense-workflows-prioritize-scanning
    principle: Dense workflows optimize for comparison and recovery.
patterns:
  - id: preserve-table-density
    kind: composition
    pattern: Keep dense operational tables scannable.
implementation_vocabulary:
  tokens:
    - color.background
  components:
    - DataTable
`),
    );

    const status = await scanStatus(dir);

    expect(status.cache.state).toBe("missing");
    expect(status.readiness.state).toBe("memory-ready");
    expect(status.readiness.implementation_vocabulary_rows.tokens).toBe(1);
    expect(status.readiness.implementation_vocabulary_rows.components).toBe(1);
    expect(status.readiness.can_review).toContain("surface behavior");
  });

  it("reports implementation-only when only components and tokens are recorded", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      fingerprintFile(`
principles: []
patterns: []
implementation_vocabulary:
  tokens:
    - color.background
  components:
    - DataTable
`),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("implementation-only");
    expect(status.readiness.cannot_review).toContain("product identity");
    expect(status.readiness.reasons.join(" ")).toContain("available material");
  });
});

function fingerprintFile(overrides = ""): string {
  if (overrides.trim()) {
    return `schema: ghost.fingerprint/v1
${overrides}`;
  }
  return "schema: ghost.fingerprint/v1\n";
}
