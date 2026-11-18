import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { runCli } from "./cli-test-utils.js";

let root: string;
const brandArgs = ["--package", "brand", "--universal", "shared"];

async function put(path: string, content: string) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

function node(requires: string[], body = "Guidance.", extra = "") {
  return `---\nfor: Building a page.\nrequires: ${JSON.stringify(requires)}\n${extra}---\n\n${body}\n`;
}

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "ghost-universal-")));
  await put(
    "shared/manifest.yml",
    'schema: ghost.package/v1\nid: universal\nversion: "0.36.0"\ncore: [starter]\n',
  );
  await put(
    "shared/parts/zebra.md",
    node([], "Shared prerequisite.", "materials: [materials/local.txt]\n"),
  );
  await put("shared/materials/local.txt", "Universal material.");
  await put("shared/starter.md", node(["parts/zebra"]));
  await put("shared/prefix.optional.md", node([]));
  await put(
    "brand/manifest.yml",
    'schema: ghost.package/v1\nid: fingerprint\nuniversal: "0.36.0"\ncore: [custom.welcome, another]\n',
  );
  await put("brand/custom.welcome.md", node(["parts/zebra", "optional-piece"]));
  await put(
    "brand/optional-piece.md",
    node([], "Fingerprint prerequisite.", "materials: [materials/local.txt]\n"),
  );
  await put("brand/materials/local.txt", "Fingerprint material.");
  await put("brand/another.md", node([]));
  await put(
    "brand/universal.foundation.choice.md",
    node(["prefix.optional", "optional-piece"]),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("gathers automatic guidance and pulls ordered closures from both owners without relying on names", async () => {
  const gather = await runCli(
    ["gather", ...brandArgs, "--format", "json", "--no-events"],
    root,
  );
  expect(gather.code).toBe(0);
  const menu = JSON.parse(gather.stdout);
  expect(menu.next.command).toContain("--universal ");
  expect(menu.core).toEqual(["starter", "custom.welcome", "another"]);
  expect(menu.automatic.map((entry: { id: string }) => entry.id)).toEqual([
    "parts/zebra",
    "starter",
    "optional-piece",
    "custom.welcome",
    "another",
  ]);
  expect(menu.nodes.map((entry: { id: string }) => entry.id)).toEqual([
    "prefix.optional",
    "universal.foundation.choice",
  ]);
  const bare = await runCli(
    ["pull", ...brandArgs, "--format", "json", "--no-events"],
    root,
  );
  expect(bare.code).toBe(0);
  const automatic = JSON.parse(bare.stdout);
  expect(automatic.ids).toEqual(
    menu.automatic.map((entry: { id: string }) => entry.id),
  );
  expect(automatic.fallback.source).toBe("ghost-default");

  const pull = await runCli(
    [
      "pull",
      "universal.foundation.choice",
      "prefix.optional",
      "starter",
      ...brandArgs,
      "--format",
      "json",
      "--no-events",
      "--order",
      "given",
    ],
    root,
  );
  expect(pull.code).toBe(0);
  const packet = JSON.parse(pull.stdout);
  expect(packet.ids).toEqual([
    ...automatic.ids,
    "prefix.optional",
    "universal.foundation.choice",
  ]);
  expect(
    packet.nodes.map((item: { packageId: string }) => item.packageId),
  ).toEqual([
    "universal",
    "universal",
    "fingerprint",
    "fingerprint",
    "fingerprint",
    "universal",
    "fingerprint",
  ]);
  expect(packet.nodes[0].packageDir).toBe(join(root, "shared"));
  expect(packet.nodes[0].materials[0].inlined).toBe("Universal material.");
  expect(packet.nodes[2].materials[0].inlined).toBe("Fingerprint material.");
  expect(packet.provenance).toEqual(menu.provenance);
  expect(packet.provenance.universal.hash).toMatch(/^sha256:[0-9a-f]{64}$/);

  const lint = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(lint.code).toBe(0);
  expect(JSON.parse(lint.stdout).issues).toEqual([]);
});

it("supports standalone universal pulls and standalone fingerprint core", async () => {
  const shared = await runCli(
    ["pull", "--package", "shared", "--format", "json", "--no-events"],
    root,
  );
  expect(shared.code).toBe(0);
  expect(JSON.parse(shared.stdout).ids).toEqual(["parts/zebra", "starter"]);
  await put(
    "standalone/manifest.yml",
    "schema: ghost.package/v1\nid: standalone\ncore: [entry]\n",
  );
  await put("standalone/entry.md", node([]));
  const standalone = await runCli(
    ["pull", "--package", "standalone", "--format", "json", "--no-events"],
    root,
  );
  expect(standalone.code).toBe(0);
  expect(JSON.parse(standalone.stdout).ids).toEqual(["entry"]);
});

it("requires an explicit universal source for paired fingerprints", async () => {
  const missing = await runCli(
    ["gather", "--package", "brand", "--format", "json"],
    root,
  );
  expect(missing.code).not.toBe(0);
  expect(missing.stderr).toContain("Pass --universal <dir>");
});

it.each([
  ["shared/optional-piece.md", node([]), /Duplicate node ID "optional-piece"/],
  ["brand/fracture.md", node(["missing"]), /requires missing node "missing"/],
  ["brand/optional-piece.md", node(["custom.welcome"]), /Dependency cycle/],
  ["shared/starter.md", node(["another"]), /requires missing node "another"/],
  [
    "brand/manifest.yml",
    'schema: ghost.package/v1\nid: fingerprint\nuniversal: "0.36.0"\ncore: [starter]\n',
    /must exist in the declaring package/,
  ],
])("rejects invalid package graphs after changing %s", async (path, content, error) => {
  await put(path, content);
  const invalid = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(invalid.code).not.toBe(0);
  expect(JSON.parse(invalid.stdout).issues[0].message).toMatch(error);
});

it("uses an authored core fallback and rejects conflicting policies", async () => {
  await put(
    "brand/another.md",
    node([], "## If no guidance applies\n\nAsk the owner."),
  );
  const pull = await runCli(
    ["pull", ...brandArgs, "--format", "json", "--no-events"],
    root,
  );
  expect(pull.code).toBe(0);
  expect(JSON.parse(pull.stdout)).not.toHaveProperty("fallback");
  await put(
    "brand/custom.welcome.md",
    node([], "## If no guidance applies\n\nProceed independently."),
  );
  const conflicting = await runCli(
    ["gather", ...brandArgs, "--format", "json"],
    root,
  );
  expect(conflicting.code).not.toBe(0);
  expect(conflicting.stderr).toMatch(/conflicting "If no guidance applies"/i);
});

it("reviews a universal material and resolves the universal check from its package", async () => {
  await put(
    "shared/checks/material.md",
    "---\nname: material\ndescription: Review material.\nseverity: medium\nreferences: [parts/zebra]\n---\n\nFlag mismatched material.\n",
  );
  const diff =
    "diff --git a/shared/materials/local.txt b/shared/materials/local.txt\n--- a/shared/materials/local.txt\n+++ b/shared/materials/local.txt\n";
  const review = await runCli(
    ["review", ...brandArgs, "--diff=-", "--format", "json"],
    root,
    { stdin: diff },
  );
  expect(review.code).toBe(0);
  const packet = JSON.parse(review.stdout);
  expect(packet.materialNodes[0].id).toBe("parts/zebra");
  expect(packet.checks[0]).toMatchObject({
    id: "material",
    offered: "matched",
  });
});

it("retains the legacy cover shape and menu", async () => {
  await put(
    "legacy/manifest.yml",
    "schema: ghost.package/v1\nid: legacy\ncover: brand\n",
  );
  await put("legacy/brand.md", "---\nfor: Any task.\n---\n\nBrand cover.\n");
  await put(
    "legacy/body.md",
    "---\nfor: Building a page.\nrequires: Editorial team\n---\n\nBrand body.\n",
  );
  const pull = await runCli(
    ["pull", "body", "--package", "legacy", "--format", "json", "--no-events"],
    root,
  );
  expect(pull.code).toBe(0);
  expect(JSON.parse(pull.stdout)).toMatchObject({
    ids: ["body"],
    cover: { state: "resolved", id: "brand" },
    nodes: [{ id: "body" }],
  });
  expect(JSON.parse(pull.stdout)).not.toHaveProperty("provenance");
  const gather = await runCli(
    ["gather", "--package", "legacy", "--format", "json"],
    root,
  );
  expect(gather.code).toBe(0);
  const menu = JSON.parse(gather.stdout);
  expect(menu.nodes).toMatchObject([{ id: "body" }]);
  expect(menu).not.toHaveProperty("core");
});
