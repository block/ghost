import type {
  Fingerprint,
  GhostChecksDocument,
  MapFrontmatter,
  Survey,
  SurveySource,
} from "@ghost/core";
import { summarizeSurvey } from "@ghost/core";
import { describe, expect, it } from "vitest";
import { buildFingerprintViewerHtml } from "../../src/core/context/index.js";

const SOURCE: SurveySource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-05-07T12:00:00.000Z",
};

const FINGERPRINT: Fingerprint = {
  id: "sample-ds",
  source: "llm",
  timestamp: "2026-05-07T12:00:00.000Z",
  observation: {
    summary: "Restrained and direct.",
    personality: ["restrained", "operational"],
    resembles: ["Linear"],
  },
  signature:
    "Dense control surfaces with quiet chrome and a precise green accent.",
  references: {
    specs: ["src/styles/tokens.css"],
    components: ["src/components/ui"],
    examples: ["docs/examples/dashboard.md"],
  },
  decisions: [
    {
      dimension: "color-strategy",
      dimension_kind: "color-strategy",
      decision: "Use green as a precise signal, not a page wash.",
      evidence: ["--color-accent: #00d64f"],
    },
  ],
  palette: {
    dominant: [{ role: "accent", value: "#00d64f" }],
    neutrals: { steps: ["#ffffff", "#111111"], count: 2 },
    semantic: [{ role: "surface", value: "#ffffff" }],
    saturationProfile: "muted",
    contrast: "high",
  },
  spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 },
  typography: {
    families: ["Inter"],
    sizeRamp: [12, 16, 24],
    weightDistribution: { 400: 0.8, 600: 0.2 },
    lineHeightPattern: "normal",
  },
  surfaces: {
    borderRadii: [4, 8],
    shadowComplexity: "deliberate-none",
    borderUsage: "minimal",
  },
  embedding: [],
};

const CHECKS: GhostChecksDocument = {
  schema: "ghost.checks/v1",
  id: "sample-ds",
  checks: [
    {
      id: "no-red-buttons",
      title: "No red primary buttons",
      status: "active",
      severity: "serious",
      detector: { type: "forbidden-regex", pattern: "bg-red" },
      evidence: { support: 0.96, observed_count: 12 },
      repair: "Use the accent token instead.",
    },
  ],
};

const MAP: MapFrontmatter = {
  schema: "ghost.map/v2",
  id: "sample-ds",
  repo: "block/ghost",
  mapped_at: "2026-05-07T12:00:00.000Z",
  platform: "web",
  languages: [{ name: "typescript", files: 12, share: 1 }],
  build_system: ["pnpm", "vite"],
  package_manifests: ["package.json"],
  composition: {
    frameworks: [{ name: "react" }],
    rendering: "browser",
    styling: ["css"],
  },
  design_system: {
    paths: ["src/components/ui"],
    status: "active",
    token_source: "inline",
  },
  surface_sources: {
    render_strategy: "browser",
    include: ["src/**/*.tsx"],
    exclude: ["**/node_modules/**"],
  },
  feature_areas: [{ name: "docs", paths: ["apps/docs"] }],
  orientation_files: ["README.md"],
};

function survey(): Survey {
  return {
    schema: "ghost.survey/v2",
    sources: [SOURCE],
    values: [
      {
        id: "value-color-accent",
        source: SOURCE,
        kind: "color",
        value: "#00d64f",
        raw: "#00D64F",
        occurrences: 5,
        files_count: 2,
        role_hypothesis: "accent",
      },
    ],
    tokens: [
      {
        id: "token-accent",
        source: SOURCE,
        name: "--color-accent",
        alias_chain: [],
        resolved_value: "#00d64f",
        occurrences: 4,
      },
    ],
    components: [
      {
        id: "component-button",
        source: SOURCE,
        name: "Button",
        discovered_via: "registry.json",
        variants: ["primary"],
        sizes: ["sm"],
      },
    ],
    ui_surfaces: [
      {
        id: "surface-dashboard",
        source: SOURCE,
        name: "Dashboard",
        kind: "route",
        locator: "/dashboard",
        renderability: "rendered",
        files: ["src/dashboard.tsx"],
        classification: { layout_shape: "tracker", density: "compressed" },
        signals: { dominant_components: ["Button"] },
      },
    ],
  };
}

describe("buildFingerprintViewerHtml", () => {
  it("renders profile values, decisions, checks, map data, and survey evidence", () => {
    const html = buildFingerprintViewerHtml({
      fingerprint: FINGERPRINT,
      sourcePath: "/repo/.ghost/fingerprint/profile.md",
      generatedAt: "2026-05-07T13:00:00.000Z",
      surveySummary: summarizeSurvey(survey()),
      surveyBudget: "standard",
      map: MAP,
      checks: CHECKS,
      artifacts: [
        { name: "profile.md", state: "included" },
        { name: "survey.json", state: "included" },
        { name: "map.md", state: "included" },
        { name: "checks.yml", state: "included" },
      ],
    });

    expect(html).toContain("sample-ds");
    expect(html).toContain("#00d64f");
    expect(html).toContain("color-strategy");
    expect(html).toContain("No red primary buttons");
    expect(html).toContain("--color-accent");
    expect(html).toContain("Button");
    expect(html).toContain("Dashboard");
    expect(html).toContain("src/components/ui");
  });

  it("escapes profile and survey strings before rendering", () => {
    const html = buildFingerprintViewerHtml({
      fingerprint: {
        ...FINGERPRINT,
        signature: "<script>alert(1)</script>",
        decisions: [
          {
            dimension: "unsafe",
            decision: "<img src=x onerror=alert(1)>",
            evidence: ["<svg onload=alert(1)>"],
          },
        ],
      },
      surveySummary: summarizeSurvey({
        ...survey(),
        components: [
          {
            id: "component-unsafe",
            source: SOURCE,
            name: "<script>bad()</script>",
            discovered_via: "fixture",
          },
        ],
      }),
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>bad()</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("renders warnings for missing optional artifacts", () => {
    const html = buildFingerprintViewerHtml({
      fingerprint: FINGERPRINT,
      artifacts: [
        { name: "profile.md", state: "included" },
        {
          name: "survey.json",
          state: "missing",
          message: "Optional survey.json not found.",
        },
      ],
      warnings: ["Optional survey.json not found."],
    });

    expect(html).toContain("Optional survey.json not found.");
    expect(html).toContain("missing");
    expect(html).toContain("No survey summary was included.");
  });
});
