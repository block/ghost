import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  resolveFingerprintPackage,
  verifyFingerprintPackage,
} from "../src/core/index.js";

describe("fingerprint package", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-package-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("discovers .ghost by default", () => {
    const paths = resolveFingerprintPackage(undefined, dir);

    expect(paths.dir).toBe(join(dir, ".ghost"));
    expect(paths.resources).toBe(join(paths.dir, "resources.yml"));
    expect(paths.patterns).toBe(join(paths.dir, "patterns.yml"));
    expect(paths.checks).toBe(join(paths.dir, "checks.yml"));
    expect(paths.decisions).toBe(join(paths.dir, "decisions"));
    expect(paths.proposals).toBe(join(paths.dir, "proposals"));
  });

  it("lints package artifacts together when checks are present", async () => {
    await initFingerprintPackage(undefined, dir);

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("passes package lint when optional checks.yml is absent", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await rm(paths.checks, { force: true });

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("passes package lint when optional decisions and proposals are absent", async () => {
    await initFingerprintPackage(undefined, dir);

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("lints optional product-experience memory directories", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await mkdir(paths.decisions, { recursive: true });
    await mkdir(paths.proposals, { recursive: true });
    await writeFile(
      join(paths.decisions, "checkout-reversibility.yml"),
      `schema: ghost.decision/v1
id: checkout-reversibility
status: accepted
title: Reversibility before money movement
claim: Payment review must make reversibility visible before final submission.
rationale: Users need confidence before committing money movement.
scope:
  roles: [design, engineering, pm, qa]
  scopes: [checkout]
  surface_types: [payment-review]
  pattern_ids: [confirmation-before-commit]
evidence:
  - path: apps/checkout/review.tsx
    note: Review step exposes edit affordances before submit.
decided_at: "2026-05-17T00:00:00.000Z"
`,
    );
    await writeFile(
      join(paths.proposals, "saved-payment-empty-state.yml"),
      `schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: decision
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery over education.
rationale: The user is blocked from paying, not browsing product concepts.
scope:
  roles: [design, pm, qa]
  surface_types: [empty-state]
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: decisions
  summary: Promote into an accepted product-experience decision if repeated.
`,
    );

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("fails package lint for invalid memory artifacts", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await mkdir(paths.decisions, { recursive: true });
    await writeFile(
      join(paths.decisions, "bad.yml"),
      `schema: ghost.decision/v1
id: bad-decision
status: accepted
title: Missing evidence
claim: This decision is not auditable.
rationale: It has no evidence.
evidence: []
decided_at: "2026-05-17T00:00:00.000Z"
`,
    );

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some(
        (issue) => issue.path === "decisions/bad.yml.evidence",
      ),
    ).toBe(true);
  });

  it("fails package lint for duplicate memory ids", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await mkdir(paths.proposals, { recursive: true });
    const proposal = `schema: ghost.proposal/v1
id: duplicate-proposal
status: open
kind: decision
title: Duplicate proposal
claim: A candidate memory change.
rationale: Used to test duplicate IDs.
evidence:
  - note: Product team discussion.
proposed_action:
  target: decisions
  summary: Promote if accepted.
`;
    await writeFile(join(paths.proposals, "a.yml"), proposal);
    await writeFile(join(paths.proposals, "b.yml"), proposal);

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.rule)).toContain(
      "proposal-id-duplicate",
    );
  });

  it("fails package lint when checks reference unknown map scopes", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await writeFile(
      paths.checks,
      `schema: ghost.checks/v1
id: local
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [missing-scope]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.94
      observed_count: 1
      examples:
        - src/Button.tsx
`,
    );

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.rule)).toContain(
      "check-scope-unknown",
    );
  });

  it("verifies patterns against survey evidence", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await writeFile(
      paths.survey,
      JSON.stringify({
        schema: "ghost.survey/v2",
        sources: [{ target: ".", scanned_at: "2026-05-10T00:00:00Z" }],
        values: [],
        tokens: [],
        components: [],
        ui_surfaces: [
          {
            id: "surface_settings",
            source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
            name: "Settings",
            kind: "route",
            locator: "/settings",
            renderability: "source-only",
            files: ["src/settings.tsx"],
            classification: { surface_type: "settings" },
            signals: { layout_patterns: ["sectioned-form"] },
          },
        ],
      }),
    );
    await writeFile(
      paths.patterns,
      `schema: ghost.patterns/v1
id: local
surface_types:
  - id: settings
    preferred_patterns: [sectioned-form]
composition_patterns:
  - id: sectioned-form
    surface_types: [settings]
    evidence:
      - surface_id: surface_settings
`,
    );

    const report = await verifyFingerprintPackage(undefined, dir, {
      root: dir,
    });

    expect(report.errors).toBe(0);
  });
});
