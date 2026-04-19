import { describe, expect, it } from "vitest";
import { parseScope } from "../src/review-command.js";

describe("parseScope", () => {
  it("defaults to files scope with empty args", () => {
    expect(parseScope([])).toEqual({ scope: "files", positional: [] });
  });

  it("defaults to files scope when first arg is a file path", () => {
    expect(parseScope(["src/main.tsx"])).toEqual({
      scope: "files",
      positional: ["src/main.tsx"],
    });
  });

  it("preserves multiple file positionals in default files scope", () => {
    expect(parseScope(["src/a.tsx", "src/b.tsx"])).toEqual({
      scope: "files",
      positional: ["src/a.tsx", "src/b.tsx"],
    });
  });

  it("picks files scope explicitly when first arg is 'files'", () => {
    expect(parseScope(["files"])).toEqual({
      scope: "files",
      positional: [],
    });
  });

  it("preserves file positionals after explicit files scope", () => {
    expect(parseScope(["files", "src/a.tsx", "src/b.tsx"])).toEqual({
      scope: "files",
      positional: ["src/a.tsx", "src/b.tsx"],
    });
  });

  it("picks project scope", () => {
    expect(parseScope(["project"])).toEqual({
      scope: "project",
      positional: [],
    });
  });

  it("picks project scope with target positional", () => {
    expect(parseScope(["project", "."])).toEqual({
      scope: "project",
      positional: ["."],
    });
  });

  it("picks project scope with github target", () => {
    expect(parseScope(["project", "github:owner/repo"])).toEqual({
      scope: "project",
      positional: ["github:owner/repo"],
    });
  });

  it("picks suite scope", () => {
    expect(parseScope(["suite"])).toEqual({
      scope: "suite",
      positional: [],
    });
  });

  it("picks suite scope with expression path", () => {
    expect(parseScope(["suite", "expression.md"])).toEqual({
      scope: "suite",
      positional: ["expression.md"],
    });
  });

  it("treats unknown keyword-like first arg as a file path (files scope)", () => {
    // 'scan' was a scope in the old world; must be treated as a file now.
    expect(parseScope(["scan"])).toEqual({
      scope: "files",
      positional: ["scan"],
    });
  });

  it("treats an empty string first arg as files-scope positional", () => {
    expect(parseScope([""])).toEqual({ scope: "files", positional: [""] });
  });
});
