import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCSS, buildTokenMap, buildReverseValueMap } from "../../src/resolvers/css.js";

const fixtureCSS = readFileSync(
  resolve(__dirname, "../fixtures/registry/src/styles/main.css"),
  "utf-8",
);

describe("parseCSS", () => {
  const tokens = parseCSS(fixtureCSS);

  it("extracts tokens from @theme block", () => {
    const themeTokens = tokens.filter((t) => t.selector === "@theme");
    expect(themeTokens.length).toBeGreaterThan(0);

    const white = themeTokens.find((t) => t.name === "--color-white");
    expect(white).toBeDefined();
    expect(white!.value).toBe("#ffffff");
    expect(white!.category).toBe("color");
  });

  it("extracts tokens from :root block", () => {
    const rootTokens = tokens.filter((t) => t.selector === ":root");
    expect(rootTokens.length).toBeGreaterThan(0);

    const bgDefault = rootTokens.find((t) => t.name === "--background-default");
    expect(bgDefault).toBeDefined();
    expect(bgDefault!.value).toBe("var(--color-white)");
    expect(bgDefault!.category).toBe("background");
  });

  it("extracts tokens from .dark block", () => {
    const darkTokens = tokens.filter((t) => t.selector === ".dark");
    expect(darkTokens.length).toBe(4);
  });

  it("resolves var() references", () => {
    const bgDefault = tokens.find(
      (t) => t.name === "--background-default" && t.selector === ":root",
    );
    expect(bgDefault!.resolvedValue).toBe("#ffffff");
  });

  it("categorizes tokens correctly", () => {
    const border = tokens.find((t) => t.name === "--border-default");
    expect(border!.category).toBe("border");

    const text = tokens.find((t) => t.name === "--text-muted" && t.selector === ":root");
    expect(text!.category).toBe("text");

    const shadow = tokens.find((t) => t.name === "--shadow-card");
    expect(shadow!.category).toBe("shadow");

    const radius = tokens.find((t) => t.name === "--radius");
    expect(radius!.category).toBe("radius");
  });
});

describe("buildTokenMap", () => {
  it("keys tokens by selector::name", () => {
    const tokens = parseCSS(fixtureCSS);
    const map = buildTokenMap(tokens);
    expect(map.has(":root::--background-default")).toBe(true);
    expect(map.has(".dark::--background-default")).toBe(true);
    expect(map.has("@theme::--color-white")).toBe(true);
  });
});

describe("buildReverseValueMap", () => {
  it("maps resolved values to token names", () => {
    const tokens = parseCSS(fixtureCSS);
    const map = buildReverseValueMap(tokens);
    expect(map.get("#ffffff")).toBe("--color-white");
    expect(map.get("#1a1a1a")).toBe("--color-gray-900");
  });
});
