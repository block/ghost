import { describe, expect, it } from "vitest";
import { guidanceExamples } from "../../../apps/docs/src/data/guidance-examples.js";
import { parseNode } from "../src/ghost-core/node/parse.js";

describe("rendered docs guidance examples", () => {
  it.each(guidanceExamples)("$path parses without errors", ({ body }) => {
    const { node, report } = parseNode(body);
    expect(report.errors, JSON.stringify(report.issues)).toBe(0);
    expect(node).not.toBeNull();
  });
});
