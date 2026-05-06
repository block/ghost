import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Survey, SurveySource } from "@ghost/core";
import {
  componentRowId,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCli } from "../src/cli.js";

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

function profileFingerprintWithPalette(hex: string): string {
  return BASE_FINGERPRINT.replace(
    '- { role: primary, value: "#111111" }',
    `- { role: primary, value: "${hex}" }`,
  ).replace(
    'neutrals: { steps: ["#ffffff", "#111111"], count: 2 }',
    `neutrals: { steps: ["${hex}"], count: 1 }`,
  );
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
    cli.parse(["node", "ghost-fingerprint", ...argv]);
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
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

describe("ghost-fingerprint CLI defaults", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lint defaults to ./fingerprint.md", async () => {
    await writeFile(join(dir, "fingerprint.md"), fingerprintWithId("local"));

    const result = await runCli(["lint"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
    expect(result.stderr).toBe("");
  });

  it("describe defaults to ./fingerprint.md", async () => {
    await writeFile(join(dir, "fingerprint.md"), fingerprintWithId("local"));

    const result = await runCli(["describe"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("fingerprint.md");
    expect(result.stdout).toContain("# Character");
  });

  it("diff returns 0 (unchanged) when comparing identical fingerprints", async () => {
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), fingerprintWithId("a"));

    const result = await runCli(
      ["diff", "a.fingerprint.md", "b.fingerprint.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("diff returns 1 (changed) when fingerprints differ", async () => {
    const drifted = fingerprintWithId("b").replace(
      "borderRadii: [4, 8]",
      "borderRadii: [4, 8, 16]",
    );
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), drifted);

    const result = await runCli(
      ["diff", "a.fingerprint.md", "b.fingerprint.md"],
      dir,
    );

    expect(result.code).toBe(1);
  });
});

const SOURCE_A: SurveySource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

const SOURCE_B: SurveySource = {
  target: "github:block/other",
  commit: "def456",
  scanned_at: "2026-04-29T12:00:00Z",
};

function makeSurvey(source: SurveySource, hex = "#f97316"): Survey {
  return {
    schema: "ghost.survey/v2",
    sources: [source],
    values: [
      {
        id: valueRowId(source, "color", hex, hex),
        source,
        kind: "color",
        value: hex,
        raw: hex,
        occurrences: 1,
        files_count: 1,
      },
      ...[4, 8, 16].map((value) => ({
        id: valueRowId(source, "spacing", `${value}px`, `p-${value}`),
        source,
        kind: "spacing",
        value: `${value}px`,
        raw: `p-${value}`,
        spec: { scalar: value, unit: "px" },
        occurrences: 6,
        files_count: 2,
      })),
      ...[12, 16, 24].map((value) => ({
        id: valueRowId(source, "typography", `${value}px`, `text-${value}`),
        source,
        kind: "typography",
        value: `${value}px`,
        raw: `text-${value}`,
        spec: { size: { scalar: value, unit: "px" } },
        occurrences: 6,
        files_count: 2,
      })),
      {
        id: valueRowId(source, "typography", "Inter", "font-inter"),
        source,
        kind: "typography",
        value: "Inter",
        raw: "font-inter",
        spec: { family: "Inter" },
        occurrences: 6,
        files_count: 2,
      },
      {
        id: valueRowId(source, "typography", "400", "font-normal"),
        source,
        kind: "typography",
        value: "400",
        raw: "font-normal",
        spec: { weight: 400 },
        occurrences: 6,
        files_count: 2,
      },
      ...[4, 8].map((value) => ({
        id: valueRowId(source, "radius", `${value}px`, `rounded-${value}`),
        source,
        kind: "radius",
        value: `${value}px`,
        raw: `rounded-${value}`,
        spec: { scalar: value, unit: "px" },
        occurrences: 6,
        files_count: 2,
      })),
    ],
    tokens: [
      {
        id: tokenRowId(source, "--brand-primary"),
        source,
        name: "--brand-primary",
        alias_chain: [],
        resolved_value: hex,
        occurrences: 1,
      },
    ],
    components: [],
    ui_surfaces: [
      {
        id: uiSurfaceRowId(source, "Settings", "route", "/settings"),
        source,
        name: "Settings",
        kind: "route",
        locator: "/settings",
        renderability: "source-only",
        files: ["src/routes/settings.tsx"],
        classification: {
          intent: "configure",
          surface_type: "settings",
          density: "standard",
          layout_shape: "control-surface",
          confidence: 0.8,
        },
        signals: {
          dominant_components: ["Button"],
          layout_patterns: ["sectioned-form"],
        },
      },
    ],
  };
}

function makeLargeSurvey(source: SurveySource): Survey {
  return {
    ...makeSurvey(source),
    components: Array.from({ length: 25 }, (_, index) => ({
      id: componentRowId(source, `Component${index}`),
      source,
      name: `Component${index}`,
      discovered_via: index % 2 === 0 ? "registry.json" : "barrel-export",
      variants: index % 3 === 0 ? ["default", "secondary"] : undefined,
      sizes: index % 4 === 0 ? ["sm", "md"] : undefined,
    })),
    ui_surfaces: Array.from({ length: 10 }, (_, index) => {
      const name = `Surface ${index}`;
      const kind = "route";
      const locator = `/surface-${index}`;
      return {
        id: uiSurfaceRowId(source, name, kind, locator),
        source,
        name,
        kind,
        locator,
        renderability: "source-only",
        files: [`src/routes/surface-${index}.tsx`],
        classification: {
          intent: index % 2 === 0 ? "configure" : "review",
          surface_type: index % 2 === 0 ? "settings" : "audit",
          density: index % 2 === 0 ? "compressed" : "standard",
          layout_shape: index % 2 === 0 ? "control-surface" : "tracker",
          confidence: 0.8,
        },
        signals: {
          dominant_components: ["Button", "Input"],
          layout_patterns:
            index % 2 === 0 ? ["sectioned-form"] : ["data-table"],
        },
      };
    }),
  };
}

describe("ghost-fingerprint lint dispatches by file kind", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lints a well-formed survey.json with exit 0", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A), null, 2),
    );

    const result = await runCli(["lint", "survey.json"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
  });

  it("lints a malformed survey.json with exit 1", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify({ schema: "ghost.survey/v0" }, null, 2),
    );

    const result = await runCli(["lint", "survey.json"], dir);

    expect(result.code).toBe(1);
  });

  it("auto-detects survey-by-content when path lacks .json extension", async () => {
    await writeFile(
      join(dir, "survey.txt"),
      JSON.stringify(makeSurvey(SOURCE_A), null, 2),
    );

    const result = await runCli(["lint", "survey.txt"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
  });
});

describe("ghost-fingerprint verify-profile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-verify-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes JSON output for a survey-backed fingerprint", async () => {
    await writeFile(
      join(dir, "fingerprint.md"),
      profileFingerprintWithPalette("#f97316"),
    );
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A), null, 2),
    );

    const result = await runCli(
      ["verify-profile", "fingerprint.md", "survey.json", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.errors).toBe(0);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "info",
          rule: "fingerprint/checks-missing",
        }),
      ]),
    );
  });

  it("exits non-zero when palette values are absent from the survey", async () => {
    await writeFile(
      join(dir, "fingerprint.md"),
      profileFingerprintWithPalette("#1c1c1c"),
    );
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A), null, 2),
    );

    const result = await runCli(
      ["verify-profile", "fingerprint.md", "survey.json"],
      dir,
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("palette-color-not-in-survey");
  });
});

describe("ghost-fingerprint survey merge", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-merge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("merges two surveys with distinct sources into one", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeSurvey(SOURCE_A)));
    await writeFile(join(dir, "b.json"), JSON.stringify(makeSurvey(SOURCE_B)));

    const result = await runCli(
      ["survey", "merge", "a.json", "b.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(0);
    const merged = JSON.parse(
      await readFile(join(dir, "merged.json"), "utf-8"),
    );
    expect(merged.schema).toBe("ghost.survey/v2");
    expect(merged.sources).toHaveLength(2);
    expect(merged.values).toHaveLength(22);
    expect(merged.tokens).toHaveLength(2);
    expect(merged.ui_surfaces).toHaveLength(2);
  });

  it("dedupes rows with identical IDs (same source, same content)", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeSurvey(SOURCE_A)));
    await writeFile(join(dir, "a2.json"), JSON.stringify(makeSurvey(SOURCE_A)));

    const result = await runCli(
      ["survey", "merge", "a.json", "a2.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(0);
    const merged = JSON.parse(
      await readFile(join(dir, "merged.json"), "utf-8"),
    );
    expect(merged.sources).toHaveLength(1);
    expect(merged.values).toHaveLength(11);
    expect(merged.tokens).toHaveLength(1);
  });

  it("writes to stdout when -o is omitted", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeSurvey(SOURCE_A)));

    const result = await runCli(["survey", "merge", "a.json"], dir);

    expect(result.code).toBe(0);
    const merged = JSON.parse(result.stdout);
    expect(merged.schema).toBe("ghost.survey/v2");
    expect(merged.values).toHaveLength(11);
  });

  it("fails when an input survey has lint errors", async () => {
    await writeFile(
      join(dir, "bad.json"),
      JSON.stringify({ schema: "ghost.survey/v0" }),
    );

    const result = await runCli(
      ["survey", "merge", "bad.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("failed survey lint");
  });
});

describe("ghost-fingerprint survey fix-ids", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-fixids-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("populates empty IDs and writes a lint-clean survey", async () => {
    const draft: Survey = {
      schema: "ghost.survey/v2",
      sources: [SOURCE_A],
      values: [
        {
          id: "",
          source: SOURCE_A,
          kind: "color",
          value: "#f97316",
          raw: "#f97316",
          occurrences: 1,
          files_count: 1,
        },
      ],
      tokens: [],
      components: [],
      ui_surfaces: [
        {
          id: "",
          source: SOURCE_A,
          name: "Settings",
          kind: "route",
          locator: "/settings",
          renderability: "source-only",
          files: ["src/routes/settings.tsx"],
          signals: { layout_patterns: ["sectioned-form"] },
        },
      ],
    };
    await writeFile(join(dir, "draft.json"), JSON.stringify(draft));

    const fix = await runCli(
      ["survey", "fix-ids", "draft.json", "-o", "fixed.json"],
      dir,
    );
    expect(fix.code).toBe(0);

    const lint = await runCli(["lint", "fixed.json"], dir);
    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("0 error(s)");
  });

  it("rejects more than one input file", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeSurvey(SOURCE_A)));
    await writeFile(join(dir, "b.json"), JSON.stringify(makeSurvey(SOURCE_B)));

    const result = await runCli(["survey", "fix-ids", "a.json", "b.json"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("exactly one input file");
  });
});

describe("ghost-fingerprint survey summarize", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-summary-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes Markdown to stdout by default", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(["survey", "summarize", "survey.json"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Survey Summary");
    expect(result.stdout).toContain("Budget: `standard`");
    expect(result.stdout).toContain(
      valueRowId(SOURCE_A, "color", "#f97316", "#f97316"),
    );
    expect(result.stderr).toBe("");
  });

  it("writes JSON when requested", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(
      ["survey", "summarize", "survey.json", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.schema).toBe("ghost.survey.summary/v1");
    expect(summary.counts.values).toBe(11);
    expect(summary.values.kinds[0].top[0].id).toBe(
      valueRowId(SOURCE_A, "color", "#f97316", "#f97316"),
    );
  });

  it("writes to --out", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(
      ["survey", "summarize", "survey.json", "--out", "summary.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    const summary = await readFile(join(dir, "summary.md"), "utf-8");
    expect(summary).toContain("# Survey Summary");
  });

  it("applies budget caps deterministically", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeLargeSurvey(SOURCE_A)),
    );

    const compact = await runCli(
      [
        "survey",
        "summarize",
        "survey.json",
        "--format",
        "json",
        "--budget",
        "compact",
      ],
      dir,
    );
    const full = await runCli(
      [
        "survey",
        "summarize",
        "survey.json",
        "--format",
        "json",
        "--budget",
        "full",
      ],
      dir,
    );

    expect(compact.code).toBe(0);
    expect(full.code).toBe(0);
    expect(JSON.parse(compact.stdout).components.top).toHaveLength(20);
    expect(JSON.parse(full.stdout).components.top).toHaveLength(25);
  });

  it("fails when the input survey has lint errors", async () => {
    await writeFile(
      join(dir, "bad.json"),
      JSON.stringify({ schema: "ghost.survey/v0" }),
    );

    const result = await runCli(["survey", "summarize", "bad.json"], dir);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("failed survey lint");
    expect(result.stderr).toContain("before summarizing");
  });

  it("rejects invalid summarize options", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(
      ["survey", "summarize", "survey.json", "--budget", "tiny"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--budget");
  });
});

describe("ghost-fingerprint survey catalog", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-catalog-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes Markdown to stdout by default", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(["survey", "catalog", "survey.json"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Survey Value Catalog");
    expect(result.stdout).toContain("## color");
    expect(result.stdout).toContain("## spacing");
    expect(result.stdout).toContain("`#f97316`");
  });

  it("writes JSON when requested and aggregates duplicate values", async () => {
    const survey = makeSurvey(SOURCE_A);
    survey.values.push({
      id: valueRowId(SOURCE_A, "color", "#f97316", "text-brand"),
      source: SOURCE_A,
      kind: "color",
      value: "#f97316",
      raw: "text-brand",
      occurrences: 7,
      files_count: 3,
      usage: { className: 7 },
    });
    await writeFile(join(dir, "survey.json"), JSON.stringify(survey));

    const result = await runCli(
      ["survey", "catalog", "survey.json", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const catalog = JSON.parse(result.stdout);
    expect(catalog.schema).toBe("ghost.survey.catalog/v1");
    const color = catalog.kinds.find(
      (kind: { kind: string }) => kind.kind === "color",
    );
    expect(color.values[0]).toMatchObject({
      value: "#f97316",
      rows: 2,
      occurrences: 8,
      files_count: 4,
    });
    expect(color.values[0].raws).toEqual(["#f97316", "text-brand"]);
  });

  it("filters by kind", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(
      ["survey", "catalog", "survey.json", "--kind", "spacing"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Filter: kind `spacing`");
    expect(result.stdout).toContain("## spacing");
    expect(result.stdout).not.toContain("## color");
  });

  it("writes to --out", async () => {
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(makeSurvey(SOURCE_A)),
    );

    const result = await runCli(
      ["survey", "catalog", "survey.json", "--out", "catalog.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    const catalog = await readFile(join(dir, "catalog.md"), "utf-8");
    expect(catalog).toContain("# Survey Value Catalog");
  });

  it("fails when the input survey has lint errors", async () => {
    await writeFile(
      join(dir, "bad.json"),
      JSON.stringify({ schema: "ghost.survey/v0" }),
    );

    const result = await runCli(["survey", "catalog", "bad.json"], dir);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("failed survey lint");
  });
});
