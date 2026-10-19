import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runCli } from "./cli-test-utils.js";

it("delivers full-starter initialization after intake approval", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ghost-intake-authoring-"));
  try {
    const install = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );
    expect(install.code).toBe(0);
    const root = join(dir, "skills/ghost/references");
    const authoring = (
      await readFile(join(root, "authoring.md"), "utf8")
    ).replace(/\s+/g, " ");
    const intake = (await readFile(join(root, "intake.md"), "utf8")).replace(
      /\s+/g,
      " ",
    );
    // Instruction delivery is not proof that a host follows the workflow.
    expect(authoring).toContain("use `ghost init` after intake approval");
    expect(authoring).toContain("Inspect every initialized file");
    expect(authoring).toContain(
      "Do not hand-create the manifest, glossary, cover, or a reduced starter",
    );
    expect(authoring).toContain(
      "Keep the first brand decision small, not the scaffold",
    );
    expect(intake).toContain(
      "run `ghost init` and inspect the complete starter after intake approval",
    );
    expect(intake).toContain("Do not hand-create a reduced package");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
