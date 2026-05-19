import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanStatus } from "../src/core/scan-status.js";

describe("scanStatus", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-scan-status-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports all-missing for an empty directory", async () => {
    const status = await scanStatus(dir);
    expect(status.resources.state).toBe("missing");
    expect(status.map.state).toBe("missing");
    expect(status.survey.state).toBe("missing");
    expect(status.patterns.state).toBe("missing");
    expect(status.checks.state).toBe("missing");
    expect(status.intent.state).toBe("missing");
    expect(status.recommended_next).toBe("resources");
  });

  it("recommends map when only resources.yml exists", async () => {
    await writeFile(join(dir, "resources.yml"), "schema: ghost.resources/v1\n");
    const status = await scanStatus(dir);
    expect(status.resources.state).toBe("present");
    expect(status.map.state).toBe("missing");
    expect(status.recommended_next).toBe("map");
  });

  it("recommends survey when resources.yml and map.md exist", async () => {
    await writeFile(join(dir, "resources.yml"), "schema: ghost.resources/v1\n");
    await writeFile(join(dir, "map.md"), "---\nschema: ghost.map/v2\n---\n");
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("present");
    expect(status.survey.state).toBe("missing");
    expect(status.recommended_next).toBe("survey");
  });

  it("recommends patterns when resources + map + survey exist but patterns are missing", async () => {
    await writeFile(join(dir, "resources.yml"), "schema: ghost.resources/v1\n");
    await writeFile(join(dir, "map.md"), "---\nschema: ghost.map/v2\n---\n");
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify({ schema: "ghost.survey/v2" }),
    );
    const status = await scanStatus(dir);
    expect(status.map.state).toBe("present");
    expect(status.survey.state).toBe("present");
    expect(status.patterns.state).toBe("missing");
    expect(status.recommended_next).toBe("patterns");
  });

  it("reports complete when required artifacts exist but checks and intent are missing", async () => {
    await writeFile(join(dir, "resources.yml"), "x");
    await writeFile(join(dir, "map.md"), "---\nschema: ghost.map/v2\n---\n");
    await writeFile(
      join(dir, "survey.json"),
      JSON.stringify({ schema: "ghost.survey/v2" }),
    );
    await writeFile(join(dir, "patterns.yml"), "y");
    const status = await scanStatus(dir);
    expect(status.patterns.state).toBe("present");
    expect(status.checks.state).toBe("missing");
    expect(status.intent.state).toBe("missing");
    expect(status.recommended_next).toBeNull();
  });

  it("returns recommended_next: null when every stage is present", async () => {
    await writeFile(join(dir, "resources.yml"), "w");
    await writeFile(join(dir, "map.md"), "x");
    await writeFile(join(dir, "survey.json"), "{}");
    await writeFile(join(dir, "patterns.yml"), "y");
    await writeFile(join(dir, "checks.yml"), "z");
    await writeFile(join(dir, "intent.md"), "intent");
    const status = await scanStatus(dir);
    expect(status.recommended_next).toBeNull();
  });

  it("treats empty (zero-byte) artifacts as missing", async () => {
    await writeFile(join(dir, "map.md"), "");
    const status = await scanStatus(dir);
    expect(status.resources.state).toBe("missing");
    expect(status.recommended_next).toBe("resources");
  });

  it("paths returned in the report are absolute", async () => {
    const status = await scanStatus(dir);
    expect(status.map.path.startsWith("/")).toBe(true);
    expect(status.dir).toBe(dir);
  });

  it("reports scoped survey and fingerprint artifacts when requested", async () => {
    await writeFile(join(dir, "map.md"), mapWithScopes());
    await mkdir(join(dir, "modules", "checkout"), { recursive: true });
    await mkdir(join(dir, "fingerprints"), { recursive: true });
    await writeFile(join(dir, "modules", "checkout", "survey.json"), "{}");
    await writeFile(join(dir, "fingerprints", "checkout.md"), "---\n---\n");

    const status = await scanStatus(dir, { includeScopes: true });

    expect(status.scope_error).toBeUndefined();
    expect(status.scopes).toEqual([
      expect.objectContaining({
        id: "checkout",
        kind: "product-surface",
        survey: expect.objectContaining({ state: "present" }),
        fingerprint: expect.objectContaining({ state: "present" }),
      }),
      expect.objectContaining({
        id: "portal",
        kind: "product-surface",
        survey: expect.objectContaining({ state: "missing" }),
        fingerprint: expect.objectContaining({ state: "missing" }),
      }),
    ]);
  });
});

function mapWithScopes(): string {
  return `---
schema: ghost.map/v2
id: fixture
repo: example/fixture
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 5, share: 1.0 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react
  styling:
    - tailwind
design_system:
  paths:
    - src/components
  entry_files:
    - src/styles/tokens.css
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - src/components/**
  exclude:
    - "**/dist/**"
feature_areas:
  - name: checkout
    paths:
      - apps/checkout
scopes:
  - id: checkout
    name: Checkout
    kind: product-surface
    paths:
      - apps/checkout
  - id: portal
    name: Portal
    kind: product-surface
    paths:
      - apps/portal
orientation_files:
  - README.md
---

## Identity

Fixture.

## Topology

Fixture.

## Conventions

Fixture.
`;
}
