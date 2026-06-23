import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildCli } from "../src/cli.js";
import { runDriftCheck } from "../src/drift-command.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const BASE_FINGERPRINT = `---
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
  return BASE_FINGERPRINT.replace("id: local", `id: ${id}`);
}

async function runCli(
  argv: string[],
  cwd: string,
  options: {
    allowNoExit?: boolean;
    env?: Record<string, string | undefined>;
  } = {},
) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  const previousEnv = new Map<string, string | undefined>();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stdout += chunk.toString();
      if (typeof callback === "function") callback();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stderr += chunk.toString();
      if (typeof callback === "function") callback();
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
    if (options.env) {
      for (const [key, value] of Object.entries(options.env)) {
        previousEnv.set(key, process.env[key]);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
    cli.parse(["node", "ghost", ...argv]);
    if (options.allowNoExit) {
      setTimeout(finish, 500);
    }
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    for (const [key, value] of previousEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}

describe("ghost CLI", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("prints compact top-level help for new adopters", async () => {
    const result = await runCli(["--help"], dir, { allowNoExit: true });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("ghost");
    expect(result.stdout).toContain("Core workflow");
    for (const command of [
      "init",
      "scan",
      "lint",
      "verify",
      "check",
      "review",
      "relay gather",
      "emit",
      "skill install",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain("ghost --help --all");
    expect(result.stdout).not.toContain("survey <op>");
    expect(result.stdout).not.toContain("diff <a> <b>");
    expect(result.stdout).not.toMatch(/\n {2}ack\s/);
    expect(result.stdout).not.toContain("track <fingerprint>");
    expect(result.stdout).not.toContain("diverge <dimension>");
    expect(result.stdout).not.toContain("proposal <op>");
  });

  it("prints the complete grouped command index with --help --all", async () => {
    const result = await runCli(["--help", "--all"], dir, {
      allowNoExit: true,
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Core workflow");
    expect(result.stdout).toContain("Advanced/package inspection");
    expect(result.stdout).toContain("Compare/stance");
    expect(result.stdout).toContain("Maintenance/legacy");
    for (const command of [
      "lint [file]",
      "init [dir]",
      "verify [dir]",
      "scan [dir]",
      "stack [paths...]",
      "signals [path]",
      "describe <fingerprint>",
      "diff <a> <b>",
      "survey <op> [...surveys]",
      "relay <action> [target]",
      "emit <kind>",
      "compare [...fingerprints]",
      "drift <action>",
      "ack",
      "track <fingerprint>",
      "diverge <dimension>",
      "skill <action>",
      "check",
      "review",
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("keeps command-specific --all help local to lint and verify", async () => {
    const lint = await runCli(["lint", "--help"], dir, { allowNoExit: true });
    const verify = await runCli(["verify", "--help"], dir, {
      allowNoExit: true,
    });

    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("--all");
    expect(lint.stdout).toContain("Validate every nested fingerprint package");
    expect(lint.stdout).not.toContain("Core workflow");
    expect(verify.code).toBe(0);
    expect(verify.stdout).toContain("--all");
    expect(verify.stdout).toContain("Verify every nested fingerprint package");
    expect(verify.stdout).not.toContain("Core workflow");
  });

  it("compares explicitly supplied fingerprint files", async () => {
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), fingerprintWithId("b"));

    const result = await runCli(
      ["compare", "a.fingerprint.md", "b.fingerprint.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Distance");
  });

  it("compares root fingerprint bundle directories", async () => {
    await writeComparableBundle(join(dir, "a", ".ghost"), "sectioned-form");
    await writeComparableBundle(join(dir, "b", ".ghost"), "data-table");

    const result = await runCli(["compare", "a/.ghost", "b/.ghost"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Distance");
  });

  it("track writes the neutral sync manifest shape", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );

    const result = await runCli(["track", "tracked.fingerprint.md"], dir);
    const manifest = JSON.parse(
      await readFile(join(dir, ".ghost-sync.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(result.code).toBe(0);
    expect(manifest.tracks).toEqual({
      type: "path",
      value: "tracked.fingerprint.md",
    });
    expect(manifest.trackedFingerprintId).toBe("tracked");
    expect(manifest.localFingerprintId).toBe("local");
    const legacyRelationFields = [
      "parent",
      ["parent", "FingerprintId"].join(""),
      ["child", "FingerprintId"].join(""),
    ];
    for (const field of legacyRelationFields) {
      expect(manifest).not.toHaveProperty(field);
    }
  });

  it("track bootstraps the sync manifest for canonical fingerprint packages", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );

    const track = await runCli(["track", "tracked/.ghost"], dir);
    const check = await runCli(["drift", "check", "--format", "json"], dir);

    expect(track.code).toBe(0);
    const manifest = JSON.parse(
      await readFile(join(dir, ".ghost-sync.json"), "utf-8"),
    );
    expect(manifest.tracks).toEqual({ type: "path", value: "tracked/.ghost" });
    expect(manifest.trackedFingerprintId).toBe("tracked");
    expect(manifest.localFingerprintId).toBe("local");
    expect(check.code).toBe(0);
    expect(JSON.parse(check.stdout).overall.verdict).toBe("covered");
  });

  it("ack and diverge write stance updates from the unified cli", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: './tracked.fingerprint.md' };\n",
    );

    const ack = await runCli(
      [
        "ack",
        "--stance",
        "aligned",
        "--reason",
        "baseline",
        "--format",
        "json",
      ],
      dir,
    );
    const diverge = await runCli(
      ["diverge", "typography", "--reason", "editorial", "--format", "json"],
      dir,
    );

    expect(ack.code).toBe(0);
    expect(JSON.parse(ack.stdout).trackedFingerprintId).toBe("tracked");
    expect(diverge.code).toBe(0);
    const manifest = JSON.parse(diverge.stdout);
    expect(manifest.dimensions.typography.stance).toBe("diverging");
    expect(manifest.dimensions.typography.reason).toBe("editorial");
  });

  it("ack reads canonical fingerprint packages from config tracks", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: './tracked/.ghost' };\n",
    );

    const ack = await runCli(["ack", "--format", "json"], dir);

    expect(ack.code).toBe(0);
    const manifest = JSON.parse(ack.stdout);
    expect(manifest.trackedFingerprintId).toBe("tracked");
    expect(manifest.localFingerprintId).toBe("local");
  });

  it("ack preserves npm tracks that expose a .ghost fingerprint", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await mkdir(join(dir, "node_modules", "@scope", "tracked", ".ghost"), {
      recursive: true,
    });
    await writeFile(
      join(
        dir,
        "node_modules",
        "@scope",
        "tracked",
        ".ghost",
        "fingerprint.md",
      ),
      fingerprintWithId("tracked"),
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: 'npm:@scope/tracked' };\n",
    );

    const ack = await runCli(["ack", "--format", "json"], dir);

    expect(ack.code).toBe(0);
    const manifest = JSON.parse(ack.stdout);
    expect(manifest.tracks).toEqual({ type: "npm", value: "@scope/tracked" });
    expect(manifest.trackedFingerprintId).toBe("tracked");
    expect(manifest.localFingerprintId).toBe("local");
  });

  it("drift check resolves npm tracks that expose canonical fingerprint packages", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "node_modules", "@scope", "tracked"), {
      checks: false,
    });
    await writeFile(
      join(
        dir,
        "node_modules",
        "@scope",
        "tracked",
        ".ghost",
        "fingerprint",
        "manifest.yml",
      ),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: 'npm:@scope/tracked' };\n",
    );

    const ack = await runCli(["ack", "--format", "json"], dir);
    const check = await runCli(["drift", "check", "--format", "json"], dir);

    expect(ack.code).toBe(0);
    expect(check.code).toBe(0);
    const report = JSON.parse(check.stdout);
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
    expect(report.overall.verdict).toBe("covered");
  });

  it("reports design-loop status as disabled by default", async () => {
    const result = await runCli(["drift", "status", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const status = JSON.parse(result.stdout);
    expect(status.schema).toBe("ghost.drift.status/v1");
    expect(status.designLoop).toEqual({
      enabled: false,
      mode: "off",
      source: "default",
    });
  });

  it("runs the Ghost-owned drift check contract through the stance ledger", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: './tracked.fingerprint.md' };\n",
    );
    await runCli(["track", "tracked.fingerprint.md"], dir);

    const result = await runCli(["drift", "check", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.drift.check/v1");
    expect(report.designLoop).toEqual({
      enabled: false,
      mode: "off",
      source: "default",
    });
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
    expect(report.overall.verdict).toBe("covered");
    expect(report.gate.schema).toBe("ghost.compare.gate/v1");
  });

  it("drift check prefers legacy fingerprint.md over survey cache identity", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, ".ghost", "survey.json"),
      JSON.stringify({
        schema: "ghost.survey/v1",
        sources: [
          { id: "cache", target: ".", scanned_at: "2026-05-10T00:00:00Z" },
        ],
        values: [],
        tokens: [],
        components: [],
        ui_surfaces: [],
      }),
    );
    await writeFile(
      join(dir, ".ghost", "patterns.yml"),
      `schema: ghost.patterns/v1
id: cache-local
surface_types: []
composition_patterns: []
`,
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked.fingerprint.md" });

    const result = await runCli(
      [
        "drift",
        "check",
        "--tracked",
        "tracked.fingerprint.md",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.localFingerprintId).toBe("local");
    expect(report.trackedFingerprintId).toBe("tracked");
  });

  it("drift check loads canonical fingerprint packages", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, ".ghost-sync.json"),
      JSON.stringify({
        tracks: { type: "path", value: "tracked/.ghost" },
        ackedAt: "2026-06-16T00:00:00.000Z",
        trackedFingerprintId: "tracked",
        localFingerprintId: "local",
        overallDistance: 0,
        dimensions: {
          spacing: {
            distance: 0,
            stance: "accepted",
            ackedAt: "2026-06-16T00:00:00.000Z",
          },
          palette: {
            distance: 0,
            stance: "accepted",
            ackedAt: "2026-06-16T00:00:00.000Z",
          },
          typography: {
            distance: 0,
            stance: "accepted",
            ackedAt: "2026-06-16T00:00:00.000Z",
          },
          surfaces: {
            distance: 0,
            stance: "accepted",
            ackedAt: "2026-06-16T00:00:00.000Z",
          },
          decisions: {
            distance: 0,
            stance: "accepted",
            ackedAt: "2026-06-16T00:00:00.000Z",
          },
        },
      }),
    );

    const result = await runCli(
      [
        "drift",
        "check",
        "--package",
        ".ghost",
        "--tracked",
        "tracked/.ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.drift.check/v1");
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
  });

  it("drift check uses ledger tracks when no config is present", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(["drift", "check", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
  });

  it("drift check resolves config tracks that point at canonical packages", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: './tracked/.ghost' };\n",
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(["drift", "check", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
  });

  it("runDriftCheck resolves config tracks relative to the supplied cwd", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: 'tracked/.ghost' };\n",
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const report = await runDriftCheck({ cwd: dir, config: "ghost.config.js" });

    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
    expect(report.overall.verdict).toBe("covered");
  });

  it("drift check resolves tracked canonical package manifest paths", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(
      [
        "drift",
        "check",
        "--tracked",
        "tracked/.ghost/fingerprint/manifest.yml",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.trackedFingerprintId).toBe("tracked");
    expect(report.localFingerprintId).toBe("local");
  });

  it("drift check rejects tracked fingerprints that do not match the ledger", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeCheckPackage(join(dir, "other"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, "other", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: other\n",
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(
      ["drift", "check", "--tracked", "other/.ghost", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'sync manifest tracks fingerprint "tracked" but resolved tracked fingerprint "other"',
    );
  });

  it("drift check reports uncovered canonical package changes", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeCheckPackage(join(dir, "tracked"), { checks: false });
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint", "intent.yml"),
      `summary:
  product: Cash iOS
situations: []
principles:
  - id: tokenized-ui-color
    principle: Use celebratory spring motion and playful transitions throughout lending.
experience_contracts: []
`,
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(["drift", "check", "--format", "json"], dir);

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.overall.verdict).toBe("uncovered");
    expect(report.dimensions.decisions.verdict).toBe("uncovered");
  });

  it("drift check reports digest-only canonical package changes", async () => {
    const manyPrinciples = Array.from(
      { length: 30 },
      (_, index) => `    - id: principle-${index + 1}
      principle: Preserve durable product surface rule ${index + 1}.
`,
    ).join("");
    const fingerprintRaw = `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Cash iOS
  situations: []
  principles:
${manyPrinciples}  experience_contracts: []
inventory:
  topology:
    surface_types: [native-feature]
  building_blocks: {}
  exemplars: []
  sources: []
composition:
  patterns: []
`;
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await mkdir(join(dir, "tracked", ".ghost"), { recursive: true });
    await writeSplitFingerprintPackage(join(dir, ".ghost"), fingerprintRaw);
    await writeSplitFingerprintPackage(
      join(dir, "tracked", ".ghost"),
      fingerprintRaw,
    );
    await writeFile(
      join(dir, "tracked", ".ghost", "fingerprint", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: tracked\n",
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint", "inventory.yml"),
      `topology:
  surface_types: [native-feature, digest-only-change]
building_blocks: {}
exemplars: []
sources: []
`,
    );
    await writeCoveredSyncManifest(dir, { tracked: "tracked/.ghost" });

    const result = await runCli(["drift", "check", "--format", "json"], dir);

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.overall.verdict).toBe("uncovered");
    expect(report.dimensions.decisions.verdict).toBe("uncovered");
  });

  it("exits with uncovered drift when current distance exceeds the stance ledger", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await runCli(["track", "tracked.fingerprint.md"], dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local").replace(
        "spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }",
        "spacing: { scale: [2, 3, 5, 7, 11, 13], baseUnit: 2, regularity: 0.1 }",
      ),
    );

    const result = await runCli(
      [
        "drift",
        "check",
        "--tracked",
        "tracked.fingerprint.md",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.drift.check/v1");
    expect(report.overall.verdict).toBe("uncovered");
    expect(report.dimensions.spacing.verdict).toBe("uncovered");
  });

  it("keeps advisory design-loop drift non-blocking", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "config.yml"),
      `schema: ghost.config/v1
targets: []
libraries: []
design_loop:
  enabled: true
  mode: advisory
`,
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await runCli(["track", "tracked.fingerprint.md"], dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local").replace(
        "spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }",
        "spacing: { scale: [2, 3, 5, 7, 11, 13], baseUnit: 2, regularity: 0.1 }",
      ),
    );

    const result = await runCli(
      [
        "drift",
        "check",
        "--tracked",
        "tracked.fingerprint.md",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.designLoop).toEqual({
      enabled: true,
      mode: "advisory",
      source: "config",
    });
    expect(report.overall.verdict).toBe("uncovered");
    expect(report.dimensions.spacing.verdict).toBe("uncovered");
  });

  it("initializes the default fingerprint package without cache", async () => {
    const init = await runCli(["init", "--format", "json"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(Object.keys(initOutput).sort()).toEqual([
      "checks",
      "composition",
      "dir",
      "fingerprintDir",
      "intent",
      "inventory",
      "manifest",
    ]);
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "validate.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.validate/v1");
    const status = JSON.parse(scan.stdout);
    expect(status.cache).toBeUndefined();

    const lint = await runCli(["lint"], dir);
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);
    const check = await runCli(["check", "--diff", "change.patch"], dir);
    const review = await runCli(["review", "--diff", "change.patch"], dir);
    const reviewCommand = await runCli(["emit", "review-command"], dir);

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(check.code).toBe(0);
    expect(review.code).toBe(0);
    expect(review.stdout).toContain("## Selected Fingerprint Context");
    expect(reviewCommand.code).toBe(0);
  });

  it("init --monorepo detects package.json array workspaces without creating children by default", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ workspaces: ["apps/*"] }, null, 2),
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.mode).toBe("plan");
    expect(out.candidates).toEqual([
      {
        path: "apps/checkout",
        source: "package-json",
        packageJson: "apps/checkout/package.json",
        state: "candidate",
      },
    ]);
    expect(out.commands).toEqual(["ghost init --scope apps/checkout"]);
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "manifest.yml"), "utf-8"),
    ).resolves.toContain("ghost.fingerprint-package/v1");
    await expect(
      readFile(
        join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).rejects.toThrow();
  });

  it("init --monorepo detects pnpm workspace packages", async () => {
    await mkdir(join(dir, "packages", "admin"), { recursive: true });
    await writeFile(
      join(dir, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    await writeFile(
      join(dir, "packages", "admin", "package.json"),
      JSON.stringify({ name: "admin" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).candidates).toEqual([
      {
        path: "packages/admin",
        source: "pnpm-workspace",
        packageJson: "packages/admin/package.json",
        state: "candidate",
      },
    ]);
  });

  it("init --monorepo expands recursive workspace globs", async () => {
    await mkdir(join(dir, "packages", "group", "admin"), {
      recursive: true,
    });
    await writeFile(
      join(dir, "pnpm-workspace.yaml"),
      "packages:\n  - packages/**\n",
    );
    await writeFile(
      join(dir, "packages", "group", "admin", "package.json"),
      JSON.stringify({ name: "admin" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).candidates).toEqual([
      {
        path: "packages/group/admin",
        source: "pnpm-workspace",
        packageJson: "packages/group/admin/package.json",
        state: "candidate",
      },
    ]);
  });

  it("init --monorepo expands brace workspace globs", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await mkdir(join(dir, "packages", "admin"), { recursive: true });
    await writeFile(
      join(dir, "pnpm-workspace.yaml"),
      "packages:\n  - '{apps,packages}/*'\n",
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );
    await writeFile(
      join(dir, "packages", "admin", "package.json"),
      JSON.stringify({ name: "admin" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).candidates).toEqual([
      {
        path: "apps/checkout",
        source: "pnpm-workspace",
        packageJson: "apps/checkout/package.json",
        state: "candidate",
      },
      {
        path: "packages/admin",
        source: "pnpm-workspace",
        packageJson: "packages/admin/package.json",
        state: "candidate",
      },
    ]);
  });

  it("init --monorepo honors negated workspace globs", async () => {
    await mkdir(join(dir, "packages", "admin"), { recursive: true });
    await mkdir(join(dir, "packages", "fixtures", "example"), {
      recursive: true,
    });
    await writeFile(
      join(dir, "pnpm-workspace.yaml"),
      "packages:\n  - packages/**\n  - '!packages/fixtures/**'\n",
    );
    await writeFile(
      join(dir, "packages", "admin", "package.json"),
      JSON.stringify({ name: "admin" }, null, 2),
    );
    await writeFile(
      join(dir, "packages", "fixtures", "example", "package.json"),
      JSON.stringify({ name: "example" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).candidates).toEqual([
      {
        path: "packages/admin",
        source: "pnpm-workspace",
        packageJson: "packages/admin/package.json",
        state: "candidate",
      },
    ]);
  });

  it("init --monorepo --apply creates detected child packages", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ workspaces: { packages: ["apps/*"] } }, null, 2),
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--apply", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.mode).toBe("apply");
    expect(out.created.map((entry: { path: string }) => entry.path)).toEqual([
      "apps/checkout",
    ]);
    await expect(
      readFile(
        join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).resolves.toContain("ghost.fingerprint-package/v1");
  });

  it("init --monorepo --apply skips existing child packages without force", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ workspaces: ["apps/*"] }, null, 2),
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );
    await runCli(["init", "--scope", "apps/checkout"], dir);

    const result = await runCli(
      ["init", "--monorepo", "--apply", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.created).toEqual([]);
    expect(out.skipped).toEqual([
      {
        path: "apps/checkout",
        source: "package-json",
        packageJson: "apps/checkout/package.json",
        state: "exists",
      },
    ]);
  });

  it("init --monorepo applies --memory-dir to root and child packages", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ workspaces: ["apps/*"] }, null, 2),
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );

    const result = await runCli(
      [
        "init",
        "--monorepo",
        "--apply",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.memoryDir).toBe(".design/memory");
    expect(out.commands).toEqual([
      "ghost init --scope apps/checkout --memory-dir .design/memory",
    ]);
    await expect(
      readFile(
        join(dir, ".design", "memory", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).resolves.toContain("ghost.fingerprint-package/v1");
    await expect(
      readFile(
        join(
          dir,
          "apps",
          "checkout",
          ".design",
          "memory",
          "fingerprint",
          "manifest.yml",
        ),
        "utf-8",
      ),
    ).resolves.toContain("ghost.fingerprint-package/v1");
  });

  it("init --monorepo uses GHOST_MEMORY_DIR for root and child packages", async () => {
    await mkdir(join(dir, "apps", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ workspaces: ["apps/*"] }, null, 2),
    );
    await writeFile(
      join(dir, "apps", "checkout", "package.json"),
      JSON.stringify({ name: "checkout" }, null, 2),
    );

    const result = await runCli(
      ["init", "--monorepo", "--apply", "--format", "json"],
      dir,
      { env: { GHOST_MEMORY_DIR: ".agents/ghost" } },
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.memoryDir).toBe(".agents/ghost");
    expect(out.commands).toEqual([
      "ghost init --scope apps/checkout --memory-dir .agents/ghost",
    ]);
    await expect(
      readFile(
        join(dir, ".agents", "ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).resolves.toContain("ghost.fingerprint-package/v1");
    await expect(
      readFile(
        join(
          dir,
          "apps",
          "checkout",
          ".agents",
          "ghost",
          "fingerprint",
          "manifest.yml",
        ),
        "utf-8",
      ),
    ).resolves.toContain("ghost.fingerprint-package/v1");
  });

  it("init --monorepo rejects exact scope and dir combinations", async () => {
    const withDir = await runCli(["init", "custom-dir", "--monorepo"], dir);
    const withScope = await runCli(
      ["init", "--scope", "apps/checkout", "--monorepo"],
      dir,
    );
    const withApplyOnly = await runCli(["init", "--apply"], dir);

    expect(withDir.code).toBe(2);
    expect(withDir.stderr).toContain(
      "use either init [dir] or init --monorepo",
    );
    expect(withScope.code).toBe(2);
    expect(withScope.stderr).toContain(
      "use either init --scope <path> or init --monorepo",
    );
    expect(withApplyOnly.code).toBe(2);
    expect(withApplyOnly.stderr).toContain(
      "--apply can only be used with --monorepo",
    );
  });

  it("uses GHOST_MEMORY_DIR as the default fingerprint package directory for init", async () => {
    const init = await runCli(["init", "--format", "json"], dir, {
      env: { GHOST_MEMORY_DIR: ".agents/ghost" },
    });

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(await realpath(initOutput.dir)).toBe(
      await realpath(join(dir, ".agents", "ghost")),
    );
    await expect(
      readFile(
        join(dir, ".agents", "ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "manifest.yml"), "utf-8"),
    ).rejects.toThrow();
  });

  it("keeps explicit init directory positional args ahead of GHOST_MEMORY_DIR", async () => {
    const init = await runCli(["init", "custom-dir", "--format", "json"], dir, {
      env: { GHOST_MEMORY_DIR: ".agents/ghost" },
    });

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(await realpath(initOutput.dir)).toBe(
      await realpath(join(dir, "custom-dir")),
    );
    await expect(
      readFile(join(dir, "custom-dir", "fingerprint", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(
        join(dir, ".agents", "ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).rejects.toThrow();
  });

  it("rejects invalid GHOST_MEMORY_DIR with memory-dir validation errors", async () => {
    const init = await runCli(["init"], dir, {
      env: { GHOST_MEMORY_DIR: "../outside" },
    });

    expect(init.code).toBe(2);
    expect(init.stderr).toContain("--memory-dir must not contain");
  });

  it("uses GHOST_MEMORY_DIR as the default package lookup for scan", async () => {
    await runCli(["init", ".agents/ghost"], dir);

    const scan = await runCli(["scan", "--format", "json"], dir, {
      env: { GHOST_MEMORY_DIR: ".agents/ghost" },
    });

    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(await realpath(status.dir)).toBe(
      await realpath(join(dir, ".agents", "ghost")),
    );
    expect(status.fingerprint.state).toBe("present");
  });

  it("refuses to overwrite existing fingerprint files unless forced", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint", "intent.yml"),
      "summary:\n  product: Curated Surface\n",
    );

    const refused = await runCli(["init"], dir);

    expect(refused.code).toBe(2);
    expect(refused.stderr).toContain(
      "Refusing to overwrite existing Ghost fingerprint file(s)",
    );
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "intent.yml"), "utf-8"),
    ).resolves.toContain("Curated Surface");

    const forced = await runCli(["init", "--force"], dir);

    expect(forced.code).toBe(0);
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "intent.yml"), "utf-8"),
    ).resolves.toContain("summary: {}");
  });

  it("warns for checks grounded in omitted sparse fingerprint refs", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint", "validate.yml"),
      `schema: ghost.validate/v1
id: local
checks:
  - id: missing-fingerprint-check
    title: Missing fingerprint check
    status: active
    severity: serious
    derivation:
      intent: [intent.principle:not-recorded]
    applies_to:
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
`,
    );

    const lint = await runCli(["lint", ".ghost", "--format", "json"], dir);

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-unknown",
      path: "fingerprint/validate.yml.checks[0].derivation.intent[0]",
    });
  });

  it("validates standalone validate.yml derivation refs with a valid sibling fingerprint", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "validate.yml"),
      checksFileWithDerivation("intent.principle:not-recorded"),
    );

    const lint = await runCli(
      ["lint", ".ghost/fingerprint/validate.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-unknown",
      path: "checks[0].derivation.intent[0]",
    });
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-grounding-unverified" }),
      ]),
    );
  });

  it("marks standalone validate.yml grounding unverified when no sibling fingerprint exists", async () => {
    await writeFile(
      join(dir, "validate.yml"),
      checksFileWithDerivation("intent.principle:tokenized-ui-color"),
    );

    const lint = await runCli(
      ["lint", "validate.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.info).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("keeps standalone validate.yml lint non-blocking when the sibling fingerprint is invalid", async () => {
    await mkdir(join(dir, ".ghost", "fingerprint"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "manifest.yml"),
      "not: draft\n",
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint", "validate.yml"),
      checksFileWithDerivation("intent.principle:tokenized-ui-color"),
    );

    const lint = await runCli(
      ["lint", ".ghost/fingerprint/validate.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("initializes a bundle and reports fingerprint capture state as json", async () => {
    const init = await runCli(["init"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);
    const scanHuman = await runCli(["scan"], dir);

    expect(init.code).toBe(0);
    expect(init.stdout).toContain("manifest.yml:");
    expect(init.stdout).toContain("intent.yml:");
    expect(init.stdout).toContain("inventory.yml:");
    expect(init.stdout).toContain("composition.yml:");
    expect(init.stdout).toContain("validate.yml:");
    expect(init.stdout).not.toContain("cache/:");
    expect(init.stdout).not.toContain("memory/intent.md:");
    expect(
      await readFile(
        join(dir, ".ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).toContain("schema: ghost.fingerprint-package/v1");
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.fingerprint.state).toBe("present");
    expect(status.proposals).toBeUndefined();
    expect(status.cache).toBeUndefined();
    expect(status.intent).toBeUndefined();
    expect(status.readiness).toBeUndefined();
    expect(status.checks).toBeUndefined();
    expect(status.validate.state).toBe("present");
    expect(status.contribution.state).toBe("empty");
    expect(status.contribution.contributing_facets).toEqual([]);
    expect(status.contribution.empty_facets).toEqual([
      "intent",
      "inventory",
      "composition",
      "validate",
    ]);
    expect(scanHuman.stdout).toContain("fingerprint dir:");
    expect(scanHuman.stdout).toContain("contribution: empty");
    expect(scanHuman.stdout).toContain("intent: empty (0)");
    expect(scanHuman.stdout).toContain("validate: empty (0)");
    expect(scanHuman.stdout).not.toContain("readiness:");
    expect(scanHuman.stdout).not.toContain("missing layers:");
    expect(scanHuman.stdout).not.toContain("memory dir:");
  });

  it("rejects removed init intent flag", async () => {
    await expect(runCli(["init", "--with-intent"], dir)).rejects.toThrow(
      "Unknown option `--withIntent`",
    );
  });

  it("initializes a blank product scaffold with config and reference library wiring", async () => {
    const init = await runCli(
      [
        "init",
        "--with-config",
        "--reference",
        "packages/ghost-ui/.ghost",
        "--format",
        "json",
      ],
      dir,
    );
    const scan = await runCli(["scan", "--format", "json"], dir);
    const signals = await runCli(["signals"], dir);
    await mkdir(join(dir, "packages", "ghost-ui", ".ghost"), {
      recursive: true,
    });
    await mkdir(join(dir, "packages", "ghost-ui", ".ghost", "fingerprint"), {
      recursive: true,
    });
    await mkdir(join(dir, "packages", "ghost-ui", "public", "r"), {
      recursive: true,
    });
    await writeFile(
      join(
        dir,
        "packages",
        "ghost-ui",
        ".ghost",
        "fingerprint",
        "manifest.yml",
      ),
      "schema: ghost.fingerprint-package/v1\nid: ghost-ui\n",
    );
    await writeFile(
      join(dir, "packages", "ghost-ui", "public", "r", "registry.json"),
      "{}\n",
    );
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(initOutput.cache).toBeUndefined();
    expect(await realpath(initOutput.config)).toBe(
      await realpath(join(dir, ".ghost", "config.yml")),
    );

    const fingerprint = parseYaml(
      await readFile(
        join(dir, ".ghost", "fingerprint", "inventory.yml"),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    expect(fingerprint).not.toHaveProperty("implementation_vocabulary");
    expect(fingerprint).not.toHaveProperty("patterns");
    expect(fingerprint).toMatchObject({
      building_blocks: {
        libraries: ["ghost-ui"],
      },
      sources: [
        {
          id: "ghost-ui",
          kind: "registry",
          ref: "registry:packages/ghost-ui/public/r/registry.json",
        },
      ],
    });

    const config = parseYaml(
      await readFile(join(dir, ".ghost", "config.yml"), "utf-8"),
    ) as Record<string, unknown>;
    expect(config).toMatchObject({
      schema: "ghost.config/v1",
      design_loop: { enabled: false, mode: "off" },
      targets: [{ id: "product", platform: "web", roots: [] }],
      libraries: [
        {
          id: "ghost-ui",
          role: "primary-ui-registry",
          source: "registry:packages/ghost-ui/public/r/registry.json",
          fingerprint: "packages/ghost-ui/.ghost/fingerprint/manifest.yml",
        },
      ],
    });

    const status = JSON.parse(scan.stdout);
    expect(status.config.state).toBe("present");
    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual(["inventory"]);
    expect(status.contribution.absent_facets).toEqual([]);
    expect(status.contribution.empty_facets).toEqual([
      "intent",
      "composition",
      "validate",
    ]);

    const signalsOutput = JSON.parse(signals.stdout);
    expect(signalsOutput.config.libraries[0].id).toBe("ghost-ui");
    expect(verify.code).toBe(0);
  });

  it("runs signals, lint, and verify from the unified cli", async () => {
    await writeCheckPackage(dir);
    const signals = await runCli(["signals"], dir);
    const lint = await runCli(["lint"], dir);
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);

    expect(signals.code).toBe(0);
    expect(await realpath(JSON.parse(signals.stdout).root)).toBe(
      await realpath(dir),
    );
    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("0 error");
    expect(verify.code).toBe(0);
    expect(verify.stdout).toContain("0 error");
  });

  it("lints, verifies, and scans the Ghost UI reference bundle", async () => {
    const lint = await runCli(["lint", "packages/ghost-ui/.ghost"], REPO_ROOT);
    const verify = await runCli(
      ["verify", "packages/ghost-ui/.ghost", "--root", "packages/ghost-ui"],
      REPO_ROOT,
    );
    const scan = await runCli(
      ["scan", "packages/ghost-ui/.ghost", "--format", "json"],
      REPO_ROOT,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.fingerprint.state).toBe("present");
    expect(status.validate.state).toBe("missing");
    expect(status.proposals).toBeUndefined();
    expect(status.cache).toBeUndefined();
    expect(status.readiness).toBeUndefined();
    expect(status.checks).toBeUndefined();
    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.contributing_facets).toEqual([
      "intent",
      "inventory",
    ]);
    expect(status.contribution.empty_facets).toEqual([]);
    expect(status.contribution.absent_facets).toEqual([
      "composition",
      "validate",
    ]);
    expect(status.contribution.reasons[0]).toContain(
      "Absent facets may be inherited",
    );
  });

  it("runs survey summary, catalog, and patterns from the unified cli", async () => {
    await writeComparableBundle(join(dir, ".ghost"), "sectioned-form");

    const summary = await runCli(
      ["survey", "summarize", ".ghost/survey.json"],
      dir,
    );
    const catalog = await runCli(
      ["survey", "catalog", ".ghost/survey.json", "--kind", "spacing"],
      dir,
    );
    const patterns = await runCli(
      ["survey", "patterns", ".ghost/survey.json", "--format", "json"],
      dir,
    );

    expect(summary.code).toBe(0);
    expect(summary.stdout).toContain("Survey Summary");
    expect(catalog.code).toBe(0);
    expect(catalog.stdout).toContain("spacing");
    expect(patterns.code).toBe(0);
    expect(JSON.parse(patterns.stdout).schema).toBe("ghost.patterns/v1");
  });

  it("keeps derived patterns implementation-aware when no UI surfaces exist", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "survey.json"),
      JSON.stringify({
        schema: "ghost.survey/v1",
        sources: [
          { id: "library", target: ".", scanned_at: "2026-05-19T00:00:00Z" },
        ],
        values: [],
        tokens: [],
        components: [
          {
            id: "component_button",
            source: { target: ".", scanned_at: "2026-05-19T00:00:00Z" },
            name: "Button",
            discovered_via: "registry.json",
          },
        ],
        ui_surfaces: [],
      }),
    );

    const result = await runCli(
      ["survey", "patterns", ".ghost/survey.json", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const patterns = JSON.parse(result.stdout);
    expect(patterns.composition_patterns).toHaveLength(0);
    expect(patterns.advisory.review_expectations[0]).toContain(
      "No UI surface evidence",
    );
  });

  it("runs survey fix-ids from the unified cli", async () => {
    await writeComparableBundle(join(dir, ".ghost"), "sectioned-form");

    const result = await runCli(
      [
        "survey",
        "fix-ids",
        ".ghost/survey.json",
        "-o",
        ".ghost/survey.fixed.json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const fixed = JSON.parse(
      await readFile(join(dir, ".ghost", "survey.fixed.json"), "utf-8"),
    );
    expect(fixed.schema).toBe("ghost.survey/v1");
    expect(fixed.values[0].id).toBeTruthy();
  });

  it("emits review commands from the unified cli", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );

    const reviewCommand = await runCli(["emit", "review-command"], dir);

    expect(reviewCommand.code).toBe(0);
    expect(reviewCommand.stdout).toContain("design-review.md");
    const emittedReviewCommand = await readFile(
      join(dir, ".claude", "commands", "design-review.md"),
      "utf-8",
    );
    expect(emittedReviewCommand).toContain(
      ".ghost/fingerprint/intent.yml`, `.ghost/fingerprint/inventory.yml`, and `.ghost/fingerprint/composition.yml",
    );
    expect(emittedReviewCommand).toContain("Exemplars");
    expect(emittedReviewCommand).toContain("lending-tokenized-screen");
    expect(emittedReviewCommand).toContain("provisional and non-Ghost-backed");
    expect(emittedReviewCommand).not.toContain("Proposal Threshold");
    expect(emittedReviewCommand).not.toContain("recommend-proposal");
    expect(emittedReviewCommand).toContain("experience-gap");
    expect(emittedReviewCommand).toContain("no-hardcoded-ui-color");
    expect(emittedReviewCommand).not.toContain(
      "deprecated legacy direct-markdown",
    );
  });

  it("rejects removed context-bundle emit kind", async () => {
    await writeCheckPackage(dir);

    const contextBundle = await runCli(["emit", "context-bundle"], dir);

    expect(contextBundle.code).toBe(2);
    expect(contextBundle.stderr).toContain(
      "unknown emit kind 'context-bundle'",
    );
  });

  it("gathers a Relay brief from the resolved fingerprint stack", async () => {
    await writeCheckPackage(dir);

    const result = await runCli(
      ["relay", "gather", "Code/Features/Lending/LendingUI"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Ghost Relay Brief");
    expect(result.stdout).toContain("## Package Chain");
    expect(result.stdout).toContain("## Match");
    expect(result.stdout).toContain("Status: path matched");
    expect(result.stdout).toContain("Matched scopes: `lending`");
    expect(result.stdout).toContain("## Intent Cascade");
    expect(result.stdout).toContain("## Active Obligations");
    expect(result.stdout).toContain("## Composition Guidance");
    expect(result.stdout).toContain("## Inventory To Inspect");
    expect(result.stdout).toContain("## Validate");
    expect(result.stdout).toContain("## Gaps");
    expect(result.stdout).toContain("intent.principle:tokenized-ui-color");
    expect(result.stdout).toContain("composition.pattern:tokenized-ui-color");
    expect(result.stdout).toContain(
      "inventory.exemplar:lending-tokenized-screen",
    );
    expect(result.stdout).toContain("no-hardcoded-ui-color");
    expect(result.stdout).not.toContain("candidate-density-check");
  });

  it("gathers Relay context as json from an exact package", async () => {
    await writeCheckPackage(dir);

    const result = await runCli(
      [
        "relay",
        "gather",
        "Code/Features/Lending/LendingUI",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.schema).toBe("ghost.relay.gather/v1");
    expect(json.source.kind).toBe("package");
    expect(json.targetPaths).toEqual(["Code/Features/Lending/LendingUI"]);
    expect(json.entrypoint.match.status).toBe("path-match");
    expect(json.entrypoint.actionContract.preserve).toContain(
      "UI colors should come from the product token system.",
    );
    expect(json.entrypoint.actionContract.inspect).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "Code/Features/Lending/LendingUI",
          reason:
            "source surface for inventory.exemplar:lending-tokenized-screen",
        }),
      ]),
    );
    expect(json.entrypoint.actionContract.validate).toContain(
      "validate.check:no-hardcoded-ui-color - serious: Use design tokens for UI color",
    );
    expect(json.entrypoint.actionContract.validate.join("\n")).not.toContain(
      "candidate-density-check",
    );
    expect(json.cascade_brief.intent_cascade[0].ref).toBe(
      "intent.principle:tokenized-ui-color",
    );
    expect(json.cascade_brief.composition_guidance[0].ref).toBe(
      "composition.pattern:tokenized-ui-color",
    );
    expect(json.cascade_brief.validate[0].ref).toBe(
      "validate.check:no-hardcoded-ui-color",
    );
    expect(json.brief).toContain("# Ghost Relay Brief");
    expect(json.brief).toContain("## Intent Cascade");
  });

  it("ignores memory-dir when gathering Relay context from an exact package", async () => {
    await writeCheckPackage(dir);

    const result = await runCli(
      [
        "relay",
        "gather",
        "--package",
        ".ghost",
        "--memory-dir",
        "../not-used",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).source.kind).toBe("package");
  });

  it("rejects invalid Relay output formats", async () => {
    await writeCheckPackage(dir);

    const result = await runCli(["relay", "gather", "--format", "yaml"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--format must be 'markdown' or 'json'");
  });

  it("warns when fingerprint exemplar paths are unreachable", async () => {
    await writeCheckPackage(dir);

    const verify = await runCli(
      ["verify", ".ghost", "--root", ".", "--format", "json"],
      dir,
    );

    expect(verify.code).toBe(0);
    const report = JSON.parse(verify.stdout);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "fingerprint-exemplar-unreachable",
          path: "fingerprint/inventory.yml.exemplars[0].path",
        }),
      ]),
    );
  });

  it("rejects removed legacy direct markdown emit flags", () => {
    const cli = buildCli();

    expect(() =>
      cli.parse([
        "node",
        "ghost",
        "emit",
        "review-command",
        "--fingerprint",
        "legacy.fingerprint.md",
        "--stdout",
      ]),
    ).toThrow("Unknown option `--fingerprint`");
    expect(() =>
      cli.parse(["node", "ghost", "emit", "context-bundle", "--no-tokens"]),
    ).toThrow("Unknown option `--tokens`");
  });
  it("installs the unified ghost skill bundle", async () => {
    const result = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );

    expect(result.code).toBe(0);
    for (const path of [
      "SKILL.md",
      "references/capture.md",
      "references/review.md",
      "references/remediate.md",
      "references/brief.md",
    ]) {
      await expect(
        readFile(join(dir, "skills", "ghost", path), "utf-8"),
      ).resolves.toBeTruthy();
    }
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain("When Fingerprint Facets Are Silent");
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain(
      "Never claim provisional reasoning, local convention, or general UX reasoning",
    );
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "review.md"),
        "utf-8",
      ),
    ).resolves.toContain("fingerprint facets are silent");
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "propose.md"),
        "utf-8",
      ),
    ).rejects.toThrow();
  });

  it("check fails when an active deterministic check matches added lines", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("UIColor(#ffffff)"),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.result).toBe("fail");
    expect(report.findings[0]).toMatchObject({
      check_id: "no-hardcoded-ui-color",
      path: "Code/Features/Lending/View.swift",
      line: 1,
    });
  });

  it("check treats inline color detectors as literal patterns, not exact values", async () => {
    await writeCheckPackage(dir, { detectorPattern: "#000000" });
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let colors = [Color(#000), Color.black]"),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.result).toBe("fail");
    expect(
      report.findings.map((finding: { match: string }) => finding.match),
    ).toEqual(["#000", "Color.black"]);
  });

  it("check passes when active scoped checks do not match", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Design Check: PASS");
  });

  it("check passes when optional validate.yml is absent", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("UIColor(#ffffff)"),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("No active deterministic check failures.");
  });

  it("review emits an advisory packet with required citation fields", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(["review", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Ghost Advisory Review");
    expect(result.stdout).toContain("## Selected Fingerprint Context");
    expect(result.stdout).toContain("### Selected Fingerprint Cascade");
    expect(result.stdout).toContain("#### Package Chain");
    expect(result.stdout).toContain("#### Match");
    expect(result.stdout).toContain("#### Intent Cascade");
    expect(result.stdout).toContain("#### Active Obligations");
    expect(result.stdout).toContain("#### Composition Guidance");
    expect(result.stdout).toContain("#### Inventory To Inspect");
    expect(result.stdout).toContain("#### Validate");
    expect(result.stdout).toContain("#### Gaps");
    expect(result.stdout).toContain("Status: path matched");
    expect(result.stdout).toContain("Matched scopes: `lending`");
    expect(result.stdout).toContain("diff location");
    expect(result.stdout).toContain("fingerprint facet refs");
    expect(result.stdout).toContain(
      "cascade gap or local-evidence rationale when context is silent",
    );
    expect(result.stdout).toContain("Use the selected cascade first");
    expect(result.stdout).toContain("active check when blocking");
    expect(result.stdout).not.toContain("Proposal Threshold");
    expect(result.stdout).toContain("provisional and non-Ghost-backed");
    expect(result.stdout).not.toContain("recommend-proposal");
    expect(result.stdout).toContain("missing-fingerprint");
    expect(result.stdout).toContain("experience-gap");
    expect(result.stdout).toContain("repair or intentional-divergence");
    expect(result.stdout).not.toContain("schema: ghost.fingerprint/v1");
  });

  it("review reports and truncates oversized diffs by byte budget", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch(`const copy = "${"x".repeat(160)}";`),
    );

    const result = await runCli(
      [
        "review",
        "--diff",
        "change.patch",
        "--max-diff-bytes",
        "80",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.truncated).toBe(true);
    expect(packet.budgets.max_diff_bytes).toBe(80);
    expect(packet.budgets.diff_bytes).toBeGreaterThan(80);
    expect(packet.budgets.included_diff_bytes).toBeLessThanOrEqual(80);
    expect(packet.diff).toContain("Ghost truncated diff");
    expect(packet.diff).not.toContain("x".repeat(120));
  });

  it("review markdown includes packet budget metadata", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch(`const copy = "${"x".repeat(160)}";`),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--max-diff-bytes", "80"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("## Review Packet Budget");
    expect(result.stdout).toContain("- Max diff bytes: 80");
    expect(result.stdout).toContain("- Truncated: yes");
    expect(result.stdout).toContain("Ghost truncated diff");
  });

  it("review rejects invalid max diff byte budgets", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--max-diff-bytes", "0"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      "--max-diff-bytes must be a positive integer",
    );
  });

  it("review includes config reference registries when config.yml is present", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, ".ghost", "config.yml"),
      `schema: ghost.config/v1
targets:
  - id: product
    platform: web
    roots: []
libraries:
  - id: ghost-ui
    role: primary-ui-registry
    source: registry:packages/ghost-ui/public/r/registry.json
    fingerprint: packages/ghost-ui/.ghost/fingerprint/manifest.yml
`,
    );
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.config.libraries[0]).toMatchObject({
      id: "ghost-ui",
      role: "primary-ui-registry",
    });
  });

  it("review omits removed memory fields", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.fingerprint.schema).toBe("ghost.fingerprint/v1");
    expect(packet.finding_categories).toContain("experience-gap");
    expect(packet.proposal_types).toBeUndefined();
    expect(packet.open_proposals).toBeUndefined();
    expect(packet.accepted_decisions).toBeUndefined();
    expect(packet.intent).toBeUndefined();
    expect(packet.memory).toBeUndefined();
  });

  it("rejects removed review memory flag", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    await expect(
      runCli(
        [
          "review",
          "--diff",
          "change.patch",
          "--include-memory",
          "--format",
          "json",
        ],
        dir,
      ),
    ).rejects.toThrow("Unknown option `--includeMemory`");
  });

  it("check routes changed files through nested stacks by default", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.check-report/v1");
    expect(report.result).toBe("pass");
    expect(report.fingerprint_dir).toBe(".ghost");
    expect(report.memory_dir).toBeUndefined();
    expect(report.stacks[0].memory_dir).toBeUndefined();
    expect(report.stacks[0].layer_dirs).toHaveLength(2);
    expect(report.routed_files[0]).toMatchObject({
      path: "apps/checkout/review/page.tsx",
      checks: [],
    });
  });

  it("--package keeps check in exact single-bundle mode", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      [
        "check",
        "--diff",
        "change.patch",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.check-report/v1");
    expect(report.findings[0].check_id).toBe("no-hardcoded-color");
    expect(report.findings[0]).toMatchObject({
      path: "apps/checkout/review/page.tsx",
      line: 1,
      title: "No hardcoded colors",
      severity: "serious",
      detector: "forbidden-regex",
      message: "Added UI code matched a forbidden pattern.",
      match: "#ffffff",
    });
    expect(report.stacks).toBeUndefined();
  });

  it("resolves stack checks from a custom fingerprint directory", async () => {
    await writeNestedCheckPackage(dir, ".design/memory");
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      [
        "check",
        "--diff",
        "change.patch",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.fingerprint_dir).toBe(".design/memory");
    expect(report.memory_dir).toBeUndefined();
    expect(report.stacks[0]).toMatchObject({
      fingerprint_dir: ".design/memory",
      changed_files: ["apps/checkout/review/page.tsx"],
    });
    expect(report.stacks[0].memory_dir).toBeUndefined();
    expect(report.stacks[0].layer_dirs).toEqual([
      await realpath(join(dir, ".design", "memory")),
      await realpath(join(dir, "apps", "checkout", ".design", "memory")),
    ]);
  });

  it("review emits stack packets for mixed diffs", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      [
        webPatch("apps/checkout/review/page.tsx", "const x = CheckoutTheme;"),
        webPatch("shared/home.tsx", "const x = RootTheme;"),
      ].join("\n"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.stacks).toHaveLength(2);
    expect(packet.stacks[0].fingerprint_dir).toBe(".ghost");
    expect(packet.stacks[0].memory_dir).toBeUndefined();
    expect(packet.stacks[0].merged.fingerprint.intent.summary.product).toBe(
      "Checkout",
    );
    expect(packet.stacks[0].layer_dirs).toHaveLength(2);
    expect(packet.stacks[1].layer_dirs).toHaveLength(1);
  });

  it("stack inspects resolved nested layers", async () => {
    await writeNestedCheckPackage(dir);

    const result = await runCli(
      ["stack", "apps/checkout/review/page.tsx", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const stacks = JSON.parse(result.stdout);
    expect(stacks[0].layers).toHaveLength(2);
    expect(stacks[0].fingerprint_dir).toBe(".ghost");
    expect(stacks[0].memory_dir).toBeUndefined();
    expect(stacks[0].layers[0].memory_dir).toBeUndefined();
    expect(stacks[0].merged.fingerprint.intent.summary.product).toBe(
      "Checkout",
    );
  });

  it("rejects unsafe memory directory overrides", async () => {
    const result = await runCli(
      ["stack", ".", "--memory-dir", "../outside"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--memory-dir must not contain");
  });

  it("emit review-command resolves merged fingerprint stack for --path", async () => {
    await writeNestedCheckPackage(dir);

    const result = await runCli(
      [
        "emit",
        "review-command",
        "--path",
        "apps/checkout/review/page.tsx",
        "--stdout",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("RootTheme");
    expect(result.stdout).toContain("Checkout");
    expect(result.stdout).toContain("CheckoutTheme");
  });

  it("init --scope creates a nested .ghost bundle", async () => {
    const result = await runCli(
      ["init", "--scope", "apps/checkout", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(await realpath(out.dir)).toBe(
      await realpath(join(dir, "apps", "checkout", ".ghost")),
    );
    const manifest = await readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
      "utf-8",
    );
    expect(manifest).toContain("ghost.fingerprint-package/v1");
    const intent = await readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "intent.yml"),
      "utf-8",
    );
    expect(intent).not.toContain("review_policy");
    expect(intent).not.toContain("proposal");
  });

  it("init --scope creates a nested package under a custom fingerprint directory", async () => {
    const result = await runCli(
      [
        "init",
        "--scope",
        "apps/checkout",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(await realpath(out.dir)).toBe(
      await realpath(join(dir, "apps", "checkout", ".design", "memory")),
    );
    expect(
      await readFile(
        join(
          dir,
          "apps",
          "checkout",
          ".design",
          "memory",
          "fingerprint",
          "manifest.yml",
        ),
        "utf-8",
      ),
    ).toContain("ghost.fingerprint-package/v1");
  });

  it("lint --all and verify --all include nested packages", async () => {
    await writeNestedCheckPackage(dir);

    const lint = await runCli(["lint", "--all", "--format", "json"], dir);
    const verify = await runCli(["verify", "--all", "--format", "json"], dir);
    const scan = await runCli(
      ["scan", "--include-nested", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(JSON.parse(scan.stdout).nested_packages).toHaveLength(2);
  });

  it("lint, verify, and scan discover nested custom fingerprint directories", async () => {
    await writeNestedCheckPackage(dir, ".design/memory");

    const lint = await runCli(
      ["lint", "--all", "--memory-dir", ".design/memory", "--format", "json"],
      dir,
    );
    const verify = await runCli(
      ["verify", "--all", "--memory-dir", ".design/memory", "--format", "json"],
      dir,
    );
    const scan = await runCli(
      [
        "scan",
        "--include-nested",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(JSON.parse(scan.stdout).nested_packages).toHaveLength(2);
  });
});

async function writeCheckPackage(
  dir: string,
  options: { checks?: boolean; detectorPattern?: string } = {},
): Promise<void> {
  const pkg = join(dir, ".ghost");
  const detectorPattern =
    options.detectorPattern ?? "#[0-9a-fA-F]{3,8}|UIColor\\(";
  await mkdir(pkg, { recursive: true });
  await writeSplitFingerprintPackage(
    pkg,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Cash iOS
  situations: []
  principles:
    - id: tokenized-ui-color
      principle: UI colors should come from the product token system.
      check_refs: [validate.check:no-hardcoded-ui-color]
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: lending
        paths: [Code/Features/Lending]
        surface_types: [native-feature]
    surface_types: [native-feature]
  exemplars:
    - id: lending-tokenized-screen
      path: Code/Features/Lending/LendingUI
      title: Lending tokenized UI
      surface_type: native-feature
      scope: lending
      why: Shows semantic CashTheme color usage for native lending UI.
      refs:
        - intent.principle:tokenized-ui-color
        - composition.pattern:tokenized-ui-color
  building_blocks:
    tokens: [CashTheme.primary]
    components: []
composition:
  patterns:
    - id: tokenized-ui-color
      kind: visual
      pattern: Product UI color uses semantic tokens instead of literals.
      check_refs: [validate.check:no-hardcoded-ui-color]
`,
    options.checks === false
      ? undefined
      : `schema: ghost.validate/v1
id: cash-ios
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      intent: [intent.principle:tokenized-ui-color]
      composition: [composition.pattern:tokenized-ui-color]
      inventory: [inventory.exemplar:lending-tokenized-screen]
    applies_to:
      scopes: [lending]
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '${detectorPattern}'
      contexts: [swift]
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
    repair: Replace literals with Arcade/Cash semantic tokens.
  - id: candidate-density-check
    title: Candidate density check
    status: proposed
    severity: nit
    derivation:
      intent: [intent.principle:tokenized-ui-color]
    applies_to:
      scopes: [lending]
      paths: [Code/Features/Lending]
    detector:
      type: required-regex
      pattern: 'CashTheme'
    evidence:
      support: 0.5
      observed_count: 1
      examples:
        - Code/Features/Lending/LendingUI
`,
  );
  await writeFile(
    join(pkg, "resources.yml"),
    `schema: ghost.resources/v1
id: cash-ios
primary:
  target: .
`,
  );
  await writeFile(join(pkg, "map.md"), mapWithScopes());
  await writeFile(
    join(pkg, "survey.json"),
    JSON.stringify({
      schema: "ghost.survey/v1",
      sources: [{ target: ".", scanned_at: "2026-05-06T00:00:00.000Z" }],
      values: [],
      tokens: [],
      components: [],
      ui_surfaces: [],
    }),
  );
  await writeFile(
    join(pkg, "patterns.yml"),
    `schema: ghost.patterns/v1
id: cash-ios
surface_types: []
composition_patterns: []
`,
  );
}

async function writeCoveredSyncManifest(
  dir: string,
  options: { tracked: string },
): Promise<void> {
  const ackedAt = "2026-06-16T00:00:00.000Z";
  await writeFile(
    join(dir, ".ghost-sync.json"),
    JSON.stringify(
      {
        tracks: { type: "path", value: options.tracked },
        ackedAt,
        trackedFingerprintId: "tracked",
        localFingerprintId: "local",
        overallDistance: 0,
        dimensions: {
          spacing: { distance: 0, stance: "accepted", ackedAt },
          palette: { distance: 0, stance: "accepted", ackedAt },
          typography: { distance: 0, stance: "accepted", ackedAt },
          surfaces: { distance: 0, stance: "accepted", ackedAt },
          decisions: { distance: 0, stance: "accepted", ackedAt },
        },
      },
      null,
      2,
    ),
  );
}

async function writeSplitFingerprintPackage(
  pkg: string,
  fingerprintRaw: string,
  checksRaw?: string,
): Promise<void> {
  const fingerprintDir = join(pkg, "fingerprint");
  const doc = parseYaml(fingerprintRaw) as Record<string, unknown>;
  await mkdir(fingerprintDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(fingerprintDir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\n",
    ),
    writeFile(
      join(fingerprintDir, "intent.yml"),
      stringifyYaml(
        doc.intent ?? {
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
    ...(checksRaw
      ? [writeFile(join(fingerprintDir, "validate.yml"), checksRaw)]
      : []),
  ]);
}

function checksFileWithDerivation(intentRef: string): string {
  return `schema: ghost.validate/v1
id: local
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      intent: [${intentRef}]
    applies_to:
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [swift]
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
`;
}

async function writeNestedCheckPackage(
  dir: string,
  memoryDir = ".ghost",
): Promise<void> {
  const rootMemory = memoryPackagePath(dir, memoryDir);
  const checkoutMemory = memoryPackagePath(
    join(dir, "apps", "checkout"),
    memoryDir,
  );
  await mkdir(join(dir, "apps", "checkout", "review"), { recursive: true });
  await mkdir(join(dir, "shared"), { recursive: true });
  await writeFile(join(dir, "apps", "checkout", "review", "page.tsx"), "");
  await writeFile(join(dir, "shared", "home.tsx"), "");

  await writeSplitFingerprintPackage(
    rootMemory,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Root Product
  situations: []
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: app
        paths: [apps, shared]
    surface_types: [web-app]
  building_blocks:
    tokens: [RootTheme]
composition:
  patterns:
    - id: root-token-pattern
      kind: visual
      pattern: Web UI color uses semantic product tokens.
`,
    `schema: ghost.validate/v1
id: root
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: active
    severity: serious
    derivation:
      composition: [composition.pattern:root-token-pattern]
    applies_to:
      paths: [apps, shared]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [react]
    evidence:
      support: 0.93
      observed_count: 8
      examples:
        - shared/home.tsx
`,
  );

  await writeSplitFingerprintPackage(
    checkoutMemory,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Checkout
  situations: []
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: checkout
        paths: [review]
        surface_types: [payment-review]
    surface_types: [payment-review]
  building_blocks:
    tokens: [CheckoutTheme]
composition:
  patterns:
    - id: checkout-token-pattern
      kind: visual
      pattern: Checkout review uses checkout product tokens.
      applies_to:
        paths: [review]
`,
    `schema: ghost.validate/v1
id: checkout
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: disabled
    severity: serious
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [react]
`,
  );
}

function memoryPackagePath(root: string, memoryDir: string): string {
  return join(root, ...memoryDir.split("/"));
}

function webPatch(path: string, added: string): string {
  return `diff --git a/${path} b/${path}
index 1111111..2222222 100644
--- a/${path}
+++ b/${path}
@@ -0,0 +1 @@
+${added}
`;
}

async function writeComparableBundle(
  pkg: string,
  patternId: string,
): Promise<void> {
  await mkdir(pkg, { recursive: true });
  await writeSplitFingerprintPackage(
    pkg,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: ${patternId}
inventory:
  topology:
    surface_types: [settings]
  building_blocks:
    tokens: [${patternId}-token]
composition:
  patterns:
    - id: ${patternId}
      kind: layout
      pattern: ${patternId} uses a settings-oriented layout.
`,
  );
  await writeFile(
    join(pkg, "survey.json"),
    JSON.stringify({
      schema: "ghost.survey/v1",
      sources: [
        { id: patternId, target: ".", scanned_at: "2026-05-10T00:00:00Z" },
      ],
      values: [
        {
          id: `value_${patternId}`,
          source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
          kind: "spacing",
          value: "8px",
          raw: "p-2",
          occurrences: 4,
          files_count: 2,
        },
      ],
      tokens: [],
      components: [],
      ui_surfaces: [
        {
          id: `surface_${patternId}`,
          source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
          name: patternId,
          kind: "route",
          locator: `/${patternId}`,
          renderability: "source-only",
          files: [`src/${patternId}.tsx`],
          classification: { surface_type: "settings" },
          signals: { layout_patterns: [patternId] },
        },
      ],
    }),
  );
  await writeFile(
    join(pkg, "patterns.yml"),
    `schema: ghost.patterns/v1
id: ${patternId}
surface_types:
  - id: settings
    preferred_patterns: [${patternId}]
composition_patterns:
  - id: ${patternId}
    surface_types: [settings]
    evidence:
      - locator: /${patternId}
`,
  );
}

function lendingPatch(line: string): string {
  return `diff --git a/Code/Features/Lending/View.swift b/Code/Features/Lending/View.swift
--- a/Code/Features/Lending/View.swift
+++ b/Code/Features/Lending/View.swift
@@ -0,0 +1,1 @@
+${line}
`;
}

function mapWithScopes(): string {
  return `---
schema: ghost.map/v1
id: cash-ios
repo: squareup/cash-ios
mapped_at: 2026-05-06T00:00:00.000Z
platform: ios
languages:
  - { name: swift, files: 5, share: 1.0 }
build_system: bazel
package_manifests:
  - MODULE.bazel
composition:
  frameworks:
    - { name: swiftui }
  rendering: native
  styling:
    - design-tokens
design_system:
  paths:
    - Code/DesignSystem
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - Code/Features/**
  exclude:
    - "**/Tests/**"
feature_areas:
  - name: lending
    paths:
      - Code/Features/Lending
scopes:
  - id: lending
    name: Lending
    kind: product-surface
    paths:
      - Code/Features/Lending
orientation_files:
  - README.md
---

## Identity

Cash iOS.

## Topology

Native Swift app.

## Conventions

Use feature scopes.
`;
}
