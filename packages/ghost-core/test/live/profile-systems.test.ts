/**
 * Live integration test: profile real public design systems.
 *
 * These tests hit GitHub — they require network access and are slow.
 * Run with: pnpm vitest run test/live
 *
 * Each test profiles a real design system via shallow clone and asserts
 * that Ghost can extract meaningful signal from it.
 */

import { describe, expect, it } from "vitest";
import { Director } from "../../src/agents/director.js";
import { resolveTarget } from "../../src/config.js";
import { extractFromTarget } from "../../src/extractors/index.js";
import { compareFingerprints } from "../../src/fingerprint/compare.js";
import type { AgentContext, EnrichedFingerprint, Target } from "../../src/types.js";

// No LLM — purely deterministic
const ctx: AgentContext = {
  llm: undefined as never,
};

async function profileTarget(target: Target) {
  const director = new Director();
  const result = await director.profile(target, ctx);

  const fp = result.fingerprint.data;
  expect(fp.id).toBeDefined();
  expect(fp.timestamp).toBeDefined();
  expect(fp.embedding).toBeDefined();
  expect(fp.embedding.length).toBe(64);

  return { fp, result };
}

// ─── GitHub repos — diverse design systems ──────────────────────────

describe("GitHub design systems", { timeout: 180_000 }, () => {
  it("primer/css — GitHub Primer (CSS custom properties)", async () => {
    const { fp } = await profileTarget({ type: "github", value: "primer/css" });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
    // Primer ships lots of CSS custom properties
    const nonZero = fp.embedding.filter((v) => v !== 0).length;
    expect(nonZero).toBeGreaterThan(0);
  });

  it("radix-ui/themes — Radix (CSS + Tailwind)", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "radix-ui/themes",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("carbon-design-system/carbon — IBM Carbon (SCSS tokens)", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "carbon-design-system/carbon",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("patternfly/patternfly — Red Hat PatternFly (CSS)", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "patternfly/patternfly",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("elastic/eui — Elastic UI", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "elastic/eui",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("microsoft/fluentui — Microsoft Fluent UI", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "microsoft/fluentui",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("ant-design/ant-design — Ant Design", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "ant-design/ant-design",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("mantinedev/mantine — Mantine", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "mantinedev/mantine",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("twilio-labs/paste — Twilio Paste", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "twilio-labs/paste",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("saadeghi/daisyui — daisyUI (Tailwind plugin)", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "saadeghi/daisyui",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("zendesk/garden — Zendesk Garden", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "zendeskgarden/react-components",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });

  it("hashicorp/design-system — HashiCorp Helios", async () => {
    const { fp } = await profileTarget({
      type: "github",
      value: "hashicorp/design-system",
    });
    expect(["extraction", "registry", "llm"]).toContain(fp.source);
  });
});

// ─── resolveTarget auto-detection ───────────────────────────────────

describe("resolveTarget", () => {
  it("resolves explicit prefixes", () => {
    expect(resolveTarget("github:primer/css")).toEqual({ type: "github", value: "primer/css" });
    expect(resolveTarget("npm:antd")).toEqual({ type: "npm", value: "antd" });
    expect(resolveTarget("npm:@primer/css")).toEqual({ type: "npm", value: "@primer/css" });
    expect(resolveTarget("path:./src")).toEqual({ type: "path", value: "./src" });
  });

  it("resolves scoped npm packages without prefix", () => {
    expect(resolveTarget("@radix-ui/themes").type).toBe("npm");
    expect(resolveTarget("@carbon/styles").type).toBe("npm");
  });

  it("resolves URLs without prefix", () => {
    expect(resolveTarget("https://ui.shadcn.com/registry.json").type).toBe("url");
  });

  it("resolves explicit paths without prefix", () => {
    expect(resolveTarget("./packages/ghost-ui").type).toBe("path");
    expect(resolveTarget("/tmp/something").type).toBe("path");
  });

  it("resolves figma URLs", () => {
    expect(resolveTarget("https://figma.com/file/abc123").type).toBe("figma");
  });

  it("throws on ambiguous input without prefix", () => {
    expect(() => resolveTarget("primer/css")).toThrow("Ambiguous target");
    expect(() => resolveTarget("antd")).toThrow("Ambiguous target");
  });
});

// ─── Extraction pipeline ────────────────────────────────────────────

describe("extraction pipeline", { timeout: 120_000 }, () => {
  it("extracts and samples from GitHub", async () => {
    const target: Target = { type: "github", value: "primer/css" };
    const material = await extractFromTarget(target, { maxFiles: 30 });

    expect(material.files.length).toBeGreaterThan(0);
    expect(material.metadata.targetType).toBe("github");
    expect(material.metadata.sampledFiles).toBeGreaterThan(0);
  });
});

// ─── Fleet comparison: 3 systems head to head ───────────────────────

describe("fleet comparison", { timeout: 300_000 }, () => {
  it("profiles and compares 3 GitHub design systems", async () => {
    const targets: Target[] = [
      { type: "github", value: "primer/css" },
      { type: "github", value: "radix-ui/themes" },
      { type: "github", value: "patternfly/patternfly" },
    ];

    const director = new Director();
    const profiles: Array<{ label: string; fp: EnrichedFingerprint }> = [];

    // Profile sequentially to avoid overwhelming git
    for (const t of targets) {
      const result = await director.profile(t, ctx);
      profiles.push({ label: t.value, fp: result.fingerprint.data });
    }

    // All should have 64-dim embeddings
    for (const p of profiles) {
      expect(p.fp.embedding.length).toBe(64);
    }

    // Pairwise comparison — should have measurable distances
    const primerVsRadix = compareFingerprints(profiles[0].fp, profiles[1].fp);
    const primerVsPf = compareFingerprints(profiles[0].fp, profiles[2].fp);
    const radixVsPf = compareFingerprints(profiles[1].fp, profiles[2].fp);

    expect(primerVsRadix.distance).toBeGreaterThanOrEqual(0);
    expect(primerVsPf.distance).toBeGreaterThanOrEqual(0);
    expect(radixVsPf.distance).toBeGreaterThanOrEqual(0);

    // Log distances for manual inspection
    console.log("\n  Fleet distances:");
    console.log(
      `    Primer vs Radix:      ${primerVsRadix.distance.toFixed(3)}`,
    );
    console.log(
      `    Primer vs PatternFly: ${primerVsPf.distance.toFixed(3)}`,
    );
    console.log(
      `    Radix vs PatternFly:  ${radixVsPf.distance.toFixed(3)}`,
    );
  });
});
