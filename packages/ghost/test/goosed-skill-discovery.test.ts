import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const GHOST_BIN = resolve("packages/ghost/dist/bin.js");

const BAD_SKILL = `---
name: ghost
description: Author, validate, consume, and review against a repo-local ghost package: the medium-agnostic articulation of a product's brand. Use when the user wants to set up a .ghost package.
---

# Bad ghost skill
`;

function hasGhostSkill(output: string): boolean {
  return output.split(/\r?\n/).some((line) => /^ghost\s+\|/.test(line));
}

async function runGoosedSkillsList(
  gooseBin: string,
  cwd: string,
  envRoot: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      gooseBin,
      ["skills", "list"],
      {
        cwd,
        env: {
          ...process.env,
          HOME: join(envRoot, "home"),
          XDG_CONFIG_HOME: join(envRoot, "home", ".config"),
          GOOSE_PATH_ROOT: join(envRoot, "goose-root"),
        },
        timeout: 20_000,
      },
    );
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message,
      code: typeof err.code === "number" ? err.code : 1,
    };
  }
}

describe("goosed skill discovery", () => {
  it.skipIf(!process.env.GOOSE_BIN)(
    "lists the installed ghost skill only when SKILL.md frontmatter is valid (set GOOSE_BIN to opt in; skipped when unavailable)",
    async () => {
      const gooseBin = process.env.GOOSE_BIN;
      expect(
        gooseBin,
        "set GOOSE_BIN to the goosed binary to run this test",
      ).toBeTruthy();

      const root = await mkdtemp(join(tmpdir(), "ghost-goosed-skill-"));
      try {
        const cwd = join(root, "work");
        await mkdir(join(cwd, ".agents", "skills", "ghost"), {
          recursive: true,
        });
        await mkdir(join(root, "home"), { recursive: true });
        await mkdir(join(root, "goose-root"), { recursive: true });

        await writeFile(
          join(cwd, ".agents", "skills", "ghost", "SKILL.md"),
          BAD_SKILL,
        );
        const malformed = await runGoosedSkillsList(
          gooseBin as string,
          cwd,
          root,
        );
        expect(
          malformed.code !== 0 || !hasGhostSkill(malformed.stdout),
          `malformed skill should be rejected or omitted; stdout:\n${malformed.stdout}\nstderr:\n${malformed.stderr}`,
        ).toBe(true);

        await rm(join(cwd, ".agents", "skills", "ghost"), {
          recursive: true,
          force: true,
        });
        await execFileAsync(
          process.execPath,
          [GHOST_BIN, "skill", "install", "--dest", ".agents/skills/ghost"],
          {
            cwd,
            env: {
              ...process.env,
              HOME: join(root, "home"),
              XDG_CONFIG_HOME: join(root, "home", ".config"),
              GOOSE_PATH_ROOT: join(root, "goose-root"),
            },
            timeout: 20_000,
          },
        );

        const installedSkill = await readFile(
          join(cwd, ".agents", "skills", "ghost", "SKILL.md"),
          "utf-8",
        );
        expect(installedSkill).toContain("description: >-");

        const fixed = await runGoosedSkillsList(gooseBin as string, cwd, root);
        expect(fixed.code, fixed.stderr).toBe(0);
        expect(fixed.stdout).toContain("ghost");
        expect(fixed.stdout).toContain("Author, validate, consume");
        expect(hasGhostSkill(fixed.stdout), fixed.stdout).toBe(true);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
