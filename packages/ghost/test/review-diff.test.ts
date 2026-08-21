import { describe, expect, it } from "vitest";
import { parseTouchedFiles } from "../src/review/diff.js";

describe("parseTouchedFiles", () => {
  it("ignores deleted files in headerless unified diffs", () => {
    const diff = [
      "--- a/brand/logo.svg",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-old logo",
    ].join("\n");

    expect(parseTouchedFiles(diff)).toEqual([]);
  });

  it("keeps destination paths in headerless unified diffs", () => {
    const diff = [
      "--- /dev/null",
      "+++ b/brand/logo.svg",
      "@@ -0,0 +1 @@",
      "+new logo",
    ].join("\n");

    expect(parseTouchedFiles(diff)).toEqual([
      { path: "brand/logo.svg", patch: diff.split("\n").slice(1).join("\n") },
    ]);
  });
});
