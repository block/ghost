/**
 * Generate pre-baked JSON fixtures for the Ghost Playground UI.
 *
 * Run: pnpm tsx packages/ghost-core/scripts/generate-demo-fixtures.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { compareFingerprints } from "../src/fingerprint/compare.js";
import { computeEmbedding } from "../src/fingerprint/embedding.js";
import { fingerprintFromRegistry } from "../src/fingerprint/from-registry.js";
import { compareFleet } from "../src/evolution/fleet.js";
import { computeTemporalComparison } from "../src/evolution/temporal.js";
import { resolveRegistry } from "../src/resolvers/registry.js";
import { scan } from "../src/scan.js";
import type {
  DesignFingerprint,
  FleetMember,
  FingerprintHistoryEntry,
  GhostConfig,
} from "../src/types.js";

const REGISTRY_PATH = resolve(__dirname, "../test/fixtures/registry/registry.json");
const DRIFTED_DIR = resolve(__dirname, "../test/fixtures/consumer-drifted");
const OUTPUT_DIR = resolve(__dirname, "../../ghost-ui/src/data/playground");

mkdirSync(OUTPUT_DIR, { recursive: true });

function write(name: string, data: unknown) {
  const path = resolve(OUTPUT_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`  wrote ${name}`);
}

async function main() {
  console.log("Generating playground fixtures...\n");

  // 1. Registry fingerprint
  const registry = await resolveRegistry(REGISTRY_PATH);
  const registryFp = fingerprintFromRegistry(registry);
  write("registry-fingerprint.json", registryFp);

  // 2. Consumer fingerprint (simulate drift)
  const consumerFp = makeDriftedConsumer(registryFp);
  write("consumer-fingerprint.json", consumerFp);

  // 3. Comparison
  const comparison = compareFingerprints(registryFp, consumerFp, {
    includeVectors: true,
  });
  // Serialize without circular refs (source/target are full fingerprints)
  const comparisonOutput = {
    distance: comparison.distance,
    dimensions: comparison.dimensions,
    summary: comparison.summary,
    vectors: comparison.vectors,
    sourceId: comparison.source.id,
    targetId: comparison.target.id,
  };
  write("comparison.json", comparisonOutput);

  // 4. Fleet comparison
  const fleetMembers: FleetMember[] = [
    { id: "registry", fingerprint: registryFp },
    { id: "consumer", fingerprint: consumerFp },
    { id: "mobile-app", fingerprint: makeMobileVariant(registryFp) },
    { id: "marketing-site", fingerprint: makeMarketingVariant(registryFp) },
  ];
  const fleet = compareFleet(fleetMembers, { cluster: true });
  const fleetOutput = {
    members: fleet.members.map((m) => ({ id: m.id })),
    pairwise: fleet.pairwise,
    centroid: fleet.centroid,
    spread: fleet.spread,
    clusters: fleet.clusters,
  };
  write("fleet.json", fleetOutput);

  // 5. Temporal comparison (mock history)
  const history = buildMockHistory(registryFp, consumerFp);
  const temporal = computeTemporalComparison({
    comparison,
    history,
    manifest: {
      parent: { type: "default" },
      ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      parentFingerprintId: registryFp.id,
      childFingerprintId: consumerFp.id,
      dimensions: {
        palette: { distance: 0.05, stance: "accepted", ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        spacing: { distance: 0.02, stance: "accepted", ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        typography: { distance: 0.01, stance: "aligned", ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        surfaces: { distance: 0.03, stance: "accepted", ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        architecture: { distance: 0.0, stance: "aligned", ackedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
      },
      overallDistance: 0.03,
    },
  });
  const temporalOutput = {
    distance: temporal.distance,
    dimensions: temporal.dimensions,
    summary: temporal.summary,
    velocity: temporal.velocity,
    daysSinceAck: temporal.daysSinceAck,
    exceedsAckedBounds: temporal.exceedsAckedBounds,
    exceedingDimensions: temporal.exceedingDimensions,
    trajectory: temporal.trajectory,
    vectors: temporal.vectors,
  };
  write("temporal.json", temporalOutput);

  // 6. Scan report
  const scanConfig: GhostConfig = {
    designSystems: [
      {
        name: "test-ds",
        registry: REGISTRY_PATH,
        componentDir: "components/ui",
        styleEntry: resolve(DRIFTED_DIR, "src/styles/main.css"),
      },
    ],
    scan: { values: true, structure: true, visual: false, analysis: false },
    rules: {
      "hardcoded-color": "error",
      "token-override": "warn",
      "missing-token": "warn",
      "structural-divergence": "error",
      "missing-component": "warn",
    },
    ignore: [],
  };
  const scanReport = await scan(scanConfig, DRIFTED_DIR);
  write("scan-report.json", scanReport);

  console.log("\nDone! Fixtures written to:", OUTPUT_DIR);
}

// --- Variant factories ---

function makeDriftedConsumer(base: DesignFingerprint): DesignFingerprint {
  const drifted: Omit<DesignFingerprint, "embedding"> = {
    ...structuredClone(base),
    id: "consumer",
    timestamp: new Date().toISOString(),
    palette: {
      ...base.palette,
      dominant: [
        { role: "accent", value: "#e74c3c", oklch: [0.589, 0.227, 27.3] },
      ],
      saturationProfile: "vibrant",
    },
    spacing: {
      scale: [4, 8, 12, 16, 20, 24, 32, 48, 64, 96],
      regularity: 0.5,
      baseUnit: 4,
    },
    surfaces: {
      borderRadii: [4, 8, 16, 24],
      shadowComplexity: "layered",
      borderUsage: "moderate",
    },
  };
  return { ...drifted, embedding: computeEmbedding(drifted) };
}

function makeMobileVariant(base: DesignFingerprint): DesignFingerprint {
  const variant: Omit<DesignFingerprint, "embedding"> = {
    ...structuredClone(base),
    id: "mobile-app",
    timestamp: new Date().toISOString(),
    spacing: {
      scale: [4, 8, 16, 24, 32],
      regularity: 1,
      baseUnit: 4,
    },
    typography: {
      ...base.typography,
      families: ["SF Pro", "monospace"],
      sizeRamp: [11, 13, 15, 17, 22, 28],
    },
    surfaces: {
      borderRadii: [8, 12, 16],
      shadowComplexity: "subtle",
      borderUsage: "minimal",
    },
    architecture: {
      ...base.architecture,
      componentCount: 25,
      methodology: ["swift-ui", "css-custom-properties"],
    },
  };
  return { ...variant, embedding: computeEmbedding(variant) };
}

function makeMarketingVariant(base: DesignFingerprint): DesignFingerprint {
  const variant: Omit<DesignFingerprint, "embedding"> = {
    ...structuredClone(base),
    id: "marketing-site",
    timestamp: new Date().toISOString(),
    palette: {
      ...base.palette,
      dominant: [
        { role: "accent", value: "#8b5cf6", oklch: [0.541, 0.243, 293.5] },
        { role: "secondary", value: "#06b6d4", oklch: [0.715, 0.143, 204.6] },
      ],
      saturationProfile: "vibrant",
    },
    typography: {
      ...base.typography,
      families: ["Playfair Display", "Inter"],
      lineHeightPattern: "loose",
    },
    architecture: {
      ...base.architecture,
      componentCount: 8,
      componentCategories: { layout: 2, display: 3, marketing: 3 },
    },
  };
  return { ...variant, embedding: computeEmbedding(variant) };
}

function buildMockHistory(
  source: DesignFingerprint,
  target: DesignFingerprint,
): FingerprintHistoryEntry[] {
  // Simulate 3 snapshots over 30 days, drifting gradually
  const now = Date.now();
  const entries: FingerprintHistoryEntry[] = [];

  for (let i = 0; i < 3; i++) {
    const t = i / 2; // 0, 0.5, 1.0 interpolation
    const ts = new Date(now - (30 - i * 15) * 24 * 60 * 60 * 1000).toISOString();

    const interpolated: Omit<DesignFingerprint, "embedding"> = {
      ...structuredClone(source),
      id: `snapshot-${i}`,
      timestamp: ts,
      spacing: {
        scale: i === 0 ? source.spacing.scale : target.spacing.scale,
        regularity: source.spacing.regularity + t * (target.spacing.regularity - source.spacing.regularity),
        baseUnit: source.spacing.baseUnit,
      },
      surfaces: {
        ...source.surfaces,
        shadowComplexity: i >= 2 ? target.surfaces.shadowComplexity : source.surfaces.shadowComplexity,
      },
    };

    entries.push({
      fingerprint: { ...interpolated, embedding: computeEmbedding(interpolated) },
      parentRef: { type: "default" },
    });
  }

  return entries;
}

main().catch(console.error);
