import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  gatherGhostPackage,
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
} from "../src/embed/index.js";
import {
  lintGhostPackage,
  loadGhostPackage,
  resolveGhostPackage,
} from "../src/package.js";
import { buildReviewPacket } from "../src/review/review-packet.js";
import { runCli } from "./cli-test-utils.js";

let root: string;
let brand: string;
let baseline: string;
let elsewhere: string;
const core = "baseline.core";
const medium = "baseline.email";
const email = "interface.email";
async function file(dir: string, name: string, body: string) {
  await writeFile(join(dir, name), body);
}
async function node(
  dir: string,
  id: string,
  metadata: string,
  body = `Guidance for ${id}.`,
) {
  await file(
    dir,
    `${id}.md`,
    `---\nfor: Making an email.\n${metadata}\n---\n${body}\n`,
  );
}
async function check(dir: string, id: string, reference: string) {
  await file(
    dir,
    `checks/${id}.md`,
    `---\nname: ${id}\ndescription: Check email.\nseverity: medium\nreferences: [${reference}]\n---\nCheck the owned material.\n`,
  );
}
const paths = () => resolveGhostPackage(brand, elsewhere, baseline);
const snapshot = () => loadGhostSnapshot(paths());
const pull = async (ids: string[] = []) =>
  pullGhostNodes(await snapshot(), { ids, repoRoot: root });
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ghost-external-"));
  brand = join(root, "brand");
  baseline = join(root, "baseline");
  elsewhere = join(root, "elsewhere");
  await mkdir(elsewhere);
  // Different repositories with identically named materials prove ownership.
  for (const dir of [brand, baseline]) {
    await mkdir(join(dir, "materials"), { recursive: true });
    await mkdir(join(dir, "checks"));
    execFileSync("git", ["init", "--quiet", dir]);
  }
  await file(
    brand,
    "manifest.yml",
    "schema: ghost.package/v1\nid: brand\ncover: framing\n",
  );
  await file(
    baseline,
    "manifest.yml",
    `schema: ghost.package/v1\nid: baseline\ncore: [${core}]\n`,
  );
  await file(
    brand,
    "glossary.md",
    "---\nkinds: [{name: interface}]\n---\n## interface\nBrand interfaces.\n",
  );
  await file(
    baseline,
    "glossary.md",
    "---\nkinds: [{name: baseline}]\n---\n## baseline\nUniversal defaults.\n",
  );
  await file(brand, "materials/tokens.css", ":root { --brand: 1; }");
  await file(baseline, "materials/tokens.css", ":root { --baseline: 1; }");
  await file(
    baseline,
    "materials/pixel.png",
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("binary"),
  );
  await node(
    brand,
    "framing",
    "scope: brand\nlayer: framing",
    "Be clear.\n## If no guidance applies\nAsk first.",
  );
  await node(
    brand,
    email,
    `scope: brand\nlayer: interface\nrequires: [${medium}]\nmaterials: [materials/tokens.css]`,
  );
  await node(baseline, core, "scope: baseline\nlayer: fundamentals");
  await node(
    baseline,
    medium,
    "scope: baseline\nlayer: interface\nmaterials: [materials/tokens.css, materials/pixel.png]",
  );
  await check(baseline, "base-email", medium);
  await check(brand, "brand-email", email);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("explicit external baseline", () => {
  it("combines core and menu in memory without rewriting either manifest", async () => {
    const original = await readFile(join(brand, "manifest.yml"), "utf8");
    const loaded = await snapshot();
    expect(paths().baseline?.packageDir).toBe(baseline);
    expect(loaded.package.manifest).not.toHaveProperty("core");
    expect(loaded.package.manifestRaw).toBe(original);
    expect(loaded.baseline).toMatchObject({
      dir: baseline,
      manifest: { core: [core] },
    });
    const menu = gatherGhostPackage(loaded);
    expect(menu.automatic?.map((entry) => entry.id)).toEqual([core]);
    expect(menu.nodes.map((entry) => entry.id)).toEqual([medium, email]);
    expect(menu.kinds?.map((kind) => kind.name)).toEqual([
      "baseline",
      "interface",
    ]);
    expect((await pull()).ids).toEqual([core]);
    const result = await pull([email]);
    expect(result.ids).toEqual([core, medium, email]);
    expect(result.nodes.find((entry) => entry.id === medium)).toMatchObject({
      packageDir: baseline,
    });
    expect(result.nodes.find((entry) => entry.id === email)).toMatchObject({
      packageDir: brand,
    });
    expect(await readFile(join(brand, "manifest.yml"), "utf8")).toBe(original);
    await file(brand, "manifest.yml", `${original}core: [${core}]\n`);
    expect((await pull()).ids).toEqual([core]);
  });

  it("pulls and inspects materials in the owning repository, not the caller cwd", async () => {
    const result = await pull([email]);
    expect(
      result.nodes.find((entry) => entry.id === medium)?.materials?.[0].inlined,
    ).toContain("--baseline");
    expect(
      result.nodes.find((entry) => entry.id === email)?.materials?.[0].inlined,
    ).toContain("--brand");
    expect(result.materialCounts.inlined).toBe(2);
    await file(
      baseline,
      "reference.css",
      ":root { --referenced-baseline: 1; }",
    );
    await node(
      baseline,
      medium,
      "scope: baseline\nlayer: interface\nmaterials: [materials/tokens.css, materials/pixel.png, reference.css]",
    );
    const references = await pull([email]);
    expect(
      references.nodes.find((entry) => entry.id === medium)?.materials?.[2]
        .inlined,
    ).toContain("--referenced-baseline");
    const inspected = await inspectGhostMaterial(await snapshot(), {
      nodeId: medium,
      locator: "materials/tokens.css",
      repoRoot: elsewhere,
    });
    expect(inspected).toMatchObject({
      ok: true,
      text: ":root { --baseline: 1; }",
    });
    const report = await lintGhostPackage(brand, elsewhere, baseline);
    expect(report).toMatchObject({ errors: 0, warnings: 0 });
    await file(baseline, "materials/orphan.css", "orphan");
    expect(
      (await lintGhostPackage(brand, elsewhere, baseline)).issues,
    ).toContainEqual(
      expect.objectContaining({
        rule: "material-orphaned",
        path: join(baseline, "materials/orphan.css"),
      }),
    );
  });

  it("matches review materials and checks against their owner, not a same-named brand file", async () => {
    const diff =
      "diff --git a/materials/tokens.css b/materials/tokens.css\n--- a/materials/tokens.css\n+++ b/materials/tokens.css\n@@ -1 +1 @@\n-old\n+new\n";
    const loaded = await loadGhostPackage(paths());
    const packet = await buildReviewPacket(loaded, diff, {
      cwd: baseline,
      packageDir: brand,
    });
    expect(packet.materialNodes.map((entry) => entry.id)).toEqual([medium]);
    expect(packet.checks).toEqual([
      expect.objectContaining({ id: "base-email", packageDir: baseline }),
    ]);
    expect((await snapshot()).checks.get("base-email")?.packageDir).toBe(
      baseline,
    );
  });

  it.each(["baseline", "unused"])(
    "rejects overlapping declared kind %s before gathering either format",
    async (kind) => {
      await file(
        brand,
        "glossary.md",
        `---\nkinds: [{name: interface}, {name: ${kind}}]\n---\n## ${kind}\nBrand purpose.\n`,
      );
      if (kind !== "baseline")
        await file(
          baseline,
          "glossary.md",
          `---\nkinds: [{name: baseline}, {name: ${kind}}]\n---\n## ${kind}\nBaseline purpose.\n`,
        );
      const message = `Duplicate glossary kind "${kind}" in package ${brand} and baseline ${baseline}; overlapping declared kinds are not allowed`;
      await expect(loadGhostPackage(paths())).rejects.toThrow(message);
      await expect(snapshot()).rejects.toThrow(message);
      expect(
        (await lintGhostPackage(brand, elsewhere, baseline)).issues,
      ).toContainEqual(expect.objectContaining({ message }));
      for (const format of ["markdown", "json"]) {
        const result = await runCli(
          [
            "gather",
            "email",
            "--package",
            brand,
            "--baseline",
            baseline,
            "--format",
            format,
          ],
          elsewhere,
        );
        expect(result.code).not.toBe(0);
        expect(result.stderr).toContain(message);
      }
    },
  );

  it("prefixes only external baseline check diagnostics with their owning package", async () => {
    for (const [owner, id, reference] of [
      [brand, "brand", email],
      [baseline, "baseline", medium],
    ]) {
      await check(
        owner,
        `${id}-problems`,
        `"not a valid id", missing, "${reference} > Missing"`,
      );
      await file(
        owner,
        `checks/${id}-legacy.md`,
        `---\nname: legacy\ndescription: Legacy check.\nseverity: medium\nsource: ${reference}\n---\nCheck the guidance.\n`,
      );
    }
    const report = await lintGhostPackage(brand, elsewhere, baseline);
    expect(
      report.issues
        .filter((issue) => issue.rule.startsWith("check-"))
        .map(({ rule, path }) => ({ rule, path })),
    ).toEqual(
      ["brand", "baseline"].flatMap((id) => {
        const prefix = id === "baseline" ? `${baseline}/` : "";
        return [
          {
            rule: "check-source-deprecated",
            path: `${prefix}checks/${id}-legacy.md.source`,
          },
          ...["malformed", "unresolved", "heading-missing"].map((finding) => ({
            rule: `check-reference-${finding}`,
            path: `${prefix}checks/${id}-problems.md.references`,
          })),
        ];
      }),
    );
  });

  it.each(["node", "check", "invalid node", "invalid check"])(
    "rejects %s collisions without precedence",
    async (kind) => {
      if (kind.includes("check")) {
        await check(brand, "base-email", medium);
        if (kind.startsWith("invalid"))
          await file(brand, "checks/base-email.md", "invalid");
      } else {
        await node(
          brand,
          core,
          kind.startsWith("invalid")
            ? "scope: bad"
            : "scope: baseline\nlayer: fundamentals",
        );
      }
      await expect(snapshot()).rejects.toThrow("Duplicate");
      expect(
        (await lintGhostPackage(brand, elsewhere, baseline)).errors,
      ).toBeGreaterThan(0);
    },
  );

  it.each([
    [
      "reverse dependency",
      `scope: baseline\nlayer: interface\nrequires: [${email}]`,
      "missing or invalid",
    ],
    [
      "cycle",
      `scope: baseline\nlayer: interface\nrequires: [${medium}]`,
      "cycle",
    ],
    ["brand scope", "scope: brand\nlayer: identity", "baseline scope"],
  ])("rejects baseline %s", async (_, metadata, message) => {
    await node(baseline, medium, metadata);
    await expect(snapshot()).rejects.toThrow(message);
    expect(
      (await lintGhostPackage(brand, elsewhere, baseline)).errors,
    ).toBeGreaterThan(0);
  });

  it("fails missing baseline paths and absent baseline dependencies, without discovery", async () => {
    await expect(
      loadGhostSnapshot(
        resolveGhostPackage(brand, elsewhere, join(root, "missing")),
      ),
    ).rejects.toThrow("No ghost package");
    expect(
      (await lintGhostPackage(brand, elsewhere, join(root, "missing"))).errors,
    ).toBeGreaterThan(0);
    const alone = await loadGhostSnapshot(
      resolveGhostPackage(brand, elsewhere),
    );
    await expect(
      pullGhostNodes(alone, { ids: [email], repoRoot: root }),
    ).rejects.toThrow("missing or invalid");
    expect((await lintGhostPackage(brand, elsewhere)).errors).toBeGreaterThan(
      0,
    );
  });

  it.each(["cover", "core", "glossary"])(
    "validates baseline %s separately",
    async (part) => {
      if (part === "cover")
        await file(
          baseline,
          "manifest.yml",
          `schema: ghost.package/v1\nid: baseline\ncover: ${core}\ncore: [${core}]\n`,
        );
      if (part === "core")
        await file(
          baseline,
          "manifest.yml",
          "schema: ghost.package/v1\nid: baseline\n",
        );
      if (part === "glossary")
        await file(baseline, "glossary.md", "---\nkinds: []\n---\n");
      await expect(snapshot()).rejects.toThrow();
      expect(
        (await lintGhostPackage(brand, elsewhere, baseline)).errors,
      ).toBeGreaterThan(0);
    },
  );

  it("keeps baseline checks independent of brand references", async () => {
    await check(baseline, "brand-dependent", email);
    await expect(snapshot()).rejects.toThrow("cannot reference brand node");
    expect(
      (await lintGhostPackage(brand, elsewhere, baseline)).errors,
    ).toBeGreaterThan(0);
  });

  it("validates each glossary against only its owning nodes", async () => {
    await file(brand, "glossary.md", "---\nkinds: [{name: other}]\n---\n");
    const report = await lintGhostPackage(brand, elsewhere, baseline);
    expect(
      report.issues
        .filter((issue) => issue.rule === "kind-undeclared")
        .map((issue) => issue.path),
    ).toEqual([`${email}.md`]);
    await file(baseline, "glossary.md", "---\nkinds: bad\n---\n");
    expect(
      (await lintGhostPackage(brand, elsewhere, baseline)).errors,
    ).toBeGreaterThan(0);
  });

  it("resolves relative package and baseline inputs against the supplied cwd", async () => {
    const resolved = resolveGhostPackage("brand", root, "baseline");
    expect(resolved.packageDir).toBe(brand);
    expect(resolved.baseline?.packageDir).toBe(baseline);
    expect((await loadGhostSnapshot(resolved)).baseline?.dir).toBe(baseline);
    await node(
      brand,
      email,
      "scope: brand\nlayer: interface\nrequires: [missing]",
    );
    await expect(pull([email])).rejects.toThrow("missing or invalid");
    expect(
      (await lintGhostPackage(brand, elsewhere, baseline)).errors,
    ).toBeGreaterThan(0);
  });

  it("retains standalone unclassified and self-contained layered loading", async () => {
    const isolated = await loadGhostSnapshot(
      resolveGhostPackage(baseline, elsewhere),
    );
    expect(
      (await pullGhostNodes(isolated, { repoRoot: baseline })).ids,
    ).toEqual([core]);
    await node(brand, email, "");
    const alone = await loadGhostSnapshot(
      resolveGhostPackage(brand, elsewhere),
    );
    expect(alone.baseline).toBeUndefined();
    expect(gatherGhostPackage(alone).automatic).toBeUndefined();
    expect(
      (await pullGhostNodes(alone, { ids: [email], repoRoot: brand })).ids,
    ).toEqual([email]);
  });

  it("threads --baseline through gather, pull, validate, and review from another cwd", async () => {
    const flags = [
      "--package",
      brand,
      "--baseline",
      baseline,
      "--format",
      "json",
    ];
    const menu = await runCli(["gather", "email", ...flags], elsewhere);
    expect(menu.code).toBe(0);
    expect(JSON.parse(menu.stdout).automatic[0].id).toBe(core);
    expect(JSON.parse(menu.stdout).next.command).toContain("--baseline");
    const pulled = await runCli(
      ["pull", email, "--no-events", ...flags],
      elsewhere,
    );
    expect(pulled.code).toBe(0);
    expect(JSON.parse(pulled.stdout).ids).toEqual([core, medium, email]);
    expect(JSON.parse(pulled.stdout).nodes[1].packageDir).toBe(baseline);
    expect(JSON.parse(pulled.stdout).context).toContain("--baseline");
    expect(JSON.parse(pulled.stdout).nodes[1].materials[1].inspect).toBe(
      join(baseline, "materials/pixel.png"),
    );
    const valid = await runCli(["validate", ...flags], elsewhere);
    expect(valid.code).toBe(0);
    expect(JSON.parse(valid.stdout)).toMatchObject({ errors: 0, warnings: 0 });
    const review = await runCli(
      ["review", "--node", medium, "--diff=-", ...flags],
      elsewhere,
      { stdin: "" },
    );
    expect(review.code).toBe(0);
    expect(JSON.parse(review.stdout).checks[0].packageDir).toBe(baseline);
  });
});
