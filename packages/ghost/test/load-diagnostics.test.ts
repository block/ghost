import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gatherGhostPackage } from "../src/embed/gather.js";
import { pullGhostNodes } from "../src/embed/pull.js";
import { loadGhostSnapshot } from "../src/embed/snapshot.js";
import { loadGhostPackage, resolveGhostPackage } from "../src/package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/review/review-packet.js";
import { loadCheckFiles } from "../src/scan/check-files.js";
import { loadNodeFiles } from "../src/scan/node-files.js";
import { runCli } from "./cli-test-utils.js";

// Mock directory failures, not chmod: permission tests must work as root too.
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, readdir: vi.fn(original.readdir) };
});

const validNode = "---\nfor: Writing an interface.\n---\n\nKeep it clear.\n";
const invalidNode = "---\nfor: [not, text]\n---\n\nBroken guidance.\n";

let dir: string;
let packageDir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), "ghost-load-diagnostics-"));
  packageDir = join(dir, ".ghost");
  await fs.mkdir(packageDir);
  await fs.writeFile(
    join(packageDir, "manifest.yml"),
    "schema: ghost.package/v1\nid: diagnostics\ncover: cover\n",
  );
  await fs.writeFile(join(packageDir, "cover.md"), validNode);
  await fs.writeFile(join(packageDir, "voice.md"), validNode);
});

afterEach(async () => {
  vi.mocked(fs.readdir).mockReset();
  const original =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(fs.readdir).mockImplementation(original.readdir);
  await fs.rm(dir, { recursive: true, force: true });
});

async function addInvalidFiles(): Promise<void> {
  await fs.mkdir(join(packageDir, "nested"));
  await fs.writeFile(join(packageDir, "nested", "bad.md"), invalidNode);
  await fs.writeFile(join(packageDir, "broken.md"), invalidNode);
  await fs.mkdir(join(packageDir, "checks"));
  await fs.writeFile(
    join(packageDir, "checks", "broken.md"),
    "No frontmatter.\n",
  );
}

function paths() {
  return resolveGhostPackage(packageDir, dir);
}

describe("load diagnostics", () => {
  it("keeps healthy diagnostics explicit and tolerates absent optional files", async () => {
    const snapshot = await loadGhostSnapshot(paths());
    expect(snapshot.glossary).toBeUndefined();
    const menu = gatherGhostPackage(snapshot);
    expect(menu.diagnostics).toEqual([]);
    expect(menu.contract.completeness.complete).toBe(true);
    expect(
      (await pullGhostNodes(snapshot, { repoRoot: dir })).diagnostics,
    ).toEqual([]);
    const packet = await buildReviewPacket(
      await loadGhostPackage(paths()),
      "",
      { cwd: dir },
    );
    expect(packet.diagnostics).toEqual([]);
    expect(formatReviewPacket(packet)).not.toContain("Warning:");
  });

  it("carries only invalid nodes through embed gather and pull, including all misses", async () => {
    await addInvalidFiles();
    const snapshot = await loadGhostSnapshot(paths());
    expect(snapshot.invalid.map((entry) => entry.file)).toEqual([
      "broken.md",
      "nested/bad.md",
    ]);
    const menu = gatherGhostPackage(snapshot, { ask: "Write an interface" });
    expect(menu.diagnostics).toEqual(snapshot.invalid);
    expect(menu.contract.completeness).toEqual({
      complete: false,
      filtered: false,
      ranked: false,
      selectedByGhost: false,
    });
    expect(menu.nodes.map((node) => node.id)).toEqual(["voice"]);
    for (const ids of [[], ["voice"], ["voice", "broken"], ["broken"]]) {
      const pull = await pullGhostNodes(snapshot, { ids, repoRoot: dir });
      expect(pull.diagnostics).toEqual(snapshot.invalid);
    }
    const miss = await pullGhostNodes(snapshot, {
      ids: ["broken"],
      repoRoot: dir,
    });
    expect(miss.cover.state).toBe("not-emitted");
    expect(miss.nodes).toEqual([]);
  });

  it("distinguishes all-invalid guidance from a healthy empty package", async () => {
    await fs.writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.package/v1\nid: diagnostics\n",
    );
    await fs.rm(join(packageDir, "cover.md"));
    await fs.writeFile(join(packageDir, "voice.md"), invalidNode);
    const incomplete = gatherGhostPackage(await loadGhostSnapshot(paths()));
    expect(incomplete.nodes).toEqual([]);
    expect(incomplete.contract.completeness.complete).toBe(false);
    expect(incomplete.diagnostics).toHaveLength(1);

    await fs.rm(join(packageDir, "voice.md"));
    const empty = gatherGhostPackage(await loadGhostSnapshot(paths()));
    expect(empty.nodes).toEqual([]);
    expect(empty.contract.completeness.complete).toBe(true);
    expect(empty.diagnostics).toEqual([]);
  });

  it("does not let invalid checks affect gather completeness or pull diagnostics", async () => {
    await fs.mkdir(join(packageDir, "checks"));
    await fs.writeFile(
      join(packageDir, "checks", "broken.md"),
      "No frontmatter.\n",
    );
    const snapshot = await loadGhostSnapshot(paths());
    expect(snapshot.invalidChecks).toHaveLength(1);
    const menu = gatherGhostPackage(snapshot);
    expect(menu.diagnostics).toEqual([]);
    expect(menu.contract.completeness.complete).toBe(true);
    expect(
      (await pullGhostNodes(snapshot, { ids: ["voice"], repoRoot: dir }))
        .diagnostics,
    ).toEqual([]);
  });

  it("collects malformed YAML as a file diagnostic without blocking valid guidance", async () => {
    await fs.writeFile(
      join(packageDir, "broken.md"),
      "---\nfor: [\n---\n\nBroken.\n",
    );
    await fs.mkdir(join(packageDir, "checks"));
    await fs.writeFile(
      join(packageDir, "checks", "broken.md"),
      "---\nreferences: [\n---\n\nBroken check.\n",
    );
    const snapshot = await loadGhostSnapshot(paths());
    expect(snapshot.invalid[0]?.file).toBe("broken.md");
    expect(snapshot.invalidChecks[0]?.file).toBe("checks/broken.md");
    const menu = gatherGhostPackage(snapshot);
    expect(menu.nodes.map((node) => node.id)).toEqual(["voice"]);
    expect(menu.contract.completeness.complete).toBe(false);
    await fs.rm(join(packageDir, "broken.md"));
    const checksOnly = gatherGhostPackage(await loadGhostSnapshot(paths()));
    expect(checksOnly.contract.completeness.complete).toBe(true);
    expect(checksOnly.diagnostics).toEqual([]);
  });

  it("includes invalid guidance and checks in review JSON and actionable markdown", async () => {
    await addInvalidFiles();
    const loaded = await loadGhostPackage(paths());
    const packet = await buildReviewPacket(loaded, "", { cwd: dir });
    expect(packet.diagnostics).toEqual([
      ...loaded.invalid,
      ...loaded.invalidChecks,
    ]);
    const markdown = formatReviewPacket(packet);
    for (const diagnostic of packet.diagnostics) {
      expect(markdown).toContain(diagnostic.file);
      expect(markdown).toContain(diagnostic.message);
    }
    expect(markdown).toContain("Warning:");
    expect(markdown).toContain("ghost validate");
    await fs.writeFile(join(dir, "change.diff"), "");
    const result = await runCli(
      ["review", "--diff", "change.diff", "--format", "json"],
      dir,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).diagnostics).toEqual(packet.diagnostics);
  });

  it.each([
    "json",
    "markdown",
  ])("reports partial gather and pull diagnostics in %s without failing", async (format) => {
    await addInvalidFiles();
    const snapshot = await loadGhostSnapshot(paths());
    const gather = await runCli(
      ["gather", "Write an interface", "--format", format],
      dir,
    );
    const pull = await runCli(
      ["pull", "voice", "broken", "--no-events", "--format", format],
      dir,
    );
    expect(gather.code).toBe(0);
    expect(pull.code).toBe(0);
    expect(pull.stderr).toContain("unknown node `broken`");
    for (const result of [gather, pull]) {
      if (format === "json") {
        expect(JSON.parse(result.stdout).diagnostics).toEqual(snapshot.invalid);
      } else {
        expect(result.stdout).toContain("Warning:");
        expect(result.stdout).toContain("broken.md");
        expect(result.stdout).toContain("nested/bad.md");
        expect(result.stdout).toContain("ghost validate");
        expect(result.stdout).not.toContain("checks/broken.md");
      }
    }
    if (format === "json") {
      expect(JSON.parse(gather.stdout).contract.completeness.complete).toBe(
        false,
      );
    } else {
      expect(gather.stdout).not.toContain(
        "This is the complete, unfiltered menu.",
      );
      expect(gather.stdout).toContain("incomplete");
    }
  });

  it.each([
    "json",
    "markdown",
  ])("keeps all-miss %s stdout empty and emits load diagnostics before exiting 2", async (format) => {
    await addInvalidFiles();
    const result = await runCli(["pull", "broken", "--format", format], dir);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("broken.md");
    expect(result.stderr).toContain("nested/bad.md");
    expect(result.stderr).toContain("ghost validate");
    expect(result.stderr).not.toContain("checks/broken.md");
    await expect(fs.stat(join(packageDir, ".events"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("preserves missing-package and dangling-cover failure exits", async () => {
    const missing = await runCli(
      ["gather", "task", "--package", "absent"],
      dir,
    );
    expect(missing.code).toBe(2);
    expect(missing.stdout).toBe("");
    expect(missing.stderr).toContain("ghost init");
    await fs.writeFile(join(packageDir, "cover.md"), invalidNode);
    const dangling = await runCli(["pull", "voice"], dir);
    expect(dangling.code).toBe(2);
    expect(dangling.stdout).toBe("");
    expect(dangling.stderr).toContain('manifest cover "cover"');
  });
});

describe("load failures are not absence", () => {
  it.each([
    "No frontmatter.",
    "---\nkinds: invalid\n---\n",
    "---\nkinds: [\n---\n",
  ])("rejects a malformed present glossary: %s", async (raw) => {
    await fs.writeFile(join(packageDir, "glossary.md"), raw);
    await expect(loadGhostSnapshot(paths())).rejects.toThrow(
      /glossary\.md.*ghost validate/s,
    );
    const result = await runCli(["gather", "task", "--format", "json"], dir);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("glossary.md");
    expect(result.stderr).toContain("ghost validate");
  });

  it.each([
    "EACCES",
    "EIO",
    "ENOTDIR",
  ])("rejects %s when reading node or check directories", async (code) => {
    const error = Object.assign(new Error(`filesystem ${code}`), { code });
    for (const load of [loadNodeFiles, loadCheckFiles]) {
      vi.mocked(fs.readdir).mockRejectedValueOnce(error);
      await expect(load(packageDir)).rejects.toThrow(
        /Check .*permissions.*retry/s,
      );
    }
  });

  it("propagates a nested directory failure rather than returning a partial catalog", async () => {
    await fs.mkdir(join(packageDir, "nested"));
    const original =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    vi.mocked(fs.readdir).mockImplementationOnce(original.readdir);
    vi.mocked(fs.readdir).mockRejectedValueOnce(
      Object.assign(new Error("denied"), { code: "EACCES" }),
    );
    await expect(loadNodeFiles(packageDir)).rejects.toThrow(/nested/);
  });

  it("treats only ENOENT as an absent directory", async () => {
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    vi.mocked(fs.readdir).mockRejectedValueOnce(missing);
    await expect(loadNodeFiles(packageDir)).resolves.toEqual({
      nodes: [],
      invalid: [],
    });
    vi.mocked(fs.readdir).mockRejectedValueOnce(missing);
    await expect(loadCheckFiles(packageDir)).resolves.toEqual({
      hasChecksDir: false,
      checks: new Map(),
      invalid: [],
    });
  });

  it("fails CLI loading on readdir errors without presenting empty success", async () => {
    vi.mocked(fs.readdir).mockRejectedValueOnce(
      Object.assign(new Error("denied"), { code: "EACCES" }),
    );
    const result = await runCli(["gather", "task", "--format", "json"], dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(packageDir);
    expect(result.stderr).toContain("permissions");
  });
});
