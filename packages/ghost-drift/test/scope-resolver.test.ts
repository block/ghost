import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveFingerprintsForPaths } from "../src/core/index.js";

describe("resolveFingerprintsForPaths", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-drift-scope-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(join(dir, "fingerprints"), { recursive: true });
    await writeFile(join(dir, "map.md"), mapWithScopes(), "utf-8");
    await writeFile(join(dir, "profile.md"), "parent", "utf-8");
    await writeFile(join(dir, "fingerprints", "checkout.md"), "child", "utf-8");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns the scoped fingerprint for paths inside a scope", async () => {
    const [resolution] = await resolveFingerprintsForPaths(dir, [
      "apps/checkout/src/page/Pay.tsx",
    ]);

    expect(resolution).toEqual({
      changed_path: "apps/checkout/src/page/Pay.tsx",
      fingerprint_path: join(dir, "fingerprints", "checkout.md"),
      fallback: false,
      scope_id: "checkout",
    });
  });

  it("falls back to the parent fingerprint when no scope matches", async () => {
    const [resolution] = await resolveFingerprintsForPaths(dir, [
      "packages/core/src/Button.tsx",
    ]);

    expect(resolution).toEqual({
      changed_path: "packages/core/src/Button.tsx",
      fingerprint_path: join(dir, "profile.md"),
      fallback: true,
      reason: "no-scope-match",
    });
  });

  it("falls back to the parent when a matched scope has no fingerprint yet", async () => {
    const [resolution] = await resolveFingerprintsForPaths(dir, [
      "apps/portal/src/page/Home.tsx",
    ]);

    expect(resolution).toEqual({
      changed_path: "apps/portal/src/page/Home.tsx",
      fingerprint_path: join(dir, "profile.md"),
      fallback: true,
      reason: "scope-fingerprint-missing",
      scope_id: "portal",
    });
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
      - apps/checkout/src
  - id: portal
    name: Portal
    kind: product-surface
    paths:
      - apps/portal/src
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
