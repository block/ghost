import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/scan/scan-status.js";

describe("scanStatus contribution", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-contribution-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports missing before manifest.yml exists", async () => {
    const status = await scanStatus(join(dir, ".ghost"));

    expect(status.fingerprint.state).toBe("missing");
    expect(status.recommended_next).toBe("fingerprint");
    expect(status.contribution.state).toBe("missing");
    expect(status.contribution.node_count).toBe(0);
  });

  it("reports empty contribution for a manifest-only package", async () => {
    await writePackage(dir);

    const status = await scanStatus(join(dir, ".ghost"));

    expect(status.fingerprint.state).toBe("present");
    expect(status.recommended_next).toBeNull();
    expect(status.contribution.state).toBe("empty");
    expect(status.contribution.node_count).toBe(0);
  });

  it("reports node contribution and surface coverage over the directory tree", async () => {
    await writePackage(dir, {
      // The core root prose (essence).
      "index.md": "---\n---\n\nCalm.\n",
      // The checkout surface directory, with one placed node (web incarnation).
      "checkout/index.md": "---\n---\n\nCheckout surface.\n",
      "checkout/trust.md": "---\nincarnation: web\n---\n\nReassure.\n",
    });

    const status = await scanStatus(join(dir, ".ghost"));

    expect(status.contribution.state).toBe("contributing");
    // 3 authored nodes: root index + checkout/index + checkout/trust.
    expect(status.contribution.node_count).toBe(3);
    // Two essence (the two index nodes) + one web-tagged (checkout/trust).
    expect(status.contribution.essence_count).toBe(2);
    expect(status.contribution.incarnation_count).toBe(1);
    // `checkout` is an interior directory holding one node.
    const checkout = status.contribution.surfaces.find(
      (s) => s.id === "checkout",
    );
    expect(checkout?.node_count).toBe(1);
  });
});

async function writePackage(
  dir: string,
  nodes?: Record<string, string>,
): Promise<void> {
  await mkdir(join(dir, ".ghost"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: local\n",
  );
  if (nodes) {
    for (const [relPath, content] of Object.entries(nodes)) {
      const full = join(dir, ".ghost", relPath);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content);
    }
  }
}
