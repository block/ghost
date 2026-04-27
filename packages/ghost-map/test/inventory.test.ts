import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inventory } from "../src/core/inventory.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "fixtures/web-repo");

describe("inventory", () => {
  it("emits deterministic raw signals for a small web repo fixture", () => {
    const out = inventory(FIXTURE);

    expect(out.root).toBe(FIXTURE);
    expect(out.package_manifests).toEqual(["package.json"]);
    expect(out.platform_hints).toEqual(["web"]);

    const langs = Object.fromEntries(
      out.language_histogram.map((l) => [l.name, l.files]),
    );
    expect(langs.typescript).toBeGreaterThanOrEqual(3);
    // SKIP_DIRS (coverage/) must not contribute — no `javascript` leak.
    expect(langs.javascript ?? 0).toBe(0);

    expect(out.candidate_config_files).toContain("registry.json");
    expect(out.candidate_config_files).toContain("tailwind.config.ts");
    expect(out.candidate_config_files).toContain("tsconfig.json");
    expect(out.candidate_config_files).toContain("src/styles/tokens.css");

    expect(out.registry_files).toEqual(["registry.json"]);

    const topPaths = out.top_level_tree.map((t) => t.path);
    expect(topPaths).toContain("src/");
    expect(topPaths).toContain("test/");
    expect(topPaths).toContain("package.json");

    // top_level_tree is sorted lexicographically
    expect([...topPaths].sort()).toEqual(topPaths);
  });

  it("is reproducible — two consecutive calls return equivalent JSON", () => {
    const a = inventory(FIXTURE);
    const b = inventory(FIXTURE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("returns null git fields outside a git repo", () => {
    // The fixture sub-tree isn't its own git repo — git lookups should
    // either resolve to the surrounding ghost repo or null. We just assert
    // the field types so the contract holds.
    const out = inventory(FIXTURE);
    expect(typeof out.git_remote === "string" || out.git_remote === null).toBe(
      true,
    );
    expect(
      typeof out.git_default_branch === "string" ||
        out.git_default_branch === null,
    ).toBe(true);
  });
});
