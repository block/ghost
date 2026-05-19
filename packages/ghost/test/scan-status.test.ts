import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/scan/scan-status.js";

describe("scanStatus readiness", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-readiness-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports pending readiness before map and survey exist", async () => {
    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("pending");
    expect(status.readiness.reasons.join(" ")).toContain("map.md is missing");
    expect(status.readiness.reasons.join(" ")).toContain(
      "survey.json is missing",
    );
  });

  it("reports substrate-only when only values, tokens, or components exist", async () => {
    await writeFile(join(dir, "map.md"), mapFile("unknown"));
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(
        surveyFile({
          components: [
            {
              id: "component_button",
              source: source(),
              name: "Button",
              discovered_via: "registry.json",
            },
          ],
          ui_surfaces: [],
        }),
      ),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("substrate-only");
    expect(status.readiness.substrate_rows.components).toBe(1);
    expect(status.readiness.can_review).toContain("components");
    expect(status.readiness.cannot_review).toContain("product composition");
  });

  it("reports component-demo when only stories or docs examples exist", async () => {
    await writeFile(join(dir, "map.md"), mapFile("storybook"));
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(
        surveyFile({
          ui_surfaces: [
            {
              id: "surface_button_story",
              source: source(),
              name: "Button story",
              kind: "story",
              locator: "button--default",
              renderability: "rendered",
              files: ["src/button.stories.tsx"],
              signals: { layout_patterns: ["button-demo"] },
            },
          ],
        }),
      ),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("component-demo");
    expect(status.readiness.demo_surface_count).toBe(1);
    expect(status.readiness.cannot_review).toContain("surface flow");
  });

  it("reports product-observed when route or screen evidence exists", async () => {
    await writeFile(join(dir, "map.md"), mapFile("static-source"));
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify(
        surveyFile({
          ui_surfaces: [
            {
              id: "surface_settings",
              source: source(),
              name: "Settings",
              kind: "route",
              locator: "/settings",
              renderability: "source-only",
              files: ["src/routes/settings.tsx"],
              signals: { layout_patterns: ["settings-stack"] },
            },
          ],
        }),
      ),
    );

    const status = await scanStatus(dir);

    expect(status.readiness.state).toBe("product-observed");
    expect(status.readiness.product_surface_count).toBe(1);
    expect(status.readiness.can_review).toContain("product composition");
  });
});

function source() {
  return { target: ".", scanned_at: "2026-05-19T00:00:00.000Z" };
}

function surveyFile(overrides: Record<string, unknown>) {
  return {
    schema: "ghost.survey/v2",
    sources: [source()],
    values: [],
    tokens: [],
    components: [],
    ui_surfaces: [],
    ...overrides,
  };
}

function mapFile(renderStrategy: string): string {
  return `---
schema: ghost.map/v2
id: local
repo: local
mapped_at: 2026-05-19
platform: web
languages:
  - { name: typescript, files: 1, share: 1 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react-spa
  styling:
    - css
design_system:
  paths:
    - src/components
  status: active
surface_sources:
  render_strategy: ${renderStrategy}
  include:
    - src/**
  exclude:
    - node_modules/**
  coverage_gaps:
    - no product screens exist yet
feature_areas:
  - name: components
    paths:
      - src/components
orientation_files:
  - README.md
---

## Identity

Local test target.

## Topology

Components live under src/components.

## Conventions

Tests use a compact map fixture.
`;
}
