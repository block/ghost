import { afterEach, describe, expect, it } from "vitest";
import { gatherRelayContext } from "../src/relay.js";
import {
  createSingleSurfaceSandbox,
  removeSandbox,
} from "./fixtures/context-sandboxes/harness.js";

describe("relay", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => removeSandbox(root)));
  });

  it("gathers structured fingerprint context for a target", async () => {
    const root = await track(createSingleSurfaceSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      target: "apps/refunds/settings/page.tsx",
    });

    expect(result.schema).toBe("ghost.relay.gather/v1");
    expect(result.source.kind).toBe("stack");
    expect(result.targetPaths).toEqual(["apps/refunds/settings/page.tsx"]);
    expect(result.entrypoint.match.status).toBe("path-match");
    expect(result.entrypoint.match.matchedScopes).toEqual(["refund-settings"]);
    expect(result.cascade_brief.package_chain).toHaveLength(1);
    expect(
      result.cascade_brief.intent_cascade.map((node) => node.ref),
    ).toContain("intent.principle:refund-trust");
    expect(
      result.cascade_brief.composition_guidance.map((node) => node.ref),
    ).toContain("composition.pattern:refund-disclosure");
    expect(result.cascade_brief.validate.map((node) => node.ref)).toContain(
      "validate.check:no-hardcoded-ui-color",
    );
    expect(result.brief).toContain("# Ghost Relay Brief");
    expect(result.brief).toContain("## Intent Cascade");
    expect(result.brief).toContain("intent.principle:refund-trust");
  });

  async function track(rootPromise: Promise<string>): Promise<string> {
    const root = await rootPromise;
    roots.push(root);
    return root;
  }
});
