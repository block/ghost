import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  gatherGhostPackage,
  loadGhostSnapshot,
  pullGhostNodes,
} from "../src/embed/index.js";
import { lintGhostPackage, resolveGhostPackage } from "../src/package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/review/review-packet.js";
import { compareVersions } from "../src/scan/baseline-version.js";
import { hashGhostPackage } from "../src/scan/package-hash.js";
import { loadGhostPackage } from "../src/scan/package-loader.js";
import { runCli } from "./cli-test-utils.js";

let root: string;
let brand: string;
let baseline: string;
const core = "baseline.fundamentals.test";
const medium = "baseline.interface.email";
async function node(dir: string, id: string, body: string, metadata = "") {
  await writeFile(
    join(dir, `${id}.md`),
    `---\nfor: Making email.\n${metadata}\n---\n${body}\n`,
  );
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ghost-distribution-"));
  brand = join(root, "brand");
  baseline = join(root, "baseline");
  await mkdir(brand);
  await mkdir(baseline);
  await writeFile(
    join(brand, "manifest.yml"),
    'schema: ghost.package/v1\nid: test-brand\nbaseline: "1.0.0"\n',
  );
  await node(
    brand,
    "framing",
    "Be useful.\n## If no guidance applies\nUse ordinary reasoning.",
  );
  await node(
    brand,
    "interface.email",
    "Brand email delta.",
    `requires: [${medium}]`,
  );
  await writeFile(
    join(baseline, "manifest.yml"),
    `schema: ghost.package/v1\nid: test-baseline\nversion: "2.10.0"\ncore: [${core}]\n`,
  );
  await node(baseline, core, "External core.");
  await node(baseline, medium, "External email.");
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("loads a bundled baseline without an override and substitutes the override completely", async () => {
  const bundled = await loadGhostSnapshot(resolveGhostPackage(brand, root));
  expect(bundled.baseline?.id).toBe("design-baseline");
  expect(bundled.provenance.baseline?.version).toMatch(/^\d+\.\d+\.\d+/);
  const defaultPull = await pullGhostNodes(bundled, {
    ids: ["interface.email"],
    repoRoot: root,
  });
  expect(defaultPull.ids).toContain(medium);
  const overridden = await loadGhostSnapshot(
    resolveGhostPackage(brand, root, baseline),
  );
  const pull = await pullGhostNodes(overridden, {
    ids: ["interface.email"],
    repoRoot: root,
  });
  expect(pull.ids).toEqual([core, medium, "interface.email"]);
  expect(pull.nodes[0]?.body).toBe("External core.");
  expect(pull.provenance.baseline).toMatchObject({
    id: "test-baseline",
    version: "2.10.0",
  });
  expect(
    overridden.catalog.nodes.has("baseline.fundamentals.accessibility"),
  ).toBe(false);
});

it("warns about newer, unversioned, and invalid compatibility versions", async () => {
  expect((await lintGhostPackage(brand, root, baseline)).issues).toContainEqual(
    expect.objectContaining({ rule: "baseline-newer", severity: "warning" }),
  );
  await writeFile(
    join(baseline, "manifest.yml"),
    `schema: ghost.package/v1\nid: test-baseline\ncore: [${core}]\n`,
  );
  const unversioned = await loadGhostSnapshot(
    resolveGhostPackage(brand, root, baseline),
  );
  expect(unversioned.provenance.baseline?.version).toBeNull();
  expect((await lintGhostPackage(brand, root, baseline)).issues).toContainEqual(
    expect.objectContaining({
      rule: "baseline-unversioned",
      severity: "warning",
    }),
  );
  await writeFile(
    join(baseline, "manifest.yml"),
    'schema: ghost.package/v1\nid: test-baseline\nversion: "not-semver"\n',
  );
  expect((await lintGhostPackage(brand, root, baseline)).issues).toContainEqual(
    expect.objectContaining({
      rule: "baseline-version-invalid",
      severity: "warning",
    }),
  );
});

it("records matching identities in snapshots, packets, and events without event-driven hash drift", async () => {
  const paths = resolveGhostPackage(brand, root, baseline);
  const snapshot = await loadGhostSnapshot(paths);
  const menu = gatherGhostPackage(snapshot);
  const packet = await pullGhostNodes(snapshot, {
    ids: ["interface.email"],
    repoRoot: root,
  });
  const review = await buildReviewPacket(await loadGhostPackage(paths), "", {
    packageDir: brand,
    cwd: root,
  });
  expect(menu.provenance).toEqual(packet.provenance);
  expect(review.provenance).toEqual(menu.provenance);
  expect(formatReviewPacket(review)).toContain("<!-- ghost provenance ");
  const flags = [
    "--package",
    brand,
    "--baseline",
    baseline,
    "--format",
    "json",
  ];
  const gathered = await runCli(["gather", "email", ...flags], root);
  const pulled = await runCli(["pull", "interface.email", ...flags], root);
  expect(gathered.code).toBe(0);
  expect(pulled.code).toBe(0);
  expect(JSON.parse(gathered.stdout).provenance).toEqual(snapshot.provenance);
  const json = JSON.parse(pulled.stdout);
  expect(json.provenance).toEqual(snapshot.provenance);
  expect(json.framing.id).toBe("framing");
  expect(json).not.toHaveProperty("cover");
  const events = (await readFile(join(brand, ".events"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(events).toHaveLength(2);
  for (const event of events)
    expect(event.provenance).toEqual(snapshot.provenance);
  expect(events[1].framing).toBe("framing");
  expect(events[1]).not.toHaveProperty("cover");
  expect((await loadGhostSnapshot(paths)).provenance).toEqual(
    snapshot.provenance,
  );
  const prose = await runCli(
    [
      "pull",
      "interface.email",
      "--package",
      brand,
      "--baseline",
      baseline,
      "--no-events",
    ],
    root,
  );
  expect(prose.stdout.split("# Authority")).toHaveLength(2);
  expect(prose.stdout).toContain(
    "A more specific rule replaces or augments the rule it names, within the scope it states. Everything it doesn't name still applies.",
  );
  expect(prose.stdout).toContain(
    "A required rule cannot be replaced within its stated scope, wherever it lives.",
  );
  expect(prose.stdout).toContain("<!-- ghost provenance ");
});

it("hashes names and bytes deterministically while excluding machine-local dotfiles", async () => {
  const original = await hashGhostPackage(brand);
  const other = join(root, "other");
  await cp(brand, other, { recursive: true });
  expect(await hashGhostPackage(other)).toBe(original);
  await writeFile(join(other, ".events"), "local events");
  await mkdir(join(other, ".git"));
  await writeFile(join(other, ".git", "config"), "machine config");
  expect(await hashGhostPackage(other)).toBe(original);
  await mkdir(join(other, "materials"));
  await writeFile(
    join(other, "materials", "binary.bin"),
    Buffer.from([0, 255, 42]),
  );
  const materialHash = await hashGhostPackage(other);
  expect(materialHash).not.toBe(original);
  await rename(
    join(other, "materials", "binary.bin"),
    join(other, "materials", "renamed.bin"),
  );
  expect(await hashGhostPackage(other)).not.toBe(materialHash);
  await node(brand, "interface.email", "Changed bytes.");
  expect(await hashGhostPackage(brand)).not.toBe(original);
});

it("hashes symbolic link target text without following external data", async () => {
  const external = join(root, "external");
  await writeFile(external, "External bytes.");
  await symlink("../external", join(brand, "reference.txt"));
  const first = await hashGhostPackage(brand);
  await writeFile(external, "Changed external bytes.");
  expect(await hashGhostPackage(brand)).toBe(first);
});

describe("SemVer precedence", () => {
  it.each([
    ["2.10.0", "2.9.0", 1],
    ["1.0.0", "1.0.0-rc.1", 1],
    ["1.0.0-alpha.10", "1.0.0-alpha.2", 1],
    ["1.0.0-1", "1.0.0-alpha", -1],
    ["1.0.0-alpha", "1.0.0-alpha.1", -1],
    ["1.0.0+one", "1.0.0+two", 0],
    ["1.0.0", "1.0.0", 0],
    ["0.35.0", "1.0.0", -1],
    ["1.0.0", "1.0.0-rc.01", undefined],
    ["1.0.0", "01.0.0", undefined],
    ["1.0.0", "v1.0.0", undefined],
    ["1.0.0", "1.0.0\n", undefined],
  ] as const)("compares %s with %s", (a, b, result) => {
    expect(compareVersions(a, b)).toBe(result);
  });
});

it("omits bundled baseline paths from gather continuations and preserves explicit overrides", async () => {
  for (const format of ["json", "markdown"]) {
    const bundled = await runCli(
      ["gather", "email", "--package", brand, "--format", format],
      root,
    );
    expect(bundled.code).toBe(0);
    const next =
      format === "json"
        ? JSON.parse(bundled.stdout).next.command
        : bundled.stdout;
    expect(next).not.toContain("--baseline");
    expect(next).toContain(brand);
    const external = await runCli(
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
      root,
    );
    expect(external.code).toBe(0);
    expect(external.stdout).toContain("--baseline");
  }
});

it("supplies built-in legends once without a glossary and preserves stricter additions", async () => {
  const menu = gatherGhostPackage(
    await loadGhostSnapshot(resolveGhostPackage(brand, root, baseline)),
  );
  expect(menu.kinds?.map(({ name }) => name)).toEqual([
    "framing",
    "fundamentals",
    "identity",
    "interface",
  ]);
  expect(
    (await lintGhostPackage(brand, root, baseline)).issues.filter(
      ({ rule }) => rule === "kind-undeclared",
    ),
  ).toEqual([]);
  await node(brand, "pattern.receipt", "Receipt decisions.");
  expect((await lintGhostPackage(brand, root, baseline)).issues).toContainEqual(
    expect.objectContaining({
      rule: "kind-undeclared",
      path: "pattern.receipt.md",
    }),
  );
  const purpose = "Pull this brand interface only for exact email tasks.";
  for (const dir of [brand, baseline])
    await writeFile(
      join(dir, "glossary.md"),
      `---\nkinds: [{name: interface}]\n---\n# interface\n${purpose}\n`,
    );
  const json = await runCli(
    [
      "gather",
      "email",
      "--package",
      brand,
      "--baseline",
      baseline,
      "--format",
      "json",
    ],
    root,
  );
  const kinds = JSON.parse(json.stdout).kinds.filter(
    ({ name }: { name: string }) => name === "interface",
  );
  expect(kinds).toHaveLength(1);
  expect(kinds[0].purpose.split(purpose)).toHaveLength(2);
  const markdown = await runCli(
    ["gather", "email", "--package", brand, "--baseline", baseline],
    root,
  );
  expect(markdown.stdout.split(purpose)).toHaveLength(2);
  expect(
    markdown.stdout.split(
      "Select guidance for the artifact or interaction being made.",
    ),
  ).toHaveLength(2);
  expect(
    markdown.stdout.split(
      "Brand framing is included automatically on every pull.",
    ),
  ).toHaveLength(2);
});

it("warns only when a brand check references baseline-owned guidance", async () => {
  for (const dir of [brand, baseline]) await mkdir(join(dir, "checks"));
  const check = (reference: string) =>
    `---\nname: owned\ndescription: Inspect owned guidance.\nseverity: medium\nreferences: [${reference}]\n---\nInspect against the referenced owner.\n`;
  await writeFile(join(brand, "checks", "brand.md"), check(`${core} > Rules`));
  await writeFile(join(baseline, "checks", "baseline.md"), check(core));
  let report = await lintGhostPackage(brand, root, baseline);
  expect(report.errors).toBe(0);
  expect(
    report.issues.filter(
      ({ rule }) => rule === "check-reference-baseline-owned",
    ),
  ).toEqual([expect.objectContaining({ path: "checks/brand.md.references" })]);
  await writeFile(join(brand, "checks", "brand.md"), check("interface.email"));
  report = await lintGhostPackage(brand, root, baseline);
  expect(
    report.issues.filter(
      ({ rule }) => rule === "check-reference-baseline-owned",
    ),
  ).toEqual([]);
});

it("rejects external, chained, hidden and unresolved package symlinks while permitting internal targets", async () => {
  await writeFile(join(root, "external.txt"), "external");
  await symlink("../external.txt", join(brand, "outside.txt"));
  await symlink("outside.txt", join(brand, "chain.txt"));
  await symlink("../external.txt", join(brand, ".hidden-link"));
  await symlink("missing.txt", join(brand, "dangling.txt"));
  await symlink("interface.email.md", join(brand, "inside.txt"));
  await symlink(brand, join(root, "brand-link"));
  const report = await lintGhostPackage(
    join(root, "brand-link"),
    root,
    baseline,
  );
  expect(
    report.issues
      .filter(({ rule }) => rule === "package-symlink-outside")
      .map(({ path }) => path)
      .sort(),
  ).toEqual([".hidden-link", "chain.txt", "dangling.txt", "outside.txt"]);
  const result = await runCli(
    [
      "validate",
      "--package",
      brand,
      "--baseline",
      baseline,
      "--format",
      "json",
    ],
    root,
  );
  expect(result.code).not.toBe(0);
  expect(JSON.parse(result.stdout).errors).toBe(4);
});
