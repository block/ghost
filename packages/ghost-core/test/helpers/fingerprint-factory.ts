import { computeEmbedding } from "../../src/fingerprint/embedding.js";
import type {
  DesignFingerprint,
  FleetMember,
  FingerprintHistoryEntry,
  ParentSource,
} from "../../src/types.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const DEFAULT_FINGERPRINT: Omit<DesignFingerprint, "embedding"> = {
  id: "test-fp",
  source: "registry",
  timestamp: "2025-01-15T12:00:00.000Z",

  palette: {
    dominant: [
      { role: "accent", value: "#3b82f6", oklch: [0.623, 0.214, 259.8] },
    ],
    neutrals: { steps: ["#ffffff", "#f5f5f5", "#e5e5e5", "#737373", "#171717", "#000000"], count: 6 },
    semantic: [
      { role: "surface", value: "#ffffff", oklch: [1, 0, 0] },
      { role: "text", value: "#171717", oklch: [0.147, 0, 0] },
      { role: "border", value: "#e5e5e5", oklch: [0.922, 0, 0] },
      { role: "accent", value: "#3b82f6", oklch: [0.623, 0.214, 259.8] },
    ],
    saturationProfile: "mixed",
    contrast: "high",
  },

  spacing: {
    scale: [4, 8, 12, 16, 24, 32, 48, 64],
    regularity: 0.5,
    baseUnit: 4,
  },

  typography: {
    families: ["Inter", "monospace"],
    sizeRamp: [12, 14, 16, 18, 24, 32],
    weightDistribution: { 400: 3, 500: 2, 700: 1 },
    lineHeightPattern: "normal",
  },

  surfaces: {
    borderRadii: [4, 8, 12],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },

  architecture: {
    tokenization: 0.85,
    methodology: ["css-custom-properties", "tailwind"],
    componentCount: 12,
    componentCategories: { layout: 3, input: 4, display: 5 },
    namingPattern: "kebab-case",
  },
};

export function makeFingerprint(
  overrides?: DeepPartial<DesignFingerprint>,
): DesignFingerprint {
  const merged = deepMerge(
    structuredClone(DEFAULT_FINGERPRINT),
    overrides ?? {},
  ) as Omit<DesignFingerprint, "embedding">;

  return {
    ...merged,
    embedding: computeEmbedding(merged),
  };
}

export function makeDriftedFingerprint(
  base: DesignFingerprint,
  dimensionOverrides: DeepPartial<DesignFingerprint>,
): DesignFingerprint {
  const merged = deepMerge(
    structuredClone(base),
    dimensionOverrides,
  ) as Omit<DesignFingerprint, "embedding">;

  return {
    ...merged,
    embedding: computeEmbedding(merged),
  };
}

export function makeFleetMember(
  id: string,
  overrides?: DeepPartial<DesignFingerprint>,
): FleetMember {
  return {
    id,
    fingerprint: makeFingerprint({ id, ...overrides }),
  };
}

export function makeHistoryEntry(
  fingerprint: DesignFingerprint,
  parentRef?: ParentSource,
): FingerprintHistoryEntry {
  return {
    fingerprint,
    parentRef,
  };
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      target[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      );
    } else {
      target[key] = sv;
    }
  }
  return target;
}
