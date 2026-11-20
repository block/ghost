import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
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
  await put("shared/starter.md", node(["parts/zebra"], "Shared core body."));
  await put("shared/prefix.optional.md", node([]));
  await put(
    "brand/manifest.yml",
    'schema: ghost.package/v1\nid: fingerprint\nuniversal: "0.36.0"\ncore: [custom.welcome, another]\n',
  );
  await put(
    "brand/custom.welcome.md",
    node(["parts/zebra", "optional-piece"], "Fingerprint core body."),
  );
  await put(
    "brand/optional-piece.md",
    node([], "Fingerprint prerequisite.", "materials: [materials/local.txt]\n"),
  );
  await put("brand/materials/local.txt", "Fingerprint material.");
  await put("brand/another.md", node([], "Second fingerprint core body."));
  await put(
    "brand/universal.foundation.choice.md",
    node(["prefix.optional", "optional-piece"]),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("gathers automatic guidance and pulls ordered closures from both owners without relying on names", async () => {
  await put(
    "shared/extra.md",
    node([], "Shared dependency of fingerprint core."),
  );
  await put(
    "brand/another.md",
    node(["extra"], "Second fingerprint core body."),
  );
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
    "extra",
    "optional-piece",
    "custom.welcome",
    "another",
  ]);
  expect(menu.nodes.map((entry: { id: string }) => entry.id)).toEqual([
    "prefix.optional",
    "universal.foundation.choice",
  ]);
  const markdown = await runCli(
    ["gather", "Draft a page", ...brandArgs, "--no-events"],
    root,
  );
  expect(markdown.code).toBe(0);
  let last = -1;
  for (const { id, body } of menu.automatic as { id: string; body: string }[]) {
    const entry = markdown.stdout.indexOf(`#### \`${id}\`\n\n${body}`);
    expect(entry).toBeGreaterThan(last);
    expect(markdown.stdout).not.toContain(`- \`${id}\`\n`);
    last = entry;
  }
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
  expect(pull.stderr).toContain("cascade pulls follow dependency graph order");
  const packet = JSON.parse(pull.stdout);
  expect(packet.ids).toEqual([
    "parts/zebra",
    "starter",
    "extra",
    "prefix.optional",
    "optional-piece",
    "custom.welcome",
    "another",
    "universal.foundation.choice",
  ]);
  expect(packet.nodes.map((item: { id: string }) => item.id)).toEqual(
    packet.ids,
  );
  expect(
    packet.nodes.map((item: { packageId: string }) => item.packageId),
  ).toEqual([
    "universal",
    "universal",
    "universal",
    "universal",
    "fingerprint",
    "fingerprint",
    "fingerprint",
    "fingerprint",
  ]);
  expect(packet.nodes[0].packageDir).toBe(join(root, "shared"));
  expect(packet.nodes[0].materials[0].inlined).toBe("Universal material.");
  expect(packet.nodes[4].materials[0].inlined).toBe("Fingerprint material.");
  expect(packet.nodes[0]).not.toHaveProperty("requires");
  expect(packet.nodes[5].requires).toEqual(["parts/zebra", "optional-piece"]);
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

it("emits rule authority in both formats for paired and standalone universal pulls", async () => {
  const authority =
    "Guidance moves from general to specific; universal guidance is followed by the brand's guidance. A node's `requires` field lists the nodes it builds on. Where a node's rule differs from a rule in a node it requires, directly or through other nodes, follow the node's own rule; the rest of the required node still applies. A rule marked `!important` is the exception: only another `!important` rule in a node that requires it can override it. If rules conflict and neither node `requires` the other, directly or through other nodes, report the conflict instead of guessing.";
  for (const args of [brandArgs, ["--package", "shared"]]) {
    const json = await runCli(
      ["pull", ...args, "--format", "json", "--no-events"],
      root,
    );
    expect(json.code).toBe(0);
    expect(JSON.parse(json.stdout).authority).toBe(authority);

    const markdown = await runCli(["pull", ...args, "--no-events"], root);
    expect(markdown.code).toBe(0);
    expect(
      markdown.stdout.startsWith(`# Authority\n\n${authority}\n\n---\n\n`),
    ).toBe(true);
    expect(markdown.stdout).toContain(
      "# `starter`\n\nrequires: parts/zebra\n\nApplies when:",
    );
    expect(markdown.stdout).toContain("# `parts/zebra`\n\nApplies when:");
    if (args === brandArgs) {
      expect(markdown.stdout).toContain(
        "# `custom.welcome`\n\nrequires: parts/zebra, optional-piece\n\nApplies when:",
      );
    }
  }
});

it("emits directly openable paired-package materials from outside both packages", async () => {
  const locator = "materials/logo.svg";
  const sharedLogo = '<svg id="shared"/>';
  const brandLogo = '<svg id="brand"/>';
  await put(`shared/${locator}`, sharedLogo);
  await put(`brand/${locator}`, brandLogo);
  await put(
    "shared/starter.md",
    node(["parts/zebra"], "Shared core.", `materials: [${locator}]\n`),
  );
  await put(
    "brand/another.md",
    node([], "Brand core.", `materials: [${locator}]\n`),
  );
  const caller = join(root, "caller");
  await mkdir(caller);
  execFileSync("git", ["init", "--quiet"], { cwd: caller });
  const args = [
    "pull",
    "--package",
    join(root, "brand"),
    "--universal",
    join(root, "shared"),
    "--no-events",
  ];
  const json = await runCli([...args, "--format", "json"], caller);
  const markdown = await runCli(args, caller);
  expect(json.code).toBe(0);
  expect(markdown.code).toBe(0);
  for (const [id, owner, bytes] of [
    ["starter", "shared", sharedLogo],
    ["another", "brand", brandLogo],
  ]) {
    const expectedPath = join(root, owner, locator);
    const entry = JSON.parse(json.stdout).nodes.find(
      (node: { id: string }) => node.id === id,
    );
    expect(entry.materials).toMatchObject([{ locator, inspect: expectedPath }]);
    expect(await readFile(entry.materials[0].inspect, "utf8")).toBe(bytes);
    const section = markdown.stdout.split(`# \`${id}\``)[1]?.split("---")[0];
    const address = section?.match(/View before making: `([^`]+)`/)?.[1];
    expect(address).toBe(expectedPath);
    expect(await readFile(address ?? "", "utf8")).toBe(bytes);
  }
  const raw = await runCli([...args, "--no-materials"], caller);
  const rawJson = await runCli(
    [...args, "--no-materials", "--format", "json"],
    caller,
  );
  expect(raw.code).toBe(0);
  expect(rawJson.code).toBe(0);
  for (const owner of ["shared", "brand"]) {
    expect(raw.stdout).toContain(`Material package: \`${join(root, owner)}\``);
  }
  expect(raw.stdout).toContain(`- Reference: \`${locator}\``);
  expect(
    JSON.parse(rawJson.stdout).nodes.find(
      (node: { id: string }) => node.id === "starter",
    ).materials,
  ).toEqual([locator]);
});

it.each([
  ["versioned", 'version: "0.36.0"'],
  ["core-only", "core: [mark]"],
])("opens standalone %s materials from a sibling repo", async (name, declaration) => {
  const locator = "materials/logo.svg";
  const contents = `<svg id="${name}"/>`;
  await put(
    `${name}/manifest.yml`,
    `schema: ghost.package/v1\nid: ${name}\n${declaration}\n`,
  );
  await put(
    `${name}/mark.md`,
    node([], "Use the logo.", `materials: [${locator}]\n`),
  );
  await put(`${name}/${locator}`, contents);
  const caller = join(root, "caller");
  await mkdir(caller);
  execFileSync("git", ["init", "--quiet"], { cwd: caller });

  const args = ["pull", "mark", "--package", `../${name}`, "--no-events"];
  const markdown = await runCli(args, caller);
  const json = await runCli([...args, "--format", "json"], caller);
  expect(markdown.code).toBe(0);
  expect(json.code).toBe(0);
  const { inspect } = JSON.parse(json.stdout).nodes[0].materials[0];
  const printed = markdown.stdout.match(/View before making: `([^`]+)`/)?.[1];
  expect(inspect).toBe(join(root, name, locator));
  expect(printed).toBe(inspect);
  expect(await readFile(inspect, "utf8")).toBe(contents);

  const raw = await runCli([...args, "--no-materials"], caller);
  expect(raw.code).toBe(0);
  expect(raw.stdout).toContain(`- Reference: \`${locator}\``);
  expect(raw.stdout).not.toContain("Material package:");
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

it("uses any authored automatic policy, accepts identical text and identifies distinct sources", async () => {
  const authored = "## If no guidance applies\n\nAsk the owner.";
  await put("brand/optional-piece.md", node([], authored));
  await put("shared/parts/zebra.md", node([], authored));
  const pull = await runCli(
    ["pull", ...brandArgs, "--format", "json", "--no-events"],
    root,
  );
  expect(pull.code).toBe(0);
  expect(JSON.parse(pull.stdout)).not.toHaveProperty("fallback");
  await put(
    "brand/another.md",
    node([], "## If no guidance applies\n\nProceed independently."),
  );
  const conflicting = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(conflicting.code).not.toBe(0);
  expect(JSON.parse(conflicting.stdout).issues[0].message).toMatch(
    /distinct "If no guidance applies".*"parts\/zebra" \(package "universal"\).*"optional-piece" \(package "fingerprint"\).*"another" \(package "fingerprint"\)/,
  );
});

it("reports several graph errors in one validation and identifies malformed dependencies", async () => {
  await put("shared/parts/zebra.md", "---\nfor: A.\nfor: B.\n---\nBody.\n");
  await put("brand/broken.md", node(["missing", "cycle"]));
  await put("brand/cycle.md", node(["broken"]));
  await put("brand/other.md", node(["also-missing"]));
  const invalid = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(invalid.code).toBe(1);
  const messages = JSON.parse(invalid.stdout).issues.map(
    ({ message }: { message: string }) => message,
  );
  expect(messages).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /requires invalid node "parts\/zebra".*keys must be unique/s,
      ),
      expect.stringContaining('requires missing node "missing"'),
      expect.stringContaining("Dependency cycle: broken -> cycle -> broken."),
      expect.stringContaining('requires missing node "also-missing"'),
    ]),
  );
  const gather = await runCli(
    ["gather", ...brandArgs, "--format", "json", "--no-events"],
    root,
  );
  expect(gather.code).toBe(2);
  expect(gather.stderr).toMatch(
    /requires invalid node "parts\/zebra".*keys must be unique/s,
  );
});

it("validates core IDs as package-relative node paths", async () => {
  await put(
    "brand/manifest.yml",
    'schema: ghost.package/v1\nid: fingerprint\nuniversal: "0.36.0"\ncore: [part//entry]\n',
  );
  const invalid = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(invalid.code).toBe(1);
  expect(JSON.parse(invalid.stdout).issues).toContainEqual(
    expect.objectContaining({
      path: "manifest.yml.core.0",
      message: expect.stringContaining("core entry must be a node ID"),
    }),
  );
});

it("reports mismatched versions in successful gather and pull, and rejects a non-SemVer declaration", async () => {
  const warning = {
    code: "universal-version-mismatch",
    severity: "warning",
    expectedVersion: "0.36.0",
    actualVersion: "1.0.0",
  };
  const manifest = (version: string) =>
    `schema: ghost.package/v1\nid: universal\nversion: "${version}"\ncore: [starter]\n`;
  await put("shared/manifest.yml", manifest("1.0.0"));
  for (const command of ["gather", "pull"]) {
    const result = await runCli(
      [command, ...brandArgs, "--format", "json", "--no-events"],
      root,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).diagnostics).toMatchObject([warning]);
    expect(result.stderr).toContain("Warning: Fingerprint expects universal");
  }
  const markdown = await runCli(
    ["gather", "Draft a page", ...brandArgs, "--no-events"],
    root,
  );
  expect(markdown.stdout).toContain("> Warning: Fingerprint expects universal");
  expect(markdown.stdout).toContain("This is the complete, unfiltered menu.");
  await put("shared/manifest.yml", manifest("^1.0.0"));
  const invalid = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(invalid.code).toBe(1);
  expect(JSON.parse(invalid.stdout).issues[0].message).toContain("use SemVer");
});

it("rejects paired-package symlinks outside the owning package", async () => {
  await put("outside.txt", "Outside the package.");
  await symlink(
    join(root, "outside.txt"),
    join(root, "shared/materials/outside.txt"),
  );
  const invalid = await runCli(
    ["validate", ...brandArgs, "--format", "json"],
    root,
  );
  expect(invalid.code).toBe(1);
  expect(JSON.parse(invalid.stdout).issues[0].message).toContain(
    'Package "universal" has invalid symlinks: materials/outside.txt',
  );
});

it("counts explicitly requested selections for paired-package stats", async () => {
  const gather = await runCli(["gather", "Draft a page", ...brandArgs], root);
  expect(gather.code).toBe(0);
  const pull = await runCli(
    ["pull", "universal.foundation.choice", ...brandArgs],
    root,
  );
  expect(pull.code).toBe(0);
  const bare = await runCli(["pull", ...brandArgs], root);
  expect(bare.code).toBe(0);
  const stats = await runCli(["stats", ...brandArgs, "--format", "json"], root);
  expect(stats.code).toBe(0);
  const report = JSON.parse(stats.stdout);
  expect(report.pulls).toBe(2);
  expect(report.nodes).toEqual([
    { id: "universal.foundation.choice", exposures: 1, pulls: 1, hitRate: 1 },
    { id: "prefix.optional", exposures: 1, pulls: 0, hitRate: 0 },
  ]);
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
  expect(
    packet.nodes.filter((node: { role: string }) => node.role === "matched"),
  ).toMatchObject([{ id: "parts/zebra" }]);
  expect(packet.checks[0]).toMatchObject({
    id: "material",
    offered: "matched",
  });
});

it("identifies review material owners for matched, explicit, and context nodes", async () => {
  await put(
    "shared/checks/material.md",
    "---\nname: material\ndescription: Review material.\nreferences: [parts/zebra]\n---\n\nReview the material.\n",
  );
  const pull = await runCli(
    ["pull", ...brandArgs, "--no-events", "--format", "json"],
    root,
  );
  expect(pull.code).toBe(0);
  const pulledNodes = JSON.parse(pull.stdout).nodes;
  const locator = "materials/local.txt";
  const owner = `Material package: \`${join(root, "shared")}\``;
  for (const role of ["matched", "explicit", "context"]) {
    const file =
      role === "matched" ? "shared/materials/local.txt" : "output.html";
    const stdin = `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n`;
    const args = [
      "review",
      ...brandArgs,
      "--diff=-",
      ...(role === "explicit" ? ["--node", "parts/zebra"] : []),
    ];
    const json = await runCli([...args, "--format", "json"], root, { stdin });
    const markdown = await runCli(args, root, { stdin });
    expect(json.code).toBe(0);
    expect(markdown.code).toBe(0);
    const nodes = JSON.parse(json.stdout).nodes;
    const materialNode = nodes.find(
      ({ id }: { id: string }) => id === "parts/zebra",
    );
    expect(materialNode).toMatchObject({
      packageId: "universal",
      packageDir: join(root, "shared"),
      role,
      materials: [locator],
    });
    for (const { id, packageId, packageDir } of pulledNodes) {
      expect(
        nodes.find((node: { id: string }) => node.id === id),
      ).toMatchObject({ packageId, packageDir });
    }
    const materialSection = markdown.stdout
      .split("### `parts/zebra`")[1]
      ?.split("\n### ")[0];
    expect(materialSection).toBeDefined();
    if (role === "context") {
      expect(materialSection).not.toContain("Material package:");
    } else {
      expect(markdown.stdout.split(owner)).toHaveLength(2);
      expect(materialSection).toContain(owner);
    }
  }
});

it("orders standalone review guidance the same as a pull", async () => {
  await put("shared/parts/base.md", node([], "Base guidance."));
  await put(
    "shared/prefix.optional.md",
    node(["parts/base"], "Requested guidance."),
  );
  await put(
    "shared/checks/optional.md",
    "---\nname: optional\ndescription: Review the optional guidance.\nreferences: [prefix.optional]\n---\n\nReview the guidance.\n",
  );

  const args = ["--package", "shared"];
  const pull = await runCli(
    ["pull", "prefix.optional", ...args, "--format", "json", "--no-events"],
    root,
  );
  const stdin =
    "diff --git a/output.html b/output.html\n--- a/output.html\n+++ b/output.html\n";
  const reviewArgs = [
    "review",
    ...args,
    "--node",
    "prefix.optional",
    "--diff=-",
  ];
  const review = await runCli([...reviewArgs, "--format", "json"], root, {
    stdin,
  });
  const markdown = await runCli(reviewArgs, root, { stdin });
  expect(pull.code).toBe(0);
  expect(review.code).toBe(0);
  expect(markdown.code).toBe(0);
  const ids = JSON.parse(pull.stdout).ids;
  expect(ids).toEqual([
    "parts/zebra",
    "starter",
    "parts/base",
    "prefix.optional",
  ]);
  const packet = JSON.parse(review.stdout);
  expect(packet.nodes.map(({ id }: { id: string }) => id)).toEqual(ids);
  expect(packet.nodes.map(({ role }: { role: string }) => role)).toEqual([
    "context",
    "context",
    "context",
    "explicit",
  ]);
  expect(
    Array.from(markdown.stdout.matchAll(/^### `([^`]+)`/gm), ([, id]) => id),
  ).toEqual(ids);
});

it("shares authority and dependency context in pull, matched review, and explicit review", async () => {
  const light = "Use a light ground.";
  const dark = "Use a dark ground.";
  await put(
    "shared/light.md",
    node([], light, "materials: [materials/light.svg]\n"),
  );
  await put("shared/materials/light.svg", "<svg/>");
  await put("shared/ground.md", node(["light"], "Choose a ground."));
  await put("brand/base-ground.md", node([], "Keep the ground consistent."));
  await put(
    "brand/ground-choice.md",
    node(["ground", "base-ground"], dark, "materials: [materials/dark.svg]\n"),
  );
  await put("brand/materials/dark.svg", "<svg/>");
  for (const [owner, name, reference] of [
    ["shared", "light-check", "light"],
    ["brand", "dark-check", "ground-choice"],
  ]) {
    await put(
      `${owner}/checks/${name}.md`,
      `---\nname: ${name}\ndescription: Review ground.\nseverity: medium\nreferences: [${reference}]\n---\n\nCheck the ground.\n`,
    );
  }
  const diff = (file: string) =>
    `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n`;
  const pullArgs = ["pull", "ground-choice", ...brandArgs, "--no-events"];
  const pull = await runCli([...pullArgs, "--format", "json"], root);
  expect(pull.code).toBe(0);
  const packet = JSON.parse(pull.stdout);
  const pullMarkdown = await runCli(pullArgs, root);
  expect(pullMarkdown.code).toBe(0);
  for (const value of [
    packet.authority,
    light,
    dark,
    "requires: ground, base-ground",
    "requires: light",
  ]) {
    expect(pullMarkdown.stdout).toContain(value);
  }

  const pullOrder = Array.from(
    pullMarkdown.stdout.matchAll(/^# `([^`]+)`$/gm),
    ([, id]) => id,
  );
  expect(pullOrder).toEqual(packet.ids);

  for (const variant of ["matched", "explicit", "both"]) {
    const explicit = variant !== "matched";
    const brandDiff = diff("brand/materials/dark.svg");
    const stdin =
      variant === "explicit"
        ? diff("output.html")
        : brandDiff +
          (variant === "both" ? diff("shared/materials/light.svg") : "");
    const args = [
      "review",
      ...brandArgs,
      "--diff=-",
      ...(explicit ? ["--node", "ground-choice"] : []),
    ];
    const json = await runCli([...args, "--format", "json"], root, { stdin });
    const markdown = await runCli(args, root, { stdin });
    expect(json.code).toBe(0);
    expect(markdown.code).toBe(0);
    const review = JSON.parse(json.stdout);
    expect(review.authority).toBe(packet.authority);
    const guidance = review.nodes;
    expect(guidance.map((node: { id: string }) => node.id)).toEqual(packet.ids);
    expect(
      guidance.filter((node: { role: string }) => node.role === "matched"),
    ).toMatchObject(
      variant === "both"
        ? [
            { id: "light", files: ["shared/materials/light.svg"] },
            { id: "ground-choice", files: ["brand/materials/dark.svg"] },
          ]
        : variant === "matched"
          ? [{ id: "ground-choice", files: ["brand/materials/dark.svg"] }]
          : [],
    );
    expect(review.explicitNodeIds).toEqual(
      explicit ? ["ground-choice"] : undefined,
    );
    expect(
      guidance.find((node: { id: string }) => node.id === "ground-choice").role,
    ).toBe(variant === "explicit" ? "explicit" : "matched");
    expect(
      guidance.find((node: { id: string }) => node.id === "base-ground").role,
    ).toBe("context");
    expect(review.checks).toMatchObject([
      ...(variant === "both"
        ? [{ id: "light-check", offered: "matched" }]
        : []),
      {
        id: "dark-check",
        offered: variant === "explicit" ? "explicit" : "matched",
        baseline: [{ nodeId: "ground-choice" }],
      },
    ]);
    expect(review.checks.at(-1).baseline[0]).not.toHaveProperty("body");
    const markdownOrder = Array.from(
      markdown.stdout.matchAll(/^### `([^`]+)`/gm),
      ([, id]) => id,
    );
    expect(markdownOrder).toEqual(pullOrder);
    for (const { id, requires, body } of packet.nodes) {
      const reviewNode = guidance.find((node) => node.id === id);
      expect(reviewNode.prose.trim()).toBe(body.trim());
      expect(reviewNode.requires).toEqual(requires);
    }
    for (const value of [
      packet.authority,
      light,
      dark,
      "requires: ground, base-ground",
      "requires: light",
    ]) {
      expect(markdown.stdout.split(value)).toHaveLength(2);
    }
    expect(markdown.stdout).toContain("## Guidance");
    if (variant === "both") {
      expect(markdown.stdout).toContain(
        "Matched material and explicitly requested.",
      );
    } else {
      expect(markdown.stdout).not.toContain("checks/light-check");
    }
  }
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
  const file = await runCli(
    ["validate", "legacy/body.md", "--format", "json"],
    root,
  );
  expect(file.code).toBe(0);
  expect(JSON.parse(file.stdout).issues).toEqual([]);
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
  expect(JSON.parse(pull.stdout)).not.toHaveProperty("authority");
  const gather = await runCli(
    ["gather", "--package", "legacy", "--format", "json"],
    root,
  );
  expect(gather.code).toBe(0);
  const menu = JSON.parse(gather.stdout);
  expect(menu.nodes).toMatchObject([{ id: "body" }]);
  expect(menu).not.toHaveProperty("core");
});
