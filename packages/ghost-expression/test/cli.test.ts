import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Bucket, BucketSource } from "@ghost/core";
import { tokenRowId, valueRowId } from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCli } from "../src/cli.js";

const BASE_EXPRESSION = `---
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

# Signature

- Small, plain surfaces

# Decisions

### shape-language
Use modest radii.
`;

function expressionWithId(id: string): string {
  return BASE_EXPRESSION.replace("id: local", `id: ${id}`);
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
    cli.parse(["node", "ghost-expression", ...argv]);
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

describe("ghost-expression CLI defaults", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-expression-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lint defaults to ./expression.md", async () => {
    await writeFile(join(dir, "expression.md"), expressionWithId("local"));

    const result = await runCli(["lint"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
    expect(result.stderr).toBe("");
  });

  it("describe defaults to ./expression.md", async () => {
    await writeFile(join(dir, "expression.md"), expressionWithId("local"));

    const result = await runCli(["describe"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("expression.md");
    expect(result.stdout).toContain("# Character");
  });

  it("diff returns 0 (unchanged) when comparing identical expressions", async () => {
    await writeFile(join(dir, "a.expression.md"), expressionWithId("a"));
    await writeFile(join(dir, "b.expression.md"), expressionWithId("a"));

    const result = await runCli(
      ["diff", "a.expression.md", "b.expression.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("diff returns 1 (changed) when expressions differ", async () => {
    const drifted = expressionWithId("b").replace(
      "borderRadii: [4, 8]",
      "borderRadii: [4, 8, 16]",
    );
    await writeFile(join(dir, "a.expression.md"), expressionWithId("a"));
    await writeFile(join(dir, "b.expression.md"), drifted);

    const result = await runCli(
      ["diff", "a.expression.md", "b.expression.md"],
      dir,
    );

    expect(result.code).toBe(1);
  });
});

const SOURCE_A: BucketSource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

const SOURCE_B: BucketSource = {
  target: "github:block/other",
  commit: "def456",
  scanned_at: "2026-04-29T12:00:00Z",
};

function makeBucket(source: BucketSource, hex = "#f97316"): Bucket {
  return {
    schema: "ghost.bucket/v1",
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
    libraries: [],
  };
}

describe("ghost-expression lint dispatches by file kind", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-expression-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lints a well-formed bucket.json with exit 0", async () => {
    await writeFile(
      join(dir, "bucket.json"),
      JSON.stringify(makeBucket(SOURCE_A), null, 2),
    );

    const result = await runCli(["lint", "bucket.json"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
  });

  it("lints a malformed bucket.json with exit 1", async () => {
    await writeFile(
      join(dir, "bucket.json"),
      JSON.stringify({ schema: "ghost.bucket/v0" }, null, 2),
    );

    const result = await runCli(["lint", "bucket.json"], dir);

    expect(result.code).toBe(1);
  });

  it("auto-detects bucket-by-content when path lacks .json extension", async () => {
    await writeFile(
      join(dir, "bucket.txt"),
      JSON.stringify(makeBucket(SOURCE_A), null, 2),
    );

    const result = await runCli(["lint", "bucket.txt"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 error(s)");
  });
});

describe("ghost-expression bucket merge", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-expression-merge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("merges two buckets with distinct sources into one", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeBucket(SOURCE_A)));
    await writeFile(join(dir, "b.json"), JSON.stringify(makeBucket(SOURCE_B)));

    const result = await runCli(
      ["bucket", "merge", "a.json", "b.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(0);
    const merged = JSON.parse(
      await readFile(join(dir, "merged.json"), "utf-8"),
    );
    expect(merged.schema).toBe("ghost.bucket/v1");
    expect(merged.sources).toHaveLength(2);
    expect(merged.values).toHaveLength(2);
    expect(merged.tokens).toHaveLength(2);
  });

  it("dedupes rows with identical IDs (same source, same content)", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeBucket(SOURCE_A)));
    await writeFile(join(dir, "a2.json"), JSON.stringify(makeBucket(SOURCE_A)));

    const result = await runCli(
      ["bucket", "merge", "a.json", "a2.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(0);
    const merged = JSON.parse(
      await readFile(join(dir, "merged.json"), "utf-8"),
    );
    expect(merged.sources).toHaveLength(1);
    expect(merged.values).toHaveLength(1);
    expect(merged.tokens).toHaveLength(1);
  });

  it("writes to stdout when -o is omitted", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeBucket(SOURCE_A)));

    const result = await runCli(["bucket", "merge", "a.json"], dir);

    expect(result.code).toBe(0);
    const merged = JSON.parse(result.stdout);
    expect(merged.schema).toBe("ghost.bucket/v1");
    expect(merged.values).toHaveLength(1);
  });

  it("fails when an input bucket has lint errors", async () => {
    await writeFile(
      join(dir, "bad.json"),
      JSON.stringify({ schema: "ghost.bucket/v0" }),
    );

    const result = await runCli(
      ["bucket", "merge", "bad.json", "-o", "merged.json"],
      dir,
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("failed bucket lint");
  });
});

describe("ghost-expression bucket fix-ids", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-expression-fixids-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("populates empty IDs and writes a lint-clean bucket", async () => {
    const draft: Bucket = {
      schema: "ghost.bucket/v1",
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
      libraries: [],
    };
    await writeFile(join(dir, "draft.json"), JSON.stringify(draft));

    const fix = await runCli(
      ["bucket", "fix-ids", "draft.json", "-o", "fixed.json"],
      dir,
    );
    expect(fix.code).toBe(0);

    const lint = await runCli(["lint", "fixed.json"], dir);
    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("0 error(s)");
  });

  it("rejects more than one input file", async () => {
    await writeFile(join(dir, "a.json"), JSON.stringify(makeBucket(SOURCE_A)));
    await writeFile(join(dir, "b.json"), JSON.stringify(makeBucket(SOURCE_B)));

    const result = await runCli(["bucket", "fix-ids", "a.json", "b.json"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("exactly one input file");
  });
});
