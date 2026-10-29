import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  gatherGhostPackage,
  loadGhostSnapshot,
  pullGhostNodes,
} from "../src/embed/index.js";
import {
  GhostNodeFrontmatterSchema,
  GhostPackageManifestSchema,
  parseNode,
  serializeNode,
} from "../src/ghost-core/index.js";
import { lintGhostPackage, resolveGhostPackage } from "../src/package.js";
import { runCli as runBaseCli } from "./cli-test-utils.js";

let dir: string;
let pkg: string;
let basePkg: string;
const runCli = (args: string[], cwd: string) =>
  runBaseCli([...args, "--baseline", basePkg], cwd);
const core = "baseline.fundamentals.core";
const baseline = "baseline.interface.email";
const identity = "identity.type";
const email = "interface.email";

async function node(
  id: string,
  metadata: string,
  body = `Guidance for ${id}.`,
) {
  await writeFile(
    join(id.startsWith("baseline.") ? basePkg : pkg, `${id}.md`),
    `---\nfor: Making an email.\n${metadata}\n---\n\n${body}\n`,
  );
}
async function manifest(extra = `core: [${core}]`) {
  const baseFields = /^(core|version):/.test(extra)
    ? extra
    : 'version: "1.0.0"';
  await writeFile(
    join(basePkg, "manifest.yml"),
    `schema: ghost.package/v1\nid: test-baseline\n${baseFields}\n`,
  );
  const brandFields = /^(core|version):/.test(extra)
    ? 'baseline: "1.0.0"'
    : extra;
  await writeFile(
    join(pkg, "manifest.yml"),
    `schema: ghost.package/v1\nid: layered\n${brandFields}\n`,
  );
}
const snapshot = () =>
  loadGhostSnapshot(resolveGhostPackage(pkg, dir, basePkg));
const pull = async (
  ids: string[] = [],
  order: "steering" | "given" = "steering",
) => pullGhostNodes(await snapshot(), { ids, repoRoot: dir, order });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ghost-layered-"));
  pkg = join(dir, ".ghost");
  basePkg = join(dir, "baseline");
  await mkdir(basePkg);
  await mkdir(join(pkg, "materials"), { recursive: true });
  await manifest();
  await writeFile(
    join(pkg, "materials", "tokens.css"),
    ":root { color: black; }\n",
  );
  await node(
    "framing",
    "",
    "Make the next step clear.\n\n## If no guidance applies\n\nAsk before brand-defining choices.",
  );
  await node(
    core,
    "",
    "Use a visible hierarchy. Keep text legible. Preserve keyboard access.",
  );
  await node(baseline, "", "Keep email content readable without images.");
  await node(
    identity,
    `requires: [${core}]\nmaterials: [materials/tokens.css]`,
  );
  await node(
    email,
    `requires: [${baseline}, ${identity}]\nmaterials: [materials/tokens.css]`,
  );
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("layered fingerprints", () => {
  it("fails validate and pull for malformed manifest core values", async () => {
    for (const value of ["[]", "not-an-array", "[42]", "[../outside]"]) {
      await manifest(`core: ${value}`);
      expect(
        (await lintGhostPackage(pkg, dir, basePkg)).errors,
      ).toBeGreaterThan(0);
      await expect(pull()).rejects.toThrow();
    }
  });

  it("deduplicates repeated core entries and cover prerequisites", async () => {
    await manifest(`core: [${core}, ${core}]`);
    await node(email, `requires: [${baseline}, ${identity}, framing]`);
    const result = await pull([email, core, "framing"]);
    expect(result.ids).toEqual([core, baseline, identity, email]);
    expect(result.nodes.map((entry) => entry.id)).not.toContain("framing");
    expect(gatherGhostPackage(await snapshot()).automatic).toHaveLength(1);
  });

  it("validates the complete flat public example and delivers all five classifications", async () => {
    const example = new URL("./fixtures/layered-fingerprint", import.meta.url)
      .pathname;
    const report = await lintGhostPackage(
      example,
      dir,
      new URL("./fixtures/layered-baseline", import.meta.url).pathname,
    );
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    const loaded = await loadGhostSnapshot(
      resolveGhostPackage(
        example,
        dir,
        new URL("./fixtures/layered-baseline", import.meta.url).pathname,
      ),
    );
    expect(loaded.catalog.nodes.size).toBe(18);
    const result = await pullGhostNodes(loaded, {
      ids: ["interface.email.receipt"],
      repoRoot: dir,
    });
    const nodes = [
      ...(result.cover.state === "resolved" ? [result.cover.node] : []),
      ...result.nodes,
    ];
    expect(
      new Set(nodes.map((entry) => `${entry.scope}/${entry.layer}`)),
    ).toEqual(
      new Set([
        "baseline/fundamentals",
        "baseline/interface",
        "brand/framing",
        "brand/identity",
        "brand/interface",
      ]),
    );
    expect(result.ids).toContain("baseline.fundamentals.typesetting");
    expect(result.ids).toContain("baseline.fundamentals.accessibility");
  });

  it("classified packages without core omit automatic but still expand dependencies", async () => {
    await manifest('baseline: "1.0.0"');
    expect(gatherGhostPackage(await snapshot()).automatic).toEqual([]);
    expect((await pull()).ids).toEqual([]);
    expect((await pull([email])).ids).toEqual([
      core,
      baseline,
      identity,
      email,
    ]);
    expect((await pull([email])).authority).toBeDefined();
  });

  it("retains the cover alias and all-miss behavior without duplicate delivery", async () => {
    const result = await pull(["framing", core, "framing"]);
    expect(result.requested).toEqual([core]);
    expect(result.ids).toEqual([core]);
    expect(result.nodes).toHaveLength(1);
    const miss = await pull(["missing"]);
    expect(miss.ids).toEqual([]);
    expect(miss.cover.state).toBe("not-emitted");
  });

  it("ignores legacy prerequisites without an authority field", async () => {
    await rm(pkg, { recursive: true });
    await mkdir(pkg);
    await manifest("");
    await node("first", "requires: [second]");
    await node("second", "");
    const result = await pull(["first"]);
    expect(result.ids).toEqual(["first"]);
    expect(result).not.toHaveProperty("authority");
  });

  it("rejects invalid classification even when no valid classified node loads", async () => {
    await rm(pkg, { recursive: true });
    await mkdir(pkg);
    await manifest('baseline: "1.0.0"');
    await node("framing", "");
    await node("broken", "scope: unknown\nlayer: interface");
    await expect(pull(["broken"])).rejects.toThrow("invalid");
  });

  it("fails bare pull on core cycles and invalid core node metadata", async () => {
    await node(core, `requires: [${core}]`);
    await expect(pull()).rejects.toThrow("requires cycle");
    await node(core, "scope: baseline");
    await expect(pull()).rejects.toThrow("baseline/fundamentals");
  });

  it("gathers explicit selections separately from automatic fundamentals", async () => {
    const menu = gatherGhostPackage(await snapshot());
    expect(menu.automatic).toEqual([
      expect.objectContaining({
        id: core,
        scope: "baseline",
        layer: "fundamentals",
      }),
    ]);
    expect(menu.nodes.map((entry) => entry.id)).not.toContain(core);
    expect(menu.nodes.map((entry) => entry.id)).not.toContain("framing");
    expect(menu.nodes.find((entry) => entry.id === email)).toMatchObject({
      scope: "brand",
      layer: "interface",
      requires: [baseline, identity],
    });
    expect(menu.coverage.nodes).toBe(3);
    expect(menu.contract.ifNoneApply).toContain("automatic core fundamentals");
  });

  it("bare pull delivers actual fundamentals with or without a cover", async () => {
    const result = await pull();
    expect(result.requested).toEqual([]);
    expect(result.ids).toEqual([core]);
    expect(result.cover).toMatchObject({
      state: "resolved",
      node: { scope: "brand", layer: "framing" },
    });
    expect(result.nodes[0]).toMatchObject({
      scope: "baseline",
      layer: "fundamentals",
      body: expect.stringContaining("visible hierarchy"),
    });
    expect(result.authority).toContain("Delivery order is not authority");
    await rm(join(pkg, "framing.md"));
    await expect(pull()).rejects.toThrow("framing node");
  });

  it.each([
    "steering",
    "given",
  ] as const)("delivers transitive prerequisites once in %s order", async (order) => {
    const result = await pull([email, email, core, identity], order);
    expect(result.requested).toEqual([email, core, identity]);
    expect(result.ids).toEqual([core, baseline, identity, email]);
    expect(result.nodes.map((entry) => entry.id)).toEqual(result.ids);
    expect(result.nodes.find((entry) => entry.id === email)).toMatchObject({
      scope: "brand",
      layer: "interface",
      requires: [baseline, identity],
    });
    expect(result.materialCounts).toEqual({ inlined: 1, omitted: 1 });
    expect(
      result.nodes
        .flatMap((entry) => entry.materials ?? [])
        .filter((material) => material.inlined),
    ).toHaveLength(1);
    expect((await lintGhostPackage(pkg, dir, basePkg)).errors).toBe(0);
  });

  it("rejects baseline prerequisites that borrow brand guidance", async () => {
    await node(baseline, `requires: [${identity}]`);
    await expect(pull([email])).rejects.toThrow("missing or invalid");
  });

  it("accepts transitive baseline interface pairing through a variant", async () => {
    await node("interface.email.receipt", `requires: [${email}]`);
    expect((await pull(["interface.email.receipt"])).ids).toEqual([
      core,
      baseline,
      identity,
      email,
      "interface.email.receipt",
    ]);
  });

  it.each([
    ["missing", `requires: [missing]`, "missing or invalid"],
    ["cycle", `requires: [${email}]`, "requires cycle"],
  ])("rejects %s required context in validate and pull", async (_, requires, message) => {
    await node(email, `${requires}`);
    const report = await lintGhostPackage(pkg, dir, basePkg);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.message.includes(message))).toBe(
      true,
    );
    await expect(pull([email])).rejects.toThrow(message);
    expect((await pull()).ids).toEqual([core]);
  });

  it("accepts interfaces without inventing a baseline for their medium", async () => {
    await node(
      "interface.social",
      `requires: [${identity}]`,
      "Lead social posts with the subject and a short caption.",
    );
    const result = await pull(["interface.social"]);
    expect(result.ids).toEqual([core, identity, "interface.social"]);
    expect(result.ids).not.toContain(baseline);
    expect((await lintGhostPackage(pkg, dir, basePkg)).errors).toBe(0);

    // Classification does not imply a dependency, even without a core or baseline.
    await manifest('baseline: "1.0.0"');
    await node("interface.physical", "");
    expect((await pull(["interface.physical"])).ids).toEqual([
      "interface.physical",
    ]);
    expect((await lintGhostPackage(pkg, dir, basePkg)).errors).toBe(0);
  });

  it("rejects invalid required targets, but does not block on unrelated invalid guidance", async () => {
    await node(identity, "scope: brand");
    await expect(pull([email])).rejects.toThrow("missing or invalid");
    await expect(pull([identity])).rejects.toThrow("invalid");
    expect((await pull()).ids).toEqual([core]);
  });

  it.each([
    "missing",
    identity,
    "framing",
    baseline,
  ])("rejects invalid core target %s on bare pull", async (target) => {
    await manifest(`core: [${target}]`);
    expect((await lintGhostPackage(pkg, dir, basePkg)).errors).toBeGreaterThan(
      0,
    );
    await expect(pull()).rejects.toThrow("baseline/fundamentals");
  });

  it("checks core prerequisites even on bare pull", async () => {
    await node(core, "requires: [missing]");
    await expect(pull()).rejects.toThrow("missing or invalid");
  });

  it("validates metadata shape, legal combinations and local ids", () => {
    for (const metadata of [
      { scope: "brand" },
      { layer: "identity" },
      { scope: "brand", layer: "fundamentals" },
      { scope: "baseline", layer: "identity" },
      { scope: "baseline", layer: "framing" },
      { scope: "other", layer: "interface" },
      { requires: ["../outside"] },
      { requires: "identity.type" },
    ])
      expect(GhostNodeFrontmatterSchema.safeParse(metadata).success).toBe(
        false,
      );
    for (const value of [[], "identity.type", [42], ["../outside"]]) {
      expect(
        GhostPackageManifestSchema.safeParse({
          schema: "ghost.package/v1",
          id: "test",
          core: value,
        }).success,
      ).toBe(false);
    }
    const parsed = parseNode(`---\nrequires: [${core}]\n---\nBody.`);
    expect(parsed.node).not.toBeNull();
    if (parsed.node)
      expect(parseNode(serializeNode(parsed.node)).node).toEqual(parsed.node);
  });

  it("preserves unclassified packages without adding automatic or authority fields", async () => {
    await rm(pkg, { recursive: true });
    await mkdir(pkg);
    await manifest("");
    await node("framing", "");
    await node("voice", "");
    const menu = gatherGhostPackage(await snapshot());
    expect(menu).not.toHaveProperty("automatic");
    expect(menu.nodes[0]).not.toHaveProperty("scope");
    const result = await pull(["voice"]);
    expect(result.ids).toEqual(["voice"]);
    expect(result).not.toHaveProperty("authority");
    expect(result.nodes[0]).not.toHaveProperty("layer");
    expect((await pull()).ids).toEqual([]);
  });

  it("CLI exposes structure in JSON and Markdown and records delivered ids", async () => {
    const gather = await runCli(["gather", "email", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    expect(JSON.parse(gather.stdout).automatic[0].id).toBe(core);
    const markdown = await runCli(["gather", "email"], dir);
    expect(markdown.stdout).toContain("Automatic core");
    expect(markdown.stdout).toContain("Scope: brand; layer: interface");
    const result = await runCli(["pull", email, "--format", "json"], dir);
    expect(result.code).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.requested).toEqual([email]);
    expect(output.ids).toEqual([core, baseline, identity, email]);
    expect(output.nodes[0]).toMatchObject({
      scope: "baseline",
      layer: "fundamentals",
    });
    expect(output.cover.node).toMatchObject({
      scope: "brand",
      layer: "framing",
    });
    const prose = await runCli(["pull", email], dir);
    expect(prose.stdout).toContain("Scope: baseline; layer: fundamentals");
    expect(prose.stdout.split("# Authority")).toHaveLength(2);
    const bare = await runCli(["pull", "--format", "json"], dir);
    expect(JSON.parse(bare.stdout).ids).toEqual([core]);
    const events = (await readFile(join(pkg, ".events"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events[0].menu).not.toContain(core);
    expect(events[2]).toMatchObject({
      event: "pull",
      requested: [email],
      ids: output.ids,
      cover: "framing",
    });
    expect(events.at(-1)).toMatchObject({
      event: "pull",
      ids: [core],
      cover: "framing",
    });
    await node(email, "requires: [missing]");
    expect((await runCli(["pull", email], dir)).code).toBe(2);
    expect(
      (await readFile(join(pkg, ".events"), "utf8")).trim().split("\n"),
    ).toHaveLength(events.length);
  });
});

describe("cascaded package contract", () => {
  it("accepts only compatible manifest roles and string versions", () => {
    const anchor = { schema: "ghost.package/v1", id: "example" };
    for (const fields of [
      {},
      { baseline: "1.0.0" },
      { version: "1.0.0" },
      { core: [core] },
      { core: [core], version: "1.0.0" },
    ]) {
      expect(
        GhostPackageManifestSchema.safeParse({ ...anchor, ...fields }).success,
      ).toBe(true);
    }
    for (const fields of [
      { baseline: "1.0.0", version: "1.0.0" },
      { baseline: "1.0.0", core: [core] },
      { baseline: 1 },
      { version: 1 },
      { baseline: "1.0.0", cover: "framing" },
    ]) {
      expect(
        GhostPackageManifestSchema.safeParse({ ...anchor, ...fields }).success,
      ).toBe(false);
    }
  });

  it("rejects non-delivery headers with actionable classification errors", () => {
    for (const key of ["scope", "layer", "audience", "kind"]) {
      const result = parseNode(`---\n${key}: brand\n---\nGuidance.`);
      expect(result.report.errors).toBeGreaterThan(0);
      if (key === "scope" || key === "layer")
        expect(result.report.issues[0]?.message).toContain(
          "derived from the filename",
        );
    }
  });

  it("derives classification and kind after the baseline prefix", async () => {
    await manifest('baseline: "1.0.0"');
    await node("pattern.layout", "");
    const loaded = await snapshot();
    for (const [id, scope, layer] of [
      [core, "baseline", "fundamentals"],
      [baseline, "baseline", "interface"],
      [identity, "brand", "identity"],
      [email, "brand", "interface"],
      ["framing", "brand", "framing"],
      ["pattern.layout", "brand", "pattern"],
    ] as const) {
      expect(loaded.catalog.nodes.get(id)).toMatchObject({
        scope,
        layer,
        kind: layer,
      });
    }
  });

  it("keeps legacy steering order and ignores dependency errors", async () => {
    await rm(pkg, { recursive: true });
    await mkdir(pkg);
    await manifest("");
    await node("first", "requires: [missing, second]");
    await node(
      "second",
      "requires: [first]",
      "## Skeleton\n```html\n<p>Literal</p>\n```",
    );
    expect((await pull(["first", "second"])).ids).toEqual(["first", "second"]);
    expect(
      (await pull(["first", "second"])).nodes.map((entry) => entry.id),
    ).toEqual(["second", "first"]);
    expect(
      (await pull(["first", "second"], "given")).nodes.map((entry) => entry.id),
    ).toEqual(["first", "second"]);
    const report = await lintGhostPackage(pkg, dir, basePkg);
    expect(report.errors).toBe(0);
    expect(
      report.issues.filter((issue) => issue.rule === "legacy-requires-ignored"),
    ).toHaveLength(2);
  });

  it("requires framing only for layered brands and confines the fallback heading", async () => {
    await manifest('baseline: "1.0.0"');
    await rm(join(pkg, "framing.md"));
    await expect(pull()).rejects.toThrow("framing node");
    expect((await lintGhostPackage(pkg, dir, basePkg)).issues).toContainEqual(
      expect.objectContaining({ rule: "framing-missing", severity: "error" }),
    );
    await writeFile(
      join(pkg, "manifest.yml"),
      'schema: ghost.package/v1\nid: baseline-alone\nversion: "1.0.0"\n',
    );
    await rm(pkg, { recursive: true });
    await mkdir(pkg);
    await writeFile(
      join(pkg, "manifest.yml"),
      'schema: ghost.package/v1\nid: baseline-alone\nversion: "1.0.0"\n',
    );
    expect(
      (await lintGhostPackage(pkg, dir, basePkg)).issues.some(
        (issue) => issue.rule === "framing-missing",
      ),
    ).toBe(false);
    expect((await pull()).authority).toBeDefined();
    await manifest('baseline: "1.0.0"');
    await node("framing", "");
    await node(identity, "", "## If no guidance applies\nAsk first.");
    expect((await lintGhostPackage(pkg, dir, basePkg)).issues).toContainEqual(
      expect.objectContaining({
        rule: "framing-policy-only",
        path: `${identity}.md`,
        severity: "error",
      }),
    );
  });
});
