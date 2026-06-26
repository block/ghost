import { describe, expect, it } from "vitest";
import {
  classifyContractReference,
  GhostBindingSchema,
  lintGhostBinding,
} from "../../src/ghost-core/index.js";

describe("classifyContractReference", () => {
  it("treats `.` as in-repo", () => {
    expect(classifyContractReference(".")).toBe("in-repo");
  });

  it("treats npm names (scoped and unscoped) as npm", () => {
    expect(classifyContractReference("@acme/brand")).toBe("npm");
    expect(classifyContractReference("brand")).toBe("npm");
    expect(classifyContractReference("brand-tokens")).toBe("npm");
  });

  it("rejects paths, urls, and resource ids", () => {
    expect(classifyContractReference("./brand")).toBe("unsupported");
    expect(classifyContractReference("../brand")).toBe("unsupported");
    expect(classifyContractReference("packages/brand")).toBe("unsupported");
    expect(classifyContractReference("https://x.example")).toBe("unsupported");
    expect(classifyContractReference("registry:brand")).toBe("unsupported");
  });
});

describe("lintGhostBinding contract reference", () => {
  function doc(contract: string) {
    return {
      schema: "ghost.binding/v1",
      contract,
      bindings: [{ surface: "checkout", paths: ["apps/checkout"] }],
    };
  }

  it("accepts an npm-name contract", () => {
    expect(lintGhostBinding(doc("@acme/brand")).errors).toBe(0);
  });

  it("accepts the in-repo contract", () => {
    expect(lintGhostBinding(doc(".")).errors).toBe(0);
  });

  it("rejects a path-like contract", () => {
    const report = lintGhostBinding(doc("../brand"));
    expect(
      report.issues.some((i) => i.rule === "binding-contract-unsupported"),
    ).toBe(true);
  });

  it("still parses the schema regardless of contract value", () => {
    expect(GhostBindingSchema.safeParse(doc("@acme/brand")).success).toBe(true);
  });
});
