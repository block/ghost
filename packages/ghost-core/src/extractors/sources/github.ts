import { execSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Materialize a GitHub repository into a temporary directory.
 * Uses shallow clone for speed.
 *
 * @param repo - "owner/repo" format
 * @param branch - optional branch/tag to check out
 * @returns path to the cloned repository
 */
export async function materializeGithub(
  repo: string,
  branch?: string,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "ghost-github-"));
  const url = `https://github.com/${repo}.git`;

  try {
    const branchFlag = branch ? `--branch ${branch}` : "";
    execSync(`git clone --depth 1 ${branchFlag} "${url}" "${tempDir}"`, {
      stdio: "pipe",
      timeout: 120000,
    });

    return tempDir;
  } catch (err) {
    throw new Error(
      `Failed to clone GitHub repo "${repo}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
