// --- Target ---

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

export interface GhostConfig {
  targets?: Target[];
  tracks?: Target;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
  embedding?: EmbeddingConfig;
  extractors?: string[];
}

// --- Expression types ---

export interface SemanticColor {
  role: string;
  value: string;
  oklch?: [number, number, number];
}

export interface ColorRamp {
  steps: string[];
  count: number;
}

// --- Observation & decision types (three-layer expression) ---

export interface DesignObservation {
  /** Holistic summary of the design language */
  summary: string;
  /** Personality traits (e.g. "utilitarian", "restrained", "playful") */
  personality: string[];
  /** What makes this expression visually distinctive */
  distinctiveTraits: string[];
  /** Closest well-known design languages for reference */
  resembles: string[];
}

export interface DesignDecision {
  /** Freeform dimension name — LLM chooses what's relevant (e.g. "color-strategy", "motion", "density") */
  dimension: string;
  /**
   * Optional canonical bucket this decision rolls up under. When present,
   * fleet-aggregation primitives group by this value. When absent, they
   * fall back to `dimension` if it happens to be canonical, otherwise the
   * decision is treated as long-tail.
   *
   * Authoring rule (see `closestCanonical` in `@ghost/core`): when
   * `dimension` itself is one of `CANONICAL_DECISION_DIMENSIONS`, omit
   * `dimension_kind`. Set it only when you've chosen a project-flavored
   * slug that's better described by an existing canonical bucket.
   */
  dimension_kind?: string;
  /** The decision stated abstractly, implementation-agnostic */
  decision: string;
  /** Evidence from the source code supporting this decision */
  evidence: string[];
  /**
   * Semantic embedding of `${dimension}: ${decision}`.
   * Computed at profile time when an embedding provider is configured,
   * and used by compareDecisions for paraphrase-robust matching.
   */
  embedding?: number[];
}

export interface Expression {
  id: string;
  source: "registry" | "extraction" | "llm" | "unknown";
  timestamp: string;
  /** When profiled from multiple sources, lists what was combined */
  sources?: string[];

  // --- Three-layer model: observation → decisions → values ---

  /** Layer 1: Holistic read of the design language */
  observation?: DesignObservation;
  /** Layer 2: Abstract design decisions, implementation-agnostic */
  decisions?: DesignDecision[];

  // --- Layer 3: Concrete values ---

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
    shadowComplexity: "deliberate-none" | "subtle" | "layered";
    borderUsage: "minimal" | "moderate" | "heavy";
    borderTokenCount?: number;
  };

  embedding: number[];
}

// --- Sampled material (LLM-first pipeline) ---

export interface SampledFile {
  path: string;
  content: string;
  reason: string;
  /** Which source this file came from (multi-source profiling) */
  sourceLabel?: string;
}

export interface SourceInfo {
  label: string;
  targetType: TargetType;
  fileCount: number;
  sampledCount: number;
}

export interface SampledMaterial {
  files: SampledFile[];
  metadata: {
    totalFiles: number;
    sampledFiles: number;
    targetType: TargetType;
    /** When profiled from multiple sources, per-source breakdown */
    sources?: SourceInfo[];
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

export interface EnrichedExpression extends Expression {
  detectedFormats?: DetectedFormat[];
  targetType: TargetType;
}

export type DivergenceClass =
  | "accidental-drift"
  | "intentional-variant"
  | "evolution-lag"
  | "incompatible";

export interface EnrichedComparison extends ExpressionComparison {
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

// --- Embedding config (used by the semantic-roles helper in embed-api.ts) ---

export interface EmbeddingConfig {
  provider: "openai" | "voyage";
  model?: string;
  apiKey?: string;
}

// --- History types ---

export interface ExpressionHistoryEntry {
  expression: Expression;
  trackedRef?: Target;
  comparisonToTracked?: {
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
  tracks: Target;
  ackedAt: string;
  trackedExpressionId: string;
  localExpressionId: string;
  dimensions: Record<string, DimensionAck>;
  overallDistance: number;
}

// --- Comparison types ---

export interface DimensionDelta {
  dimension: string;
  distance: number;
  description: string;
}

export interface ExpressionComparison {
  source: Expression;
  target: Expression;
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

export interface TemporalComparison extends ExpressionComparison {
  velocity: DriftVelocity[];
  daysSinceAck: number | null;
  exceedsAckedBounds: boolean;
  exceedingDimensions: string[];
  trajectory: "converging" | "diverging" | "stable" | "oscillating";
}

// --- Composite types (N≥3 expression comparison) ---

export interface CompositeMember {
  id: string;
  expression: Expression;
  trackedRef?: Target;
  distanceToTracked?: number;
}

export interface CompositePair {
  a: string;
  b: string;
  distance: number;
  dimensions: Record<string, number>;
}

export interface CompositeCluster {
  memberIds: string[];
  centroid: number[];
}

export interface CompositeComparison {
  members: CompositeMember[];
  pairwise: CompositePair[];
  centroid: number[];
  spread: number;
  clusters?: CompositeCluster[];
}

// --- Drift report types ---

export interface ValueDrift {
  token: string;
  rule: string;
  severity: RuleSeverity;
  message: string;
  expressionValue?: string;
  implementationValue?: string;
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
  expressionFile?: string;
  implementationFile?: string;
}
