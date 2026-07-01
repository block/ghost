import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateHauntGraph } from "../src/graph/validate.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

async function loadOrThrow(name: string) {
  const { pkg } = await loadHauntPackage(fixture(name));
  if (!pkg) throw new Error(`fixture ${name} failed to load`);
  return pkg;
}

describe("validateHauntGraph", () => {
  it("passes a well-formed graph with no issues", async () => {
    const report = validateHauntGraph(await loadOrThrow("valid"));
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("flags dangling honors, uses, and grounds edges", async () => {
    const report = validateHauntGraph(await loadOrThrow("broken"));
    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("edge/honors-unresolved");
    expect(rules).toContain("edge/uses-unresolved");
    expect(rules).toContain("edge/grounds-unresolved");
  });

  it("warns on orphan tenets and inventory without paths", async () => {
    const report = validateHauntGraph(await loadOrThrow("broken"));
    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("tenet/orphan");
    expect(rules).toContain("inventory/no-paths");
  });

  it("emits info when a honored tenet has no grounding check", async () => {
    const report = validateHauntGraph(await loadOrThrow("broken"));
    const ungrounded = report.issues.find((i) => i.rule === "tenet/ungrounded");
    expect(ungrounded?.where).toBe("tenets/honored");
  });
});
