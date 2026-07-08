import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assemblePrompt } from "../lib/arms.mjs";
import { parseAsks } from "../lib/asks.mjs";
import { loadConfig } from "../lib/config.mjs";
import { retrievalMetrics, scoreHtml } from "../lib/score.mjs";
import { closeRun, openRun } from "../lib/tape.mjs";

let dir: string;
beforeEach(() => {
  dir = join(
    tmpdir(),
    `steering-eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function writeProject() {
  const pkg = join(dir, ".ghost");
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: test\n",
  );
  writeFileSync(join(pkg, "glossary.md"), "Glossary prose\n");
  writeFileSync(
    join(pkg, "principle.test.md"),
    "---\ndescription: Test\n---\n\nNode prose here.\n",
  );
  writeFileSync(
    join(dir, "asks.md"),
    "## Ask 1 — page\n\nMake a page.\nexpect: principle.test\npoison: pattern.email\ndiscount: font-x\n",
  );
  writeFileSync(join(dir, "ballast.md"), "ballast words\n");
  writeFileSync(
    join(dir, "eval.config.json"),
    JSON.stringify({
      package: "./.ghost",
      asks: "./asks.md",
      ballast: "./ballast.md",
      arms: { naked: true, dump: true, gather: true },
      ghostBin: "node",
    }),
  );
  return loadConfig(dir);
}

describe("steering-eval", () => {
  it("teaches config validation errors", () => {
    writeFileSync(
      join(dir, "eval.config.json"),
      JSON.stringify({ asks: "./asks.md", ballast: "./ballast.md", arms: {} }),
    );
    expect(() => loadConfig(dir)).toThrow(/package.*Example/s);
  });

  it("parses asks and strips retrieval lines", () => {
    const asks = parseAsks(
      "## Ask 2 — email\n\nBody line.\nexpect: a, b\npoison: c\ndiscount: font\nMore body.\n",
    );
    expect(asks[0]).toMatchObject({
      n: 2,
      title: "email",
      expect: ["a", "b"],
      poison: ["c"],
      discount: ["font"],
    });
    expect(asks[0].body).toBe("Body line.\nMore body.");
  });

  it("assembles naked and dump prompts", () => {
    const config = writeProject();
    const naked = assemblePrompt(config, "naked", 1, 1).prompt;
    expect(naked).not.toContain("Node prose here");
    const dump = assemblePrompt(config, "dump", 1, 1).prompt;
    expect(dump).toContain("Node prose here");
  });

  it("assembles gather prompts with menu output", () => {
    const config = writeProject();
    const script = join(dir, "fake-ghost.mjs");
    writeFileSync(script, "console.log('MENU marker principle.test')\n");
    config.ghostBin = process.execPath;
    config.ghostArgs = [script];
    const prompt = assemblePrompt(config, "gather", 1, 1).prompt;
    expect(prompt).toContain("MENU marker");
    expect(prompt).toContain("pull <ids>");
  });

  it("slices the tape from lock offset", () => {
    const config = writeProject();
    writeFileSync(
      join(config.package, ".events"),
      `${JSON.stringify({ ts: "old", event: "pull", ids: ["old"] })}\n`,
    );
    openRun(config, "gather", 1, 1);
    writeFileSync(
      join(config.package, ".events"),
      `${readFileSync(join(config.package, ".events"), "utf8")}${JSON.stringify({ ts: "new", event: "gather", menu: ["a"] })}\n${JSON.stringify({ ts: "new", event: "pull", ids: ["a", "b"] })}\n`,
    );
    const closed = closeRun(config);
    expect(closed.pulledIds.sort()).toEqual(["a", "b"]);
    expect(closed.pullCount).toBe(1);
    expect(closed.events).toHaveLength(2);
  });

  it("hard-fails when a lock exists", () => {
    const cli = resolve("packages/steering-eval/cli.mjs");
    writeProject();
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", ".run.lock"), "{}\n");
    const result = spawnSync(
      process.execPath,
      [cli, "prompt", "naked", "1", "--run", "1"],
      { cwd: dir, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("run lock exists");
  });

  it("scores known tells", () => {
    const tells = [
      { id: "a", kind: "text", pattern: "Hello", weight: 2 },
      { id: "b", kind: "regex", pattern: "color:\\s*red", weight: 3 },
      { id: "c", kind: "regex", pattern: "border", weight: 1 },
    ];
    expect(
      scoreHtml("Hello <style>x{color: red; border: 0}</style>", tells).score,
    ).toBe(6);
  });

  it("computes retrieval math", () => {
    const metrics = retrievalMetrics(
      [
        { tape: { pulledIds: ["a", "b"] } },
        { tape: { pulledIds: ["a", "c"] } },
      ],
      { expect: ["a", "b"], poison: ["c"] },
    );
    expect(metrics.precision).toBe(0.75);
    expect(metrics.recall).toBe(0.75);
    expect(metrics.poisonCount).toBe(1);
    expect(metrics.selectionStability).toBeCloseTo(1 / 3);
  });
});
