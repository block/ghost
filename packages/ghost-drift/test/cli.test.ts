import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  shadowComplexity: none
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
    cli.parse(["node", "ghost-drift", ...argv]);
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

describe("ghost-drift CLI", () => {
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

  it("compares explicitly supplied expression files", async () => {
    await writeFile(join(dir, "a.expression.md"), expressionWithId("a"));
    await writeFile(join(dir, "b.expression.md"), expressionWithId("b"));

    const result = await runCli(
      ["compare", "a.expression.md", "b.expression.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Distance");
  });

  it("track writes the neutral sync manifest shape", async () => {
    await writeFile(join(dir, "expression.md"), expressionWithId("local"));
    await writeFile(
      join(dir, "tracked.expression.md"),
      expressionWithId("tracked"),
    );

    const result = await runCli(["track", "tracked.expression.md"], dir);
    const manifest = JSON.parse(
      await readFile(join(dir, ".ghost-sync.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(result.code).toBe(0);
    expect(manifest.tracks).toEqual({
      type: "path",
      value: "tracked.expression.md",
    });
    expect(manifest.trackedExpressionId).toBe("tracked");
    expect(manifest.localExpressionId).toBe("local");
    const legacyRelationFields = [
      "parent",
      ["parent", "ExpressionId"].join(""),
      ["child", "ExpressionId"].join(""),
    ];
    for (const field of legacyRelationFields) {
      expect(manifest).not.toHaveProperty(field);
    }
  });

  it("lint surfaces a migration message pointing at ghost-expression", async () => {
    const result = await runCli(["lint"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("ghost-expression lint");
  });

  it("describe surfaces a migration message pointing at ghost-expression", async () => {
    const result = await runCli(["describe"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("ghost-expression describe");
  });

  it("emit review-command surfaces a migration message", async () => {
    const result = await runCli(["emit", "review-command"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("ghost-expression emit review-command");
  });
});
