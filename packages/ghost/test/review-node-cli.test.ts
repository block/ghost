import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./cli-test-utils.js";

const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const diff = [
  "diff --git a/brand/logo.svg b/brand/logo.svg",
  "--- a/brand/logo.svg",
  "+++ b/brand/logo.svg",
  "@@ -1 +1 @@",
  "-old",
  "+new",
  "diff --git a/new.html b/new.html",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/new.html",
  "@@ -0,0 +1 @@",
  "+<main>New page</main>",
].join("\n");
describe("review explicit guidance CLI", () => {
  let dir: string;
  let packageDir: string;
  const review = (...args: string[]) =>
    runCli(["review", "--diff=-", "--format", "json", ...args], dir, {
      stdin: diff,
    });
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-review-node-"));
    packageDir = join(dir, ".ghost");
    await mkdir(join(packageDir, "checks"), { recursive: true });
    await mkdir(join(dir, "brand"));
    const files: Record<string, string> = {
      "manifest.yml":
        "schema: ghost.package/v1\nid: review-test\ncover: voice\n",
      "glossary.md": "---\nkinds:\n  - name: asset\n---\n",
      "voice.md": "---\nfor: All writing.\n---\n\nUse concrete words.\n",
    };
    for (const name of ["logo", "layout"]) {
      files[`asset.${name}.md`] =
        `---\nfor: ${name} work.\nmaterials:\n  - brand/${name}.svg\n---\n\nPreserve ${name} guidance.\n`;
      await writeFile(join(dir, "brand", `${name}.svg`), "<svg />");
    }
    for (const [name, reference] of Object.entries({
      logo: "asset.logo",
      layout: "asset.layout",
      words: "voice",
    })) {
      files[`checks/${name}.md`] =
        `---\nname: ${name}\ndescription: Review ${name}.\nseverity: medium\nreferences:\n  - ${reference}\n---\n\nCheck ${name}.\n`;
    }
    await Promise.all(
      Object.entries(files).map(([path, text]) =>
        writeFile(join(packageDir, path), text),
      ),
    );
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("adds untouched material and prose guidance, deduplicating repeated flags", async () => {
    const result = await review(
      "--node",
      "asset.layout",
      "--node=voice",
      "--node",
      "asset.layout",
    );
    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.explicitNodeIds).toEqual(["asset.layout", "voice"]);
    expect(packet.explicitNodes.map((node: { id: string }) => node.id)).toEqual(
      ["asset.layout", "voice"],
    );
    expect(packet.explicitNodes[0].prose).toContain(
      "Preserve layout guidance.",
    );
    expect(packet.materialNodes.map((node: { id: string }) => node.id)).toEqual(
      ["asset.logo"],
    );
    expect(packet.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "logo", offered: "matched" }),
        expect.objectContaining({
          id: "layout",
          offered: "explicit",
          explicitVia: ["asset.layout"],
        }),
        expect.objectContaining({ id: "words", offered: "always" }),
      ]),
    );
    expect(packet.gaps).toContainEqual(
      expect.objectContaining({
        kind: "unmatched-file",
        files: ["new.html"],
      }),
    );
  });

  it("keeps no-flag selection and packet shape unchanged", async () => {
    const result = await review();
    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet).not.toHaveProperty("explicitNodeIds");
    expect(packet).not.toHaveProperty("explicitNodes");
    expect(
      packet.checks.map((check: { id: string }) => check.id).sort(),
    ).toEqual(["logo", "words"]);
    for (const check of packet.checks)
      expect(check).not.toHaveProperty("explicitVia");
  });

  it.each([
    ["missing"],
    ["asset.layout", "missing", "also-missing"],
    ["asset.layout,voice"],
    ["voice#heading"],
  ])("rejects exact unknown IDs before reading a diff file: %j", async (...ids) => {
    const result = await runCli(
      [
        "review",
        "--package",
        packageDir,
        "--diff",
        "absent.diff",
        ...ids.flatMap((id) => ["--node", id]),
      ],
      dir,
    );
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    for (const id of ids.filter((id) => id !== "asset.layout")) {
      expect(result.stderr).toContain(id);
    }
    expect(result.stderr).toContain("ghost gather");
    expect(result.stderr).toContain("same --package");
    expect(result.stderr).not.toContain("ENOENT");
  });

  it("rejects invalid IDs before stdin or git access", async () => {
    const stdinRead = vi.spyOn(process.stdin, "setEncoding");
    for (const source of [["--diff=-"], ["--base", "missing-ref"]]) {
      const result = await runCli(
        ["review", "--node", "missing", ...source],
        dir,
      );
      expect(result.code).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("missing");
      expect(result.stderr).not.toMatch(/fatal:|Command failed/);
    }
    expect(stdinRead).not.toHaveBeenCalled();
  });

  it.each([
    ["--node", "   "],
    ["--node", "voice", "--node"],
  ])("rejects empty and bare repeated values before diff access: %j", async (...flags) => {
    const result = await runCli(
      ["review", "--diff", "absent.diff", ...flags],
      dir,
    );
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--node requires");
    expect(result.stderr).not.toContain("ENOENT");
  });

  it.each([
    "--node",
    "--node=",
  ])("reports missing values through the executable parser: %s", (flag) => {
    const result = spawnSync(process.execPath, [bin, "review", flag], {
      cwd: dir,
      encoding: "utf8",
      input: "",
      timeout: 3000,
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("value is missing");
    expect(result.stderr).toContain("--node <id>");
  });

  it("retains the missing-checks guard but accepts an empty checks directory", async () => {
    await rm(join(packageDir, "checks"), { recursive: true });
    const missing = await review("--node", "voice");
    expect(missing.code).toBe(2);
    expect(missing.stdout).toBe("");
    expect(missing.stderr).toContain("ghost checks init");
    await mkdir(join(packageDir, "checks"));
    const empty = await review("--node", "voice");
    expect(empty.code).toBe(0);
    expect(JSON.parse(empty.stdout)).toMatchObject({
      explicitNodeIds: ["voice"],
      checks: [],
    });
  });

  it("exposes additive repeatable selection in help and the manifest", async () => {
    const help = await runCli(["review", "--help"], dir, { allowNoExit: true });
    expect(help.stdout).toContain("--node <id>");
    expect(help.stdout).toMatch(/repeat.*does not filter/);
    const manifest = await runCli(["manifest", "--format", "json"], dir);
    const command = JSON.parse(manifest.stdout).data.commands.find(
      (entry: { name: string }) => entry.name === "review",
    );
    expect(command.options).toContainEqual(
      expect.objectContaining({
        rawName: "--node <id>",
        name: "node",
        takesValue: true,
      }),
    );
  });
});
