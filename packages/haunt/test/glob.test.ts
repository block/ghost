import { describe, expect, it } from "vitest";
import { matchesGlob } from "../src/bridge/glob.js";

describe("matchesGlob", () => {
  it("matches ** across directories, including trailing", () => {
    expect(
      matchesGlob(
        "packages/geist/src/Modal/**",
        "packages/geist/src/Modal/index.tsx",
      ),
    ).toBe(true);
    expect(
      matchesGlob(
        "packages/geist/src/Modal/**",
        "packages/geist/src/Modal/sub/deep.ts",
      ),
    ).toBe(true);
    expect(
      matchesGlob(
        "packages/geist/src/Modal/**",
        "packages/geist/src/Button/index.tsx",
      ),
    ).toBe(false);
  });

  it("matches **/ as zero or more leading segments", () => {
    expect(matchesGlob("**/*.ts", "a/b/c.ts")).toBe(true);
    expect(matchesGlob("**/*.ts", "c.ts")).toBe(true);
    expect(matchesGlob("**/*.ts", "c.tsx")).toBe(false);
  });

  it("single * does not cross directories", () => {
    expect(matchesGlob("src/*.ts", "src/a.ts")).toBe(true);
    expect(matchesGlob("src/*.ts", "src/a/b.ts")).toBe(false);
  });

  it("supports {a,b} alternation", () => {
    expect(matchesGlob("src/*.{ts,tsx}", "src/a.tsx")).toBe(true);
    expect(matchesGlob("src/*.{ts,tsx}", "src/a.js")).toBe(false);
  });
});
