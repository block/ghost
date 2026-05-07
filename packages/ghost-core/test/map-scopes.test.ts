import { describe, expect, it } from "vitest";
import { getEffectiveMapScopes, MapFrontmatterSchema } from "../src/index.js";

const BASE_MAP = {
  schema: "ghost.map/v2",
  id: "fixture",
  repo: "example/fixture",
  mapped_at: "2026-04-27",
  platform: "web",
  languages: [{ name: "typescript", files: 5, share: 1 }],
  build_system: "pnpm",
  package_manifests: ["package.json"],
  composition: {
    frameworks: [{ name: "react" }],
    rendering: "react",
    styling: ["tailwind"],
  },
  design_system: {
    paths: ["src/components"],
    entry_files: ["src/styles/tokens.css"],
    status: "active",
  },
  surface_sources: {
    render_strategy: "static-source",
    include: ["src/components/**"],
    exclude: ["**/dist/**"],
  },
  feature_areas: [
    {
      name: "checkout",
      paths: ["apps/checkout/src/page"],
      sub_areas: ["summary"],
    },
  ],
  orientation_files: ["README.md"],
};

describe("ghost.map/v2 scopes", () => {
  it("accepts explicit scopes in map frontmatter", () => {
    const parsed = MapFrontmatterSchema.parse({
      ...BASE_MAP,
      scopes: [
        {
          id: "checkout",
          name: "Checkout",
          kind: "product-surface",
          paths: ["apps/checkout/src/page"],
          sub_areas: ["summary", "payment"],
        },
      ],
    });

    expect(getEffectiveMapScopes(parsed)).toEqual([
      {
        id: "checkout",
        name: "Checkout",
        kind: "product-surface",
        paths: ["apps/checkout/src/page"],
        sub_areas: ["summary", "payment"],
      },
    ]);
  });

  it("derives effective scopes from feature_areas when scopes are absent", () => {
    const parsed = MapFrontmatterSchema.parse(BASE_MAP);

    expect(getEffectiveMapScopes(parsed)).toEqual([
      {
        id: "checkout",
        name: "checkout",
        kind: "feature-area",
        paths: ["apps/checkout/src/page"],
        sub_areas: ["summary"],
      },
    ]);
  });
});
