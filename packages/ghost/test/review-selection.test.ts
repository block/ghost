import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type GhostCatalog,
  type GhostCatalogNode,
  UsageError,
} from "#ghost-core";
import {
  resolveReview,
  validateExplicitReviewNodes,
} from "../src/review/resolve.js";
import type { LoadedCheck } from "../src/scan/check-files.js";

const transport = {
  repoRoot: resolve("/review-fixture"),
  packageDir: resolve("/review-fixture/packages/brand/.ghost"),
};

function node(id: string, materials?: string[]): GhostCatalogNode {
  return {
    id,
    slug: id,
    materials,
    concrete: Boolean(materials?.length),
    hasFencedExample: false,
    hasSkeleton: false,
    body: "# Guidance\n\n## Details\n\nKeep the next action clear.",
  };
}

function catalog(...nodes: GhostCatalogNode[]): GhostCatalog {
  return { nodes: new Map(nodes.map((entry) => [entry.id, entry])) };
}

function check(id: string, references: string[]): LoadedCheck {
  return {
    id,
    references,
    usesDeprecatedSource: false,
    doc: {
      frontmatter: {
        name: id,
        description: "Review the referenced guidance.",
        severity: "medium",
        references,
      },
      body: "Confirm the next action is clear.",
    },
  };
}

function checks(...entries: LoadedCheck[]): Map<string, LoadedCheck> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function diff(...paths: string[]): string {
  return paths
    .map((path) =>
      [
        `diff --git a/${path} b/${path}`,
        `--- a/${path}`,
        `+++ b/${path}`,
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
    )
    .join("\n");
}

const guidance = catalog(
  node("brand"),
  node("voice"),
  node("voice.md"),
  node("marketing/email"),
  node("asset.button", ["src/button.ts"]),
  node("asset.other", ["src/other.ts"]),
  node("asset.unchecked", ["src/unchecked.ts"]),
);

describe("validateExplicitReviewNodes", () => {
  it("defaults to no explicit nodes", () => {
    expect(validateExplicitReviewNodes(guidance)).toEqual([]);
  });

  it("deduplicates stably without changing the input or normalizing identities", () => {
    const ids = Object.freeze([
      "marketing/email",
      "brand",
      "voice.md",
      "voice",
      "brand",
      "marketing/email",
    ]);
    expect(validateExplicitReviewNodes(guidance, ids)).toEqual([
      "marketing/email",
      "brand",
      "voice.md",
      "voice",
    ]);
    expect(ids).toHaveLength(6);
  });

  it("reports all invalid and unknown IDs with a discovery fix", () => {
    const invalid = [
      "missing",
      "brand.md",
      "*.md",
      "brand > Details",
      "../voice",
      ".ghost/voice.md",
      " marketing/email",
      "marketing//email",
      "Brand",
      "",
    ];
    let caught: unknown;
    try {
      validateExplicitReviewNodes(guidance, ["brand", ...invalid, "brand"]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UsageError);
    const error = caught as UsageError;
    expect(error.exitCode).toBe(2);
    for (const id of invalid)
      expect(error.message).toContain(JSON.stringify(id));
    expect(error.message).toContain("ghost gather --format json");
    expect(error.message).toContain("same --package");
  });

  it("deduplicates repeated invalid IDs in the diagnostic", () => {
    expect(() =>
      validateExplicitReviewNodes(guidance, ["missing", "missing", "other"]),
    ).toThrow('Invalid or unknown review node IDs: "missing", "other".');
  });
});

describe("resolveReview explicit selection", () => {
  it("preserves default matching, always checks, via values, and gap wording", () => {
    const loaded = checks(
      check("material", ["asset.button > Details", "voice"]),
      check("always", ["brand", "marketing/email > Details"]),
      check("untouched", ["asset.other"]),
    );
    const patch = diff("src/button.ts", "src/unchecked.ts", "src/new.ts");
    const result = resolveReview(guidance, loaded, patch, transport);
    expect(result).toEqual(
      resolveReview(guidance, loaded, patch, transport, []),
    );
    expect(result.explicitNodeIds).toEqual([]);
    expect(result.offeredChecks).toEqual([
      {
        id: "material",
        severity: "medium",
        offered: "matched",
        via: ["asset.button > Details"],
      },
      {
        id: "always",
        severity: "medium",
        offered: "always",
        via: ["brand", "marketing/email > Details"],
      },
    ]);
    expect(result.materialNodes).toEqual([
      {
        id: "asset.button",
        files: ["src/button.ts"],
        locators: ["src/button.ts"],
      },
      {
        id: "asset.unchecked",
        files: ["src/unchecked.ts"],
        locators: ["src/unchecked.ts"],
      },
    ]);
    expect(result.gaps).toEqual([
      {
        kind: "unmatched-file",
        detail:
          "changed files match no node `materials` locators — no ghost package guidance claims them",
        files: ["src/new.ts"],
      },
      {
        kind: "unchecked-material",
        detail:
          "touched material-backed nodes have no check referencing them — review coverage is missing",
        nodes: ["asset.unchecked"],
      },
    ]);
  });

  it("adds mixed-reference checks via exact explicit refs, including anchors", () => {
    const loaded = checks(
      check("mixed", ["asset.other", "marketing/email > Details", "brand"]),
      check("unrelated", ["asset.other"]),
    );
    const result = resolveReview(
      guidance,
      loaded,
      diff("src/new.ts"),
      transport,
      ["brand", "marketing/email", "brand"],
    );
    expect(result.explicitNodeIds).toEqual(["brand", "marketing/email"]);
    expect(result.offeredChecks).toEqual([
      {
        id: "mixed",
        severity: "medium",
        offered: "explicit",
        via: ["marketing/email > Details", "brand"],
        explicitVia: ["marketing/email > Details", "brand"],
      },
    ]);
    expect(result.materialNodes).toEqual([]);
    expect(result.gaps).toEqual([
      {
        kind: "unmatched-file",
        detail: "changed files have no local material locator matches",
        files: ["src/new.ts"],
      },
    ]);
  });

  it("offers each check once in input order with matched then always precedence", () => {
    const loaded = checks(
      check("z-explicit", ["asset.other", "brand"]),
      check("a-matched", ["brand", "asset.button > Details", "asset.other"]),
      check("m-always", ["voice > Details", "brand"]),
    );
    const result = resolveReview(
      guidance,
      loaded,
      diff("src/button.ts"),
      transport,
      ["brand", "asset.button", "brand"],
    );
    expect(result.offeredChecks).toEqual([
      {
        id: "z-explicit",
        severity: "medium",
        offered: "explicit",
        via: ["brand"],
        explicitVia: ["brand"],
      },
      {
        id: "a-matched",
        severity: "medium",
        offered: "matched",
        via: ["asset.button > Details"],
        explicitVia: ["brand", "asset.button > Details"],
      },
      {
        id: "m-always",
        severity: "medium",
        offered: "always",
        via: ["voice > Details", "brand"],
        explicitVia: ["brand"],
      },
    ]);
    expect(result.gaps).toEqual([]);
  });

  it("selects an untouched material-backed node without inventing a material match", () => {
    const result = resolveReview(
      guidance,
      checks(check("other", ["asset.other > Details"])),
      "",
      transport,
      ["asset.other"],
    );
    expect(result.materialNodes).toEqual([]);
    expect(result.offeredChecks).toEqual([
      {
        id: "other",
        severity: "medium",
        offered: "explicit",
        via: ["asset.other > Details"],
        explicitVia: ["asset.other > Details"],
      },
    ]);
    expect(result.gaps).toEqual([]);
  });

  it("does not synthesize checks or suppress material coverage gaps", () => {
    const patch = diff("src/unchecked.ts", "src/new.ts");
    const baseline = resolveReview(guidance, checks(), patch, transport);
    const result = resolveReview(guidance, checks(), patch, transport, [
      "brand",
      "asset.unchecked",
      "asset.other",
    ]);
    expect(result.offeredChecks).toEqual([]);
    expect(result.materialNodes).toEqual(baseline.materialNodes);
    expect(result.gaps).toEqual([
      {
        ...baseline.gaps[0],
        detail: "changed files have no local material locator matches",
      },
      baseline.gaps[1],
    ]);
  });

  it("does not suppress checks unrelated to the explicit selection", () => {
    const loaded = checks(
      check("material", ["asset.button"]),
      check("always", ["voice"]),
    );
    const patch = diff("src/button.ts");
    const baseline = resolveReview(guidance, loaded, patch, transport);
    const result = resolveReview(guidance, loaded, patch, transport, ["brand"]);
    expect(result.offeredChecks).toEqual(baseline.offeredChecks);
    expect(result.materialNodes).toEqual(baseline.materialNodes);
    expect(result.gaps).toEqual(baseline.gaps);
  });

  it("rejects a mixed valid/invalid selection before processing any checks", () => {
    const loaded = checks(check("always", ["brand"]));
    const values = vi.spyOn(loaded, "values");
    expect(() =>
      resolveReview(guidance, loaded, "", transport, ["brand", "missing", "*"]),
    ).toThrow('Invalid or unknown review node IDs: "missing", "*".');
    expect(values).not.toHaveBeenCalled();
    values.mockRestore();
  });

  it("keeps package-relative material matching when explicit nodes are supplied", () => {
    const local = catalog(
      node("asset.logo", ["materials/logo.svg"]),
      node("brand"),
    );
    const result = resolveReview(
      local,
      checks(check("logo", ["asset.logo"])),
      diff("packages/brand/.ghost/materials/logo.svg"),
      transport,
      ["brand"],
    );
    expect(result.materialNodes).toEqual([
      {
        id: "asset.logo",
        files: ["packages/brand/.ghost/materials/logo.svg"],
        locators: ["materials/logo.svg"],
      },
    ]);
    expect(result.offeredChecks[0].offered).toBe("matched");
    expect(result.gaps).toEqual([]);
  });
});
