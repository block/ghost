import { mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildCli } from "../src/cli.js";

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
    cli.parse(["node", "ghost-memory", ...argv]);
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    stdoutSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}

describe("ghost-memory CLI", () => {
  it("emits the skill bundle", async () => {
    const dir = join(
      tmpdir(),
      `ghost-memory-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    try {
      await mkdir(dir, { recursive: true });
      const result = await runCli(["emit", "skill", "--out", "skill"], dir);
      const refs = await readdir(join(dir, "skill", "references"));

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("SKILL.md");
      expect(refs.sort()).toEqual([
        "brief.md",
        "capture.md",
        "critique.md",
        "promote.md",
        "recall.md",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
