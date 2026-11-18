import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const checker = join(repoRoot, "scripts/check-release-workflows.mjs");

describe("release workflow contract", () => {
  let dir: string;
  let releasePath: string;
  let releaseWorkflow: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-release-workflows-"));
    const workflowDir = join(dir, ".github/workflows");
    await mkdir(workflowDir, { recursive: true });
    await Promise.all(
      ["ci.yml", "release.yml", "release-tarball.yml"].map((name) =>
        copyFile(
          join(repoRoot, ".github/workflows", name),
          join(workflowDir, name),
        ),
      ),
    );
    releasePath = join(workflowDir, "release.yml");
    releaseWorkflow = await readFile(releasePath, "utf8");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function replaceRelease(before: string, after: string) {
    expect(releaseWorkflow).toContain(before);
    await writeFile(releasePath, releaseWorkflow.replace(before, after));
  }

  function runChecker() {
    return spawnSync(process.execPath, [checker], {
      cwd: dir,
      encoding: "utf8",
      timeout: 10_000,
    });
  }

  function expectFailure(message: string) {
    const result = runChecker();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `check-release-workflows failed: ${message}`,
    );
  }

  it("accepts the tokenless trusted publishing workflow", () => {
    const result = runChecker();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      "check-release-workflows: release workflows are wired correctly",
    );
  });

  it.each([
    ["missing", ""],
    ["read-only", "  id-token: read\n"],
  ])("rejects %s id-token permission", async (_label, permission) => {
    await replaceRelease("  id-token: write\n", permission);
    expectFailure("release.yml must grant 'id-token: write'");
  });

  it.each([
    "NPM_TOKEN",
    "NODE_AUTH_TOKEN",
  ])("rejects a legacy %s mapping without a secret reference", async (token) => {
    await replaceRelease(
      "          GITHUB_TOKEN:",
      `          ${token}: legacy-token\n          GITHUB_TOKEN:`,
    );
    expectFailure("release.yml must remove legacy npm token mappings");
  });

  it.each([
    "secrets.NPM_TOKEN",
    "secrets.NODE_AUTH_TOKEN",
    "secrets.DESIGN_INTELLIGENCE_NPM_PUBLISH_TOKEN",
    'secrets["DESIGN_INTELLIGENCE_NPM_PUBLISH_TOKEN"]',
  ])("rejects a legacy %s reference under another name", async (reference) => {
    await replaceRelease(
      "          GITHUB_TOKEN:",
      `          LEGACY_NPM_CREDENTIAL: \${{ ${reference} }}\n          GITHUB_TOKEN:`,
    );
    expectFailure("release.yml must remove legacy npm token mappings");
  });

  it("rejects setup-node registry-url generating token auth", async () => {
    await replaceRelease(
      "          node-version: 24\n",
      "          node-version: 24\n          registry-url: https://registry.npmjs.org\n",
    );
    expectFailure("release.yml must remove setup-node registry-url");
  });

  it("still requires publishing through Changesets", async () => {
    await replaceRelease(
      "publish: pnpm changeset publish",
      "publish: npm publish",
    );
    expectFailure("release.yml is missing Changesets publishing");
  });
});
