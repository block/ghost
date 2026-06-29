import { describe, expect, it } from "vitest";
import {
  type BindingCandidate,
  resolvePathToSurface,
} from "../../src/ghost-core/index.js";

function dirBinding(dir: string, surface: string): BindingCandidate {
  return { dir, explicit: false, entries: [{ surface, paths: [dir] }] };
}

describe("resolvePathToSurface", () => {
  it("resolves to the nearest (deepest) binding", () => {
    const candidates = [
      dirBinding("apps", "web"),
      dirBinding("apps/checkout", "checkout"),
    ];
    const result = resolvePathToSurface("apps/checkout/page.tsx", candidates, {
      hasRootContract: true,
    });
    expect(result.surface).toBe("checkout");
    expect(result.reason).toBe("directory");
    expect(result.binding_dir).toBe("apps/checkout");
  });

  it("lets an explicit binding beat a directory-implied one at the same level", () => {
    const dir: BindingCandidate = dirBinding("apps/checkout", "checkout");
    const explicit: BindingCandidate = {
      dir: "apps/checkout",
      explicit: true,
      entries: [{ surface: "checkout-explicit", paths: ["apps/checkout"] }],
    };
    const result = resolvePathToSurface(
      "apps/checkout/page.tsx",
      [dir, explicit],
      { hasRootContract: true },
    );
    expect(result.surface).toBe("checkout-explicit");
    expect(result.reason).toBe("explicit");
  });

  it("falls back to core when unbound and a root contract exists", () => {
    const result = resolvePathToSurface("README.md", [], {
      hasRootContract: true,
    });
    expect(result.surface).toBe("core");
    expect(result.reason).toBe("root-core");
  });

  it("returns null (menu) when unbound and no root contract", () => {
    const result = resolvePathToSurface("README.md", [], {
      hasRootContract: false,
    });
    expect(result.surface).toBeNull();
    expect(result.reason).toBe("unbound");
  });

  it("a single directory-implied entry binds unconditionally under its dir", () => {
    const result = resolvePathToSurface(
      "apps/checkout/deep/nested/file.tsx",
      [dirBinding("apps/checkout", "checkout")],
      { hasRootContract: true },
    );
    expect(result.surface).toBe("checkout");
  });

  it("a multi-entry explicit binding requires a path match (report, don't guess)", () => {
    const explicit: BindingCandidate = {
      dir: "apps/svc",
      explicit: true,
      entries: [
        { surface: "email-lifecycle", paths: ["apps/svc/src"] },
        { surface: "email-marketing", paths: ["apps/svc/campaigns"] },
      ],
    };
    const matched = resolvePathToSurface(
      "apps/svc/campaigns/promo.tsx",
      [explicit],
      { hasRootContract: true },
    );
    expect(matched.surface).toBe("email-marketing");

    // A file under the dir but matching no entry path does not bind to a guess;
    // it falls through to root core.
    const unmatched = resolvePathToSurface(
      "apps/svc/other/thing.tsx",
      [explicit],
      { hasRootContract: true },
    );
    expect(unmatched.surface).toBe("core");
    expect(unmatched.reason).toBe("root-core");
  });

  it("ignores bindings whose directory does not contain the file", () => {
    const result = resolvePathToSurface(
      "apps/web/home.tsx",
      [dirBinding("apps/checkout", "checkout")],
      { hasRootContract: true },
    );
    expect(result.surface).toBe("core");
  });
});
