import { execSync } from "node:child_process";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Materialize an npm package into a temporary directory.
 * Uses `npm pack` to download the tarball and extracts it.
 *
 * Returns the path to the extracted package contents.
 */
export async function materializeNpm(packageName: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "ghost-npm-"));

  try {
    // Download and extract the package tarball
    // Use public registry explicitly to avoid corporate proxy issues
    execSync(
      `npm pack ${packageName} --pack-destination "${tempDir}" --registry https://registry.npmjs.org`,
      {
        stdio: "pipe",
        timeout: 120000,
      },
    );

    // Find the tarball
    const files = await readdir(tempDir);
    const tarball = files.find((f) => f.endsWith(".tgz"));
    if (!tarball) {
      throw new Error(`No tarball found after npm pack ${packageName}`);
    }

    // Extract
    execSync(`tar xzf "${join(tempDir, tarball)}" -C "${tempDir}"`, {
      stdio: "pipe",
      timeout: 30000,
    });

    // npm pack extracts to a "package" subdirectory
    return join(tempDir, "package");
  } catch (err) {
    throw new Error(
      `Failed to materialize npm package "${packageName}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
