import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../src/commands/init.js";
import { runReview } from "../src/commands/review.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

let dir: string | null = null;

afterEach(async () => {
  if (dir) {
    await rm(dir, { recursive: true, force: true });
    dir = null;
  }
});

const DIFF = `diff --git a/packages/geist/src/Modal/x.tsx b/packages/geist/src/Modal/x.tsx
--- a/packages/geist/src/Modal/x.tsx
+++ b/packages/geist/src/Modal/x.tsx
@@ -1 +1 @@
-a
+b
`;

describe("runReview", () => {
  it("hard-errors (exit 2) with an on-ramp when no .ghost/ resolves", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-review-"));
    // A haunt package without a loadable fingerprint: copy the valid fixture
    // into <ghost dir>/haunt but write no fingerprint manifest.
    const ghostDir = join(dir, ".ghost");
    await cp(fixture("valid"), join(ghostDir, "haunt"), { recursive: true });
    const diffPath = join(dir, "change.diff");
    await writeFile(diffPath, DIFF, "utf8");

    const result = await runReview({
      ghostDir,
      diff: diffPath,
    });
    expect(result.code).toBe(2);
    expect(result.packet).toBeNull();
    expect(result.output).toContain("ghost init");
    expect(result.output).toContain("@anarchitecture/ghost-fingerprint");
  });

  it("builds a packet when --ghost-dir points at a fingerprint", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-review-"));
    // Assemble a full .ghost/ package: the ghost fixture root + the valid
    // haunt fixture as its haunt/ subtree.
    const ghostDir = join(dir, ".ghost");
    await cp(fixture("ghost"), ghostDir, { recursive: true });
    await cp(fixture("valid"), join(ghostDir, "haunt"), { recursive: true });
    const diffPath = join(dir, "change.diff");
    await writeFile(diffPath, DIFF, "utf8");

    const result = await runReview({
      ghostDir,
      diff: diffPath,
    });
    expect(result.code).toBe(0);
    expect(result.packet?.fingerprintId).toBe("demo-fingerprint");
    expect(result.output).toContain("# Haunt review");
  });

  it("scaffolds via init then reviews against the scaffolded fingerprint", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-review-"));
    const ghostDir = join(dir, ".ghost");
    await runInit({ ghostDir });
    const diffPath = join(dir, "change.diff");
    await writeFile(diffPath, DIFF, "utf8");

    const result = await runReview({ ghostDir, diff: diffPath });
    expect(result.code).toBe(0);
    expect(result.output).toContain("# Haunt review");
  });
});
