// --- Target system ---

export type TargetType =
  | "path"
  | "url"
  | "registry"
  | "npm"
  | "github"
  | "figma"
  | "doc-site";

export interface TargetOptions {
  branch?: string;
  crawlDepth?: number;
  figmaToken?: string;
}

export interface Target {
  type: TargetType;
  value: string;
  name?: string;
  options?: TargetOptions;
}

// --- Registry types (mirrors shadcn registry schema) ---

export type RegistryItemType =
  | "registry:ui"
  | "registry:style"
  | "registry:lib"
  | "registry:base"
  | "registry:font"
  | "registry:block"
  | "registry:component"
  | "registry:hook"
  | "registry:theme"
  | "registry:file"
  | "registry:page"
  | "registry:item";

export interface FontDescriptor {
  family: string;
  provider: string;
  import: string;
  variable: string;
  weight?: string[];
  subsets?: string[];
  selector?: string;
  dependency?: string;
}

export interface CSSVarsMap {
  theme?: Record<string, string>;
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

export interface Registry {
  $schema?: string;
  name: string;
  homepage?: string;
  items: RegistryItem[];
}

export interface RegistryItem {
  name: string;
  type: RegistryItemType;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  categories?: string[];
  // v4 fields
  font?: FontDescriptor;
  cssVars?: CSSVarsMap;
  css?: string;
  meta?: Record<string, unknown>;
  title?: string;
  description?: string;
  author?: string;
}

export interface ComponentMeta {
  name: string;
  description?: string;
  categories: string[];
  exports: string[];
  variants: { name: string; options: string[] }[];
  dataSlots: string[];
  dependencies: string[];
  registryDependencies: string[];
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
  | "font-face"
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

// --- Format detection ---

export type TokenFormat =
  | "css-custom-properties"
  | "tailwind-config"
  | "style-dictionary"
  | "w3c-design-tokens"
  | "shadcn-registry"
  | "figma-variables"
  | "unknown";

export interface DetectedFormat {
  format: TokenFormat;
  confidence: number;
  evidence: string;
  files: string[];
}

export interface NormalizedToken extends CSSToken {
  originalFormat: TokenFormat;
  sourceFile?: string;
}

// --- Config types ---

export type RuleSeverity = "error" | "warn" | "off";

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
  targets?: Target[];
  parent?: Target;
  scan: ScanOptions;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
  visual?: VisualScanConfig;
  llm?: LLMConfig;
  embedding?: EmbeddingConfig;
  extractors?: string[];
  agents?: AgentsConfig;
}

export interface AgentsConfig {
  maxIterations?: number;
  verbose?: boolean;
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

export type Platform = "web" | "ios" | "android" | "multiplatform";

export interface DesignFingerprint {
  id: string;
  source: "registry" | "extraction" | "llm";
  timestamp: string;
  platform?: Platform;

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
    borderTokenCount?: number;
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

// --- Sampled material (LLM-first pipeline) ---

export interface SampledFile {
  path: string;
  content: string;
  reason: string;
}

export interface SampledMaterial {
  files: SampledFile[];
  metadata: {
    totalFiles: number;
    sampledFiles: number;
    targetType: TargetType;
    detectedPlatform?: Platform;
    packageJson?: {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    packageSwift?: {
      name?: string;
      dependencies?: string[];
    };
  };
}

// --- AI enrichment types ---

export interface DesignLanguageProfile {
  summary: string;
  personality: string[];
  closestKnownSystems: string[];
}

export interface EnrichedFingerprint extends DesignFingerprint {
  languageProfile?: DesignLanguageProfile;
  detectedFormats?: DetectedFormat[];
  targetType: TargetType;
}

export type DivergenceClass =
  | "accidental-drift"
  | "intentional-variant"
  | "evolution-lag"
  | "incompatible";

export interface EnrichedComparison extends FingerprintComparison {
  classification: DivergenceClass;
  explanations: Record<string, string>;
}

// --- Extractor types ---

export interface ExtractedFile {
  path: string;
  content: string;
  type:
    | "css"
    | "scss"
    | "tailwind-config"
    | "component"
    | "config"
    | "json-tokens"
    | "style-dictionary"
    | "w3c-tokens"
    | "figma-variables"
    | "documentation"
    | "swift"
    | "xcassets"
    | "xcconfig"
    | "other";
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
    targetType?: TargetType;
    detectedFormats?: DetectedFormat[];
    sourceUrl?: string;
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
    material: SampledMaterial,
    projectId: string,
  ) => Promise<DesignFingerprint>;
  /** Multi-turn chat with tool use support. Optional — only needed for agentic fingerprinting. */
  chat?: (
    messages: import("./agents/tools/types.js").ChatMessage[],
    tools?: import("./agents/tools/types.js").ToolDefinition[],
  ) => Promise<import("./agents/tools/types.js").ChatResponse>;
}

// --- Agent types ---

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  llm: LLMConfig;
  embedding?: EmbeddingConfig;
  verbose?: boolean;
  onMessage?: (msg: AgentMessage) => void;
}

export interface AgentResult<T> {
  data: T;
  confidence: number;
  warnings: string[];
  reasoning: string[];
  iterations: number;
  duration: number;
}

// --- History types ---

export interface FingerprintHistoryEntry {
  fingerprint: DesignFingerprint;
  parentRef?: Target;
  comparisonToParent?: {
    distance: number;
    dimensions: Record<string, number>;
  };
}

// --- Sync / acknowledgment types ---

export type DimensionStance =
  | "aligned"
  | "accepted"
  | "diverging"
  | "reconverging";

export interface DimensionAck {
  distance: number;
  stance: DimensionStance;
  ackedAt: string;
  reason?: string;
  tolerance?: number;
  divergedAt?: string;
}

export interface SyncManifest {
  parent: Target;
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
  parentRef?: Target;
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
