import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("reports node contribution and surface coverage", async () => {
    await writePackage(
      dir,
      `schema: ghost.surfaces/v1
surfaces:
  - id: checkout
    parent: core
  - id: email
    parent: core
`,
      {
        "core-voice.md": "---\nid: core-voice\nunder: core\n---\n\nCalm.\n",
        "checkout-trust.md":
          "---\nid: checkout-trust\nunder: checkout\nincarnation: web\n---\n\nReassure.\n",
      },
    );

    const status = await scanStatus(join(dir, ".ghost"));

    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.node_count).toBe(2);
    expect(status.contribution.essence_count).toBe(1);
    expect(status.contribution.incarnation_count).toBe(1);
    const checkout = status.contribution.surfaces.find(
      (s) => s.id === "checkout",
    );
    expect(checkout?.node_count).toBe(1);
    // email surface declared but has no nodes → sparse.
    expect(status.contribution.sparse_surfaces).toContain("email");
  });
});

async function writePackage(
  dir: string,
  surfacesYml?: string,
  nodes?: Record<string, string>,
): Promise<void> {
  await mkdir(join(dir, ".ghost"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: local\n",
  );
  if (surfacesYml) {
    await writeFile(join(dir, ".ghost", "surfaces.yml"), surfacesYml);
  }
  if (nodes) {
    await mkdir(join(dir, ".ghost", "nodes"), { recursive: true });
    for (const [name, content] of Object.entries(nodes)) {
      await writeFile(join(dir, ".ghost", "nodes", name), content);
    }
  }
}
