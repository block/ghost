import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  DimensionAck,
  Fingerprint,
  FingerprintComparison,
  SyncManifest,
} from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCli } from "../src/cli.js";
import {
  buildGateReport,
  formatGateReportCLI,
  formatGateReportJSON,
  gateExitCode,
} from "../src/core/gate.js";

function makeFingerprint(id: string): Fingerprint {
  return {
    id,
    source: "registry",
    timestamp: new Date().toISOString(),
    palette: {
      dominant: [],
      neutrals: { steps: [], count: 0 },
      semantic: [],
      saturationProfile: "muted",
      contrast: "moderate",
    },
    spacing: { scale: [], regularity: 0, baseUnit: null },
    typography: {
      families: [],
      sizeRamp: [],
      weightDistribution: {},
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [],
      shadowComplexity: "deliberate-none",
      borderUsage: "minimal",
    },
    embedding: [],
  };
}

function makeComparison(
  dimensions: Record<string, number>,
  ids: { source: string; target: string } = {
    source: "tracked",
    target: "local",
  },
): FingerprintComparison {
  const distances = Object.values(dimensions);
  const distance =
    distances.length === 0
      ? 0
      : distances.reduce((a, b) => a + b, 0) / distances.length;
  return {
    source: makeFingerprint(ids.source),
    target: makeFingerprint(ids.target),
    distance,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([key, dist]) => [
        key,
        { dimension: key, distance: dist, description: "" },
      ]),
    ),
    summary: "",
  };
}

function makeManifest(
  dimensions: Record<string, Partial<DimensionAck>>,
): SyncManifest {
  const fullDimensions: Record<string, DimensionAck> = {};
  for (const [key, partial] of Object.entries(dimensions)) {
    fullDimensions[key] = {
      distance: 0.1,
      stance: "accepted",
      ackedAt: new Date().toISOString(),
      ...partial,
    };
  }
  return {
    tracks: { type: "path", value: "./tracked.fingerprint.md" },
    ackedAt: new Date().toISOString(),
    trackedFingerprintId: "tracked",
    localFingerprintId: "local",
    dimensions: fullDimensions,
    overallDistance: 0,
  };
}

describe("buildGateReport", () => {
  it("schema field is present and correctly versioned", () => {
    const report = buildGateReport({
      comparison: makeComparison({ palette: 0 }),
      manifest: makeManifest({ palette: { distance: 0, stance: "aligned" } }),
    });
    expect(report.schema).toBe("ghost.compare.gate/v1");
  });

  it("aligned: zero distances and matching aligned acks", () => {
    const comparison = makeComparison({ palette: 0, spacing: 0 });
    const manifest = makeManifest({
      palette: { distance: 0, stance: "aligned" },
      spacing: { distance: 0, stance: "aligned" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.palette.verdict).toBe("aligned");
    expect(report.dimensions.spacing.verdict).toBe("aligned");
    expect(report.overall.verdict).toBe("aligned");
    expect(gateExitCode(report)).toBe(0);
  });

  it("covered (accepted): distances match acks, stance accepted", () => {
    const comparison = makeComparison({ palette: 0.2, spacing: 0.1 });
    const manifest = makeManifest({
      palette: { distance: 0.2, stance: "accepted" },
      spacing: { distance: 0.1, stance: "accepted" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.palette.verdict).toBe("covered");
    expect(report.dimensions.spacing.verdict).toBe("covered");
    expect(report.overall.verdict).toBe("covered");
    expect(gateExitCode(report)).toBe(0);
  });

  it("diverging covered: current ≤ acked, stance diverging", () => {
    const comparison = makeComparison({
      palette: 0.2,
      decisions: 0.0,
    });
    const manifest = makeManifest({
      palette: { distance: 0.2, stance: "accepted" },
      decisions: { distance: 0.0, stance: "diverging" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.decisions.verdict).toBe("covered");
    expect(report.dimensions.decisions.stance).toBe("diverging");
    expect(report.overall.verdict).toBe("covered");
    expect(gateExitCode(report)).toBe(0);
  });

  it("reconverging surfaced: diverging dim with current < 50% of acked", () => {
    const comparison = makeComparison({ palette: 0.1 });
    const manifest = makeManifest({
      palette: { distance: 0.4, stance: "diverging" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.palette.verdict).toBe("reconverging");
    expect(report.overall.verdict).toBe("covered");
    expect(gateExitCode(report)).toBe(0);
  });

  it("uncovered (exceeded tolerance): exit 1, reason explains exceedance", () => {
    const comparison = makeComparison({ palette: 0.95, spacing: 0.1 });
    const manifest = makeManifest({
      palette: { distance: 0.875, stance: "accepted" },
      spacing: { distance: 0.1, stance: "accepted" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.palette.verdict).toBe("uncovered");
    expect(report.dimensions.palette.reason).toContain("exceeds");
    expect(report.dimensions.spacing.verdict).toBe("covered");
    expect(report.overall.verdict).toBe("uncovered");
    expect(gateExitCode(report)).toBe(1);
  });

  it("uncovered (new dimension): comparison has dimension manifest doesn't cover", () => {
    const comparison = makeComparison({
      palette: 0.1,
      newDimension: 0.4,
    });
    const manifest = makeManifest({
      palette: { distance: 0.1, stance: "accepted" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.newDimension.verdict).toBe("uncovered");
    expect(report.dimensions.newDimension.reason).toBe("no ack recorded");
    expect(report.overall.verdict).toBe("uncovered");
    expect(gateExitCode(report)).toBe(1);
  });

  it("diverging exceeded --max-divergence-days flagged uncovered", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const comparison = makeComparison({ palette: 0.5 });
    const manifest = makeManifest({
      palette: {
        distance: 0.4,
        stance: "diverging",
        divergedAt: oldDate.toISOString(),
      },
    });
    const report = buildGateReport({
      comparison,
      manifest,
      maxDivergenceDays: 30,
    });
    expect(report.dimensions.palette.verdict).toBe("uncovered");
    expect(report.dimensions.palette.reason).toContain("max-divergence-days");
    expect(gateExitCode(report)).toBe(1);
  });

  it("CLI output: per-dimension lines with markers and final overall verdict", () => {
    const comparison = makeComparison({
      palette: 0.95,
      spacing: 0.0,
    });
    const manifest = makeManifest({
      palette: { distance: 0.875, stance: "accepted" },
      spacing: { distance: 0.0, stance: "aligned" },
    });
    const report = buildGateReport({ comparison, manifest });
    const text = formatGateReportCLI(report);
    expect(text).toContain("✓"); // aligned
    expect(text).toContain("✗"); // uncovered
    expect(text).toMatch(/Overall: uncovered/);
    expect(text).toMatch(/palette/);
    expect(text).toMatch(/spacing/);
  });

  it("JSON output: structured shape with schema field", () => {
    const comparison = makeComparison({ palette: 0.2 });
    const manifest = makeManifest({
      palette: { distance: 0.2, stance: "accepted" },
    });
    const json = formatGateReportJSON(
      buildGateReport({ comparison, manifest }),
    );
    expect(json).toContain('"schema":"ghost.compare.gate/v1"');
    const parsed = JSON.parse(json);
    expect(parsed.dimensions.palette.verdict).toBe("covered");
  });
});

// --- CLI integration tests ---

const FINGERPRINT = `---
id: local
source: llm
timestamp: 2026-04-24T00:00:00.000Z
palette:
  dominant:
    - { role: primary, value: "#111111" }
  neutrals: { steps: ["#ffffff", "#111111"], count: 2 }
  semantic: []
  saturationProfile: muted
  contrast: high
spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }
typography:
  families: ["Inter"]
  sizeRamp: [12, 16, 24]
  weightDistribution: { 400: 1 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Quiet and direct.

# Decisions

### shape-language
Use modest radii.
`;

function fingerprintWithId(id: string): string {
  return FINGERPRINT.replace("id: local", `id: ${id}`);
}

async function runCli(argv: string[], cwd: string) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stderr += chunk.toString();
      return true;
    });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
    stdout += `${args.join(" ")}\n`;
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    stderr += `${args.join(" ")}\n`;
  });
  const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCode = typeof code === "number" ? code : 0;
    finish();
    return undefined as never;
  });

  try {
    process.chdir(cwd);
    cli.parse(["node", "ghost-drift", ...argv]);
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 5000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}

describe("ghost-drift compare --gate (CLI)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(join(tmpdir(), "ghost-drift-gate-")),
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("missing sync file with --gate exits 2 and mentions the path", async () => {
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), fingerprintWithId("b"));

    const { stderr, code } = await runCli(
      ["compare", "a.fingerprint.md", "b.fingerprint.md", "--gate"],
      dir,
    );

    expect(code).toBe(2);
    expect(stderr).toMatch(/sync manifest not found/);
    expect(stderr).toContain(join(dir, ".ghost-sync.json"));
  });

  it("--gate --format json emits ghost.compare.gate/v1", async () => {
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), fingerprintWithId("b"));
    const manifest: SyncManifest = {
      tracks: { type: "path", value: "./a.fingerprint.md" },
      ackedAt: new Date().toISOString(),
      trackedFingerprintId: "a",
      localFingerprintId: "b",
      // Pre-populate every dimension with a generous tolerance so identical
      // fingerprints come back fully covered.
      dimensions: {
        decisions: {
          distance: 0,
          stance: "aligned",
          ackedAt: new Date().toISOString(),
          tolerance: 1,
        },
        palette: {
          distance: 0,
          stance: "aligned",
          ackedAt: new Date().toISOString(),
          tolerance: 1,
        },
        spacing: {
          distance: 0,
          stance: "aligned",
          ackedAt: new Date().toISOString(),
          tolerance: 1,
        },
        typography: {
          distance: 0,
          stance: "aligned",
          ackedAt: new Date().toISOString(),
          tolerance: 1,
        },
        surfaces: {
          distance: 0,
          stance: "aligned",
          ackedAt: new Date().toISOString(),
          tolerance: 1,
        },
      },
      overallDistance: 0,
    };
    await writeFile(
      join(dir, ".ghost-sync.json"),
      JSON.stringify(manifest, null, 2),
    );

    const { stdout, code } = await runCli(
      [
        "compare",
        "a.fingerprint.md",
        "b.fingerprint.md",
        "--gate",
        "--format",
        "json",
      ],
      dir,
    );

    expect(code).toBe(0);
    expect(stdout).toContain('"schema":"ghost.compare.gate/v1"');
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.overall.verdict).toMatch(/aligned|covered/);
  });

  it("--gate with N≠2 exits 2", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    const { code, stderr } = await runCli(
      ["compare", "a.fingerprint.md", "--gate"],
      dir,
    );
    expect(code).toBe(2);
    expect(stderr).toMatch(/--gate requires exactly 2/);
  });
});

describe("uncovered JSON schema snippet (visible to caller)", () => {
  it("matches the documented gate report shape for an uncovered dim", () => {
    const comparison = makeComparison(
      {
        spacing: 0.73,
        palette: 0.95,
        decisions: 0.0,
        newDimension: 0.4,
      },
      { source: "market-theme", target: "example-app" },
    );
    const manifest = makeManifest({
      spacing: { distance: 0.73, stance: "accepted" },
      palette: { distance: 0.875, stance: "accepted" },
      decisions: { distance: 0.0, stance: "diverging" },
    });
    const report = buildGateReport({ comparison, manifest });
    expect(report.dimensions.palette.verdict).toBe("uncovered");
    expect(report.dimensions.newDimension.verdict).toBe("uncovered");
    expect(report.overall.verdict).toBe("uncovered");
    // Dump for the caller to verify the produced shape.
    process.stdout.write(`${formatGateReportJSON(report)}\n`);
  });
});
