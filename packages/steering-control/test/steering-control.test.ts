import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assemblePrompt } from "../lib/arms.mjs";
import { parseAsks } from "../lib/asks.mjs";
import { loadConfig } from "../lib/config.mjs";
import {
  loopMetrics,
  retrievalMetrics,
  scoreAll,
  scoreHtml,
} from "../lib/score.mjs";
import { closeRun, openRun } from "../lib/tape.mjs";

let dir: string;
beforeEach(() => {
  dir = join(
    tmpdir(),
    `steering-control-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe("steering-control", () => {
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

  it("assembles gather prompts with stamped commands and making loop", () => {
    const config = writeProject();
    const script = join(dir, "fake-ghost.mjs");
    writeFileSync(
      script,
      "console.log('MENU marker principle.test ' + process.argv.slice(2).join(' '))\n",
    );
    config.ghostBin = process.execPath;
    config.ghostArgs = [script];
    const { prompt, inventory } = assemblePrompt(config, "gather", 1, 1);
    expect(prompt).toContain("MENU marker");
    expect(prompt).toContain("gather Make a page. --package");
    expect(prompt).toContain("--run gather-ask1-run1");
    expect(prompt).toContain("pull <ids> --package");
    expect(prompt).toContain("inspect");
    expect(prompt).toContain("Brief the work");
    expect(prompt).toContain("Render task-relevant viewports");
    expect(prompt).toContain("Repair within a bounded budget");
    expect(prompt).toContain("review --package");
    expect(prompt).toContain("run-1.loop.json");
    expect(prompt).toContain('"inspectedMaterials"');
    expect(inventory.instructions).toBeGreaterThan(0);
    expect(inventory.total).toBe(
      inventory.ballast +
        inventory.brand +
        inventory.menu +
        inventory.instructions +
        inventory.ask,
    );
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
    const cli = resolve("packages/steering-control/cli.mjs");
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

  it("finishes gather with valid loop receipt in meta", () => {
    const cli = resolve("packages/steering-control/cli.mjs");
    const config = writeProject();
    const runDir = join(config.out, "gather", "ask-1");
    mkdirSync(runDir, { recursive: true });
    openRun(config, "gather", 1, 1);
    writeFileSync(join(runDir, "run-1.html"), "<html></html>");
    writeFileSync(
      join(runDir, "run-1.loop.json"),
      `${JSON.stringify({
        pulledIds: ["principle.test"],
        inspectedMaterials: ["tokens.css"],
        rendered: true,
        repairPasses: 2,
        reviewRan: false,
      })}\n`,
    );
    const result = spawnSync(
      process.execPath,
      [cli, "finish", "gather", "1", "1"],
      {
        cwd: dir,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    const meta = JSON.parse(
      readFileSync(join(runDir, "run-1.meta.json"), "utf8"),
    );
    expect(meta.loop).toMatchObject({ rendered: true, repairPasses: 2 });
  });

  it("warns but does not fail when gather loop receipt is missing", () => {
    const cli = resolve("packages/steering-control/cli.mjs");
    const config = writeProject();
    const runDir = join(config.out, "gather", "ask-1");
    mkdirSync(runDir, { recursive: true });
    openRun(config, "gather", 1, 1);
    writeFileSync(join(runDir, "run-1.html"), "<html></html>");
    const result = spawnSync(
      process.execPath,
      [cli, "finish", "gather", "1", "1"],
      {
        cwd: dir,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("expected loop receipt not found");
    const metaPath = join(runDir, "run-1.meta.json");
    expect(existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    expect(meta.loop).toBeUndefined();
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
    expect(metrics.poisonPulls).toBe(1);
    expect(metrics.selectionStability).toBeCloseTo(1 / 3);
    expect(metrics.stability).toBeCloseTo(1 / 3);
  });

  it("computes loop metric math from valid receipts", () => {
    const metrics = loopMetrics([
      {
        loop: {
          pulledIds: ["a"],
          inspectedMaterials: ["tokens.css"],
          rendered: true,
          repairPasses: 2,
          reviewRan: true,
        },
      },
      {
        loop: {
          pulledIds: ["b"],
          inspectedMaterials: [],
          rendered: false,
          repairPasses: 1,
          reviewRan: false,
        },
      },
      {},
    ]);
    expect(metrics).toEqual({
      receipts: 2,
      runs: 3,
      meanRepairPasses: 1.5,
      renderedCount: 1,
      reviewRanCount: 1,
    });
  });

  it("does not average repair passes when there are no valid loop receipts", () => {
    const metrics = loopMetrics([{}, { loop: { repairPasses: 2 } }]);
    expect(metrics).toEqual({
      receipts: 0,
      runs: 2,
      meanRepairPasses: null,
      renderedCount: 0,
      reviewRanCount: 0,
    });
  });

  it("warns when scoring a gather cell that mixes loop protocols", () => {
    const config = writeProject();
    const runDir = join(config.out, "gather", "ask-1");
    mkdirSync(runDir, { recursive: true });
    for (const run of [1, 2]) {
      writeFileSync(join(runDir, `run-${run}.html`), "<html></html>");
    }
    writeFileSync(
      join(runDir, "run-1.meta.json"),
      JSON.stringify({
        loop: {
          pulledIds: ["principle.test"],
          inspectedMaterials: [],
          rendered: true,
          repairPasses: 1,
          reviewRan: false,
        },
      }),
    );
    writeFileSync(join(runDir, "run-2.meta.json"), JSON.stringify({}));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      scoreAll(config);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("mixes protocols");
      expect(warn.mock.calls[0]?.[0]).toContain(
        "should not be compared as one",
      );

      warn.mockClear();
      writeFileSync(
        join(runDir, "run-2.meta.json"),
        JSON.stringify({
          loop: {
            pulledIds: ["principle.test"],
            inspectedMaterials: [],
            rendered: true,
            repairPasses: 0,
            reviewRan: false,
          },
        }),
      );
      scoreAll(config);
      expect(warn).not.toHaveBeenCalled();

      warn.mockClear();
      writeFileSync(join(runDir, "run-1.meta.json"), JSON.stringify({}));
      writeFileSync(join(runDir, "run-2.meta.json"), JSON.stringify({}));
      scoreAll(config);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
