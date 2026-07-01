import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runSkillInstall } from "../src/commands/skill.js";

let dir: string | null = null;

afterEach(async () => {
  if (dir) {
    await rm(dir, { recursive: true, force: true });
    dir = null;
  }
});

describe("runSkillInstall", () => {
  it("writes the bundle to an explicit destination", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-skill-"));
    const result = await runSkillInstall({ dest: dir, force: true });
    expect(result.code).toBe(0);
    expect(result.written).toContain("SKILL.md");
    expect(result.written).toContain("references/authoring.md");

    const skill = await readFile(join(dir, "SKILL.md"), "utf8");
    expect(skill).toContain("name: haunt");
    expect(skill).toContain("high-altitude compositional drift");
  });

  it("refuses to overwrite without --force", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-skill-"));
    await runSkillInstall({ dest: dir, force: true });
    const second = await runSkillInstall({ dest: dir });
    expect(second.code).toBe(3);
    expect(second.written).toHaveLength(0);
  });
});
