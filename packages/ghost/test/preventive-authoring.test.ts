import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runCli } from "./cli-test-utils.js";

it("delivers form selection and complete-edit safeguards", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ghost-preventive-authoring-"));
  try {
    const install = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );
    expect(install.code).toBe(0);
    const authoring = (
      await readFile(join(dir, "skills/ghost/references/authoring.md"), "utf8")
    ).replace(/\s+/g, " ");
    // These assertions check delivery, not model behavior or design quality.
    for (const form of [
      "Use prose for priorities, choices, conditions, and reasons",
      "Use `materials` when a concrete source",
      "Use an example when several decisions",
      "Use a `## Skeleton` only when matching work must begin",
      "Use a rejection when it prevents a likely harmful choice",
    ]) {
      expect(authoring).toContain(form);
    }
    expect(authoring).toContain("Give each decision one authoritative home");
    expect(authoring).toContain("Examples may demonstrate it");
    expect(authoring).toContain(
      "each edited node remains usable with the cover when pulled on its own",
    );
    expect(authoring).toContain(
      "Update affected material locators, glossary entries, manifest pointers, and check references",
    );
    expect(authoring).toContain("Keep checks review-only");
    expect(authoring).toContain(
      "Every obligation in a check must already be stated in its referenced guidance",
    );
    expect(authoring).toContain("account for every original decision");
    expect(authoring).toContain(
      "New or changed decisions still need human approval",
    );
    expect(authoring).toContain(
      "Validation confirms package shape, not whether a brand decision is correct",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
