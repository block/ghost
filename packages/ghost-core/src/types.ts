// --- Registry types (mirrors shadcn registry schema) ---

export interface Registry {
  $schema?: string;
  name: string;
  homepage?: string;
  items: RegistryItem[];
}

export interface RegistryItem {
  name: string;
  type: "registry:ui" | "registry:style" | "registry:lib";
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  categories?: string[];
}

export interface RegistryFile {
  path: string;
  content?: string;
  type: string;
  target: string;
}

export interface ResolvedRegistry {
  name: string;
  homepage?: string;
  items: RegistryItem[];
  tokens: CSSToken[];
}

// --- Token types ---

export type TokenCategory =
  | "background"
  | "border"
  | "text"
  | "shadow"
  | "radius"
  | "spacing"
  | "typography"
  | "animation"
  | "color"
  | "font"
  | "chart"
  | "sidebar"
  | "other";

export interface CSSToken {
  name: string;
  value: string;
  resolvedValue?: string;
  selector: string;
  category: TokenCategory;
}

// --- Config types ---

export type RuleSeverity = "error" | "warn" | "off";

export interface DesignSystemConfig {
  name: string;
  registry: string;
  componentDir: string;
  styleEntry: string;
}

export interface ScanOptions {
  values: boolean;
  structure: boolean;
  visual: boolean;
  analysis: boolean;
}

export interface VisualScanConfig {
  threshold?: number;
  viewport?: { width: number; height: number };
  timeout?: number;
  outputDir?: string;
}

export interface GhostConfig {
  parent?: ParentSource;
  designSystems?: DesignSystemConfig[];
  scan: ScanOptions;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
  visual?: VisualScanConfig;
  llm?: LLMConfig;
  embedding?: EmbeddingConfig;
  extractors?: string[];
}

// --- Fingerprint types ---

export interface SemanticColor {
  role: string;
  value: string;
  oklch?: [number, number, number];
}

export interface ColorRamp {
  steps: string[];
  count: number;
}

export interface DesignFingerprint {
  id: string;
  source: "registry" | "extraction" | "llm";
  timestamp: string;

  palette: {
    dominant: SemanticColor[];
    neutrals: ColorRamp;
    semantic: SemanticColor[];
    saturationProfile: "muted" | "vibrant" | "mixed";
    contrast: "high" | "moderate" | "low";
  };

  spacing: {
    scale: number[];
    regularity: number;
    baseUnit: number | null;
  };

  typography: {
    families: string[];
    sizeRamp: number[];
    weightDistribution: Record<number, number>;
    lineHeightPattern: "tight" | "normal" | "loose";
  };

  surfaces: {
    borderRadii: number[];
    shadowComplexity: "none" | "subtle" | "layered";
    borderUsage: "minimal" | "moderate" | "heavy";
  };

  architecture: {
    tokenization: number;
    methodology: string[];
    componentCount: number;
    componentCategories: Record<string, number>;
    namingPattern: string;
  };

  embedding: number[];
}

// --- Extractor types ---

export interface ExtractedFile {
  path: string;
  content: string;
  type: "css" | "scss" | "tailwind-config" | "component" | "config" | "other";
}

export interface ExtractedMaterial {
  styleFiles: ExtractedFile[];
  componentFiles: ExtractedFile[];
  configFiles: ExtractedFile[];
  metadata: {
    framework: string | null;
    componentLibrary: string | null;
    tokenCount: number;
    componentCount: number;
  };
}

export interface ExtractorOptions {
  ignore?: string[];
  maxFiles?: number;
  componentDir?: string;
  styleEntry?: string;
}

export interface Extractor {
  name: string;
  detect: (cwd: string) => Promise<boolean>;
  extract: (
    cwd: string,
    options?: ExtractorOptions,
  ) => Promise<ExtractedMaterial>;
}

// --- LLM types ---

export interface LLMConfig {
  provider: "anthropic" | "openai";
  model?: string;
  apiKey?: string;
}

export interface EmbeddingConfig {
  provider: "openai" | "voyage";
  model?: string;
  apiKey?: string;
}

export interface LLMProvider {
  name: string;
  interpret: (
    material: ExtractedMaterial,
    schema: string,
  ) => Promise<DesignFingerprint>;
}

// --- Parent / lineage types ---

export type ParentSource =
  | { type: "default" }
  | { type: "url"; url: string }
  | { type: "path"; path: string }
  | { type: "package"; name: string };

// --- History types ---

export interface FingerprintHistoryEntry {
  fingerprint: DesignFingerprint;
  parentRef?: ParentSource;
  comparisonToParent?: {
    distance: number;
    dimensions: Record<string, number>;
  };
}

// --- Sync / acknowledgment types ---

export type DimensionStance = "aligned" | "accepted" | "diverging";

export interface DimensionAck {
  distance: number;
  stance: DimensionStance;
  ackedAt: string;
  reason?: string;
}

export interface SyncManifest {
  parent: ParentSource;
  ackedAt: string;
  parentFingerprintId: string;
  childFingerprintId: string;
  dimensions: Record<string, DimensionAck>;
  overallDistance: number;
}

// --- Comparison types ---

export interface DimensionDelta {
  dimension: string;
  distance: number;
  description: string;
}

export interface FingerprintComparison {
  source: DesignFingerprint;
  target: DesignFingerprint;
  distance: number;
  dimensions: Record<string, DimensionDelta>;
  summary: string;
  vectors?: DriftVector[];
}

// --- Temporal / drift vector types ---

export interface DriftVector {
  dimension: string;
  magnitude: number;
  embeddingDelta: number[];
}

export interface DriftVelocity {
  dimension: string;
  rate: number;
  direction: "converging" | "diverging" | "stable";
  windowDays: number;
}

export interface TemporalComparison extends FingerprintComparison {
  velocity: DriftVelocity[];
  daysSinceAck: number | null;
  exceedsAckedBounds: boolean;
  exceedingDimensions: string[];
  trajectory: "converging" | "diverging" | "stable" | "oscillating";
}

// --- Fleet types ---

export interface FleetMember {
  id: string;
  fingerprint: DesignFingerprint;
  parentRef?: ParentSource;
  distanceToParent?: number;
}

export interface FleetPair {
  a: string;
  b: string;
  distance: number;
  dimensions: Record<string, number>;
}

export interface FleetCluster {
  memberIds: string[];
  centroid: number[];
}

export interface FleetComparison {
  members: FleetMember[];
  pairwise: FleetPair[];
  centroid: number[];
  spread: number;
  clusters?: FleetCluster[];
}

// --- Drift report types ---

export interface ValueDrift {
  token: string;
  rule: string;
  severity: RuleSeverity;
  message: string;
  registryValue?: string;
  consumerValue?: string;
  selector?: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface StructureDrift {
  component: string;
  rule: string;
  severity: RuleSeverity;
  message: string;
  diff?: string;
  linesAdded: number;
  linesRemoved: number;
  registryFile?: string;
  consumerFile?: string;
}

export interface DriftSummary {
  errors: number;
  warnings: number;
  info: number;
  componentsScanned: number;
  tokensScanned: number;
}

export interface VisualDrift {
  component: string;
  rule: string;
  severity: RuleSeverity;
  message: string;
  diffPercentage: number;
  threshold: number;
  registryFile?: string;
  consumerFile?: string;
  diffImagePath?: string;
  error?: string;
}

export interface DesignSystemReport {
  designSystem: string;
  values: ValueDrift[];
  structure: StructureDrift[];
  visual: VisualDrift[];
}

export interface DriftReport {
  timestamp: string;
  systems: DesignSystemReport[];
  summary: DriftSummary;
}
