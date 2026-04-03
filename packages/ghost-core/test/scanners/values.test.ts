import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCSS } from "../../src/resolvers/css.js";
import { scanValues } from "../../src/scanners/values.js";

const registryCSS = readFileSync(
  resolve(__dirname, "../fixtures/registry/src/styles/main.css"),
  "utf-8",
);
const cleanCSS = readFileSync(
  resolve(__dirname, "../fixtures/consumer-clean/src/styles/main.css"),
  "utf-8",
);
const driftedCSS = readFileSync(
  resolve(__dirname, "../fixtures/consumer-drifted/src/styles/main.css"),
  "utf-8",
);

const registryTokens = parseCSS(registryCSS);
const defaultRules = {
  "hardcoded-color": "error" as const,
  "token-override": "warn" as const,
  "missing-token": "warn" as const,
};

describe("scanValues - clean consumer", () => {
  it("reports no drift for identical tokens", () => {
    const cleanTokens = parseCSS(cleanCSS);
    const results = scanValues({
      registryTokens,
      consumerTokens: cleanTokens,
      consumerCSS: cleanCSS,
      rules: defaultRules,
      styleFile: "src/styles/main.css",
    });

    const overrides = results.filter((r) => r.rule === "token-override");
    const missing = results.filter((r) => r.rule === "missing-token");
    expect(overrides).toHaveLength(0);
    expect(missing).toHaveLength(0);
  });
});

describe("scanValues - drifted consumer", () => {
  const driftedTokens = parseCSS(driftedCSS);
  const results = scanValues({
    registryTokens,
    consumerTokens: driftedTokens,
    consumerCSS: driftedCSS,
    rules: defaultRules,
    styleFile: "src/styles/main.css",
  });

  it("detects token overrides", () => {
    const overrides = results.filter((r) => r.rule === "token-override");
    expect(overrides.length).toBeGreaterThan(0);

    const borderDrift = overrides.find((r) => r.token === "--border-default");
    expect(borderDrift).toBeDefined();
    expect(borderDrift!.registryValue).toBe("var(--color-gray-200)");
    expect(borderDrift!.consumerValue).toBe("var(--color-gray-500)");
  });

  it("detects hardcoded colors", () => {
    const hardcoded = results.filter((r) => r.rule === "hardcoded-color");
    expect(hardcoded.length).toBeGreaterThan(0);

    const messages = hardcoded.map((r) => r.token);
    expect(messages).toContain("#ff6b6b");
  });

  it("detects missing tokens", () => {
    const missing = results.filter((r) => r.rule === "missing-token");
    expect(missing.length).toBeGreaterThan(0);

    const missingNames = missing.map((r) => r.token);
    // --text-muted exists in .dark block so it's found by name
    expect(missingNames).toContain("--text-inverse");
    expect(missingNames).toContain("--text-danger");
  });

  it("respects rule severity", () => {
    const hardcoded = results.filter((r) => r.rule === "hardcoded-color");
    for (const r of hardcoded) {
      expect(r.severity).toBe("error");
    }

    const overrides = results.filter((r) => r.rule === "token-override");
    for (const r of overrides) {
      expect(r.severity).toBe("warn");
    }
  });
});

describe("scanValues - rules can be disabled", () => {
  it("skips disabled rules", () => {
    const driftedTokens = parseCSS(driftedCSS);
    const results = scanValues({
      registryTokens,
      consumerTokens: driftedTokens,
      consumerCSS: driftedCSS,
      rules: {
        "hardcoded-color": "off",
        "token-override": "off",
        "missing-token": "off",
      },
      styleFile: "src/styles/main.css",
    });
    expect(results).toHaveLength(0);
  });
});
