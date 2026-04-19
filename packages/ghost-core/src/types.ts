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

export interface GhostConfig {
  targets?: Target[];
  parent?: Target;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
  llm?: LLMConfig;
  embedding?: EmbeddingConfig;
  extractors?: string[];
  agents?: AgentsConfig;
  review?: ReviewConfig;
}

export interface AgentsConfig {
  maxIterations?: number;
  verbose?: boolean;
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
  /** What makes this system visually distinctive */
  distinctiveTraits: string[];
  /** Closest well-known design systems for reference */
  closestSystems: string[];
}

export interface DesignDecision {
  /** Freeform dimension name — LLM chooses what's relevant (e.g. "color-strategy", "motion", "density") */
  dimension: string;
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

export interface DesignValues {
  /** Stances the system holds — "Do use warm neutrals." */
  do: string[];
  /** Stances the system rejects — "Don't mix sans-serif into headlines." */
  dont: string[];
}

/**
 * A semantic slot → token binding. Describes which concrete tokens a
 * design system uses for a specific role (h1, body, card, button, …).
 *
 * This is the bridge between abstract tokens (`typography.sizeRamp: [14, 16, …]`)
 * and renderable output: a role tells a renderer *which* ramp step belongs to
 * *which* slot. All subfields are optional — the agent populates only what it
 * can infer from the source.
 */
export interface DesignRole {
  /** Semantic slot name — "h1", "body", "card", "button", "input", "list-row", etc. */
  name: string;
  /** Tokens the slot binds, grouped by expression dimension. */
  tokens: {
    typography?: {
      family?: string;
      size?: number;
      weight?: number;
      lineHeight?: number;
    };
    spacing?: {
      padding?: number;
      gap?: number;
      margin?: number;
    };
    surfaces?: {
      borderRadius?: number;
      shadow?: "none" | "subtle" | "layered";
      borderWidth?: number;
    };
    palette?: {
      background?: string;
      foreground?: string;
      border?: string;
    };
  };
  /** Evidence from the source — file paths or file:line references. */
  evidence: string[];
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
  /**
   * Layer 3 (stance): the Do's and Don'ts — what the system refuses. Sourced
   * from `# Values` in an expression.md; consumed by `ghost review` to cite
   * rule names when flagging violations.
   */
  values?: DesignValues;

  /**
   * Semantic slot → token bindings. The bridge from abstract tokens to
   * renderable output: each role names a slot ("h1", "card", "button") and
   * binds tokens from the dimensions below. Optional — agents populate only
   * roles they can infer from the source.
   */
  roles?: DesignRole[];

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
    shadowComplexity: "none" | "subtle" | "layered";
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
  /** Multi-turn chat with tool use support. All expression generation flows through this. */
  chat: (
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
  /** Override the agent's default max iterations (escape hatch) */
  maxIterations?: number;
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

export interface ExpressionHistoryEntry {
  expression: Expression;
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
  parentExpressionId: string;
  childExpressionId: string;
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

// --- Fleet types ---

export interface FleetMember {
  id: string;
  expression: Expression;
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

// --- Review types (expression-informed design review) ---

export type ReviewSeverity = "error" | "warning" | "info";

export type ReviewDimension = "palette" | "spacing" | "typography" | "surfaces";

export interface ReviewFix {
  /** Replacement text for the affected line */
  replacement: string;
  /** Explanation of what the fix does */
  description: string;
}

export interface ReviewIssue {
  /** Rule that produced this issue (e.g. "palette-drift", "spacing-drift") */
  rule: string;
  /** Which expression dimension drifted */
  dimension: ReviewDimension;
  severity: ReviewSeverity;
  /** Human-readable description */
  message: string;
  /** File path (relative to cwd) */
  file: string;
  /** 1-based line number */
  line: number;
  /** 1-based column */
  column?: number;
  /** The original source line */
  source?: string;
  /** The literal value found (e.g. "#3b82f6", "14px") */
  found: string;
  /** Nearest expression value (e.g. "#2563eb", "16px") */
  nearest?: string;
  /** Semantic role of the nearest value if known (e.g. "primary", "surface") */
  nearestRole?: string;
  /** How far off (0-1 for colors via OKLCH distance, absolute px for spacing/typography/surfaces) */
  distance?: number;
  /** Concrete fix suggestion */
  fix?: ReviewFix;
  /** How this issue was detected */
  phase: "match" | "deep";
}

export interface ReviewFileResult {
  file: string;
  issues: ReviewIssue[];
  /** Whether this file was sent for deep LLM review */
  deepReviewed: boolean;
}

export interface ReviewSummary {
  filesScanned: number;
  filesWithIssues: number;
  totalIssues: number;
  byDimension: Record<string, number>;
  errors: number;
  warnings: number;
  fixesAvailable: number;
}

export interface ReviewReport {
  timestamp: string;
  /** ID of the expression used as baseline */
  expression: string;
  files: ReviewFileResult[];
  summary: ReviewSummary;
  /** Duration in ms */
  duration: number;
}

export interface ReviewConfig {
  /** Which dimensions to check */
  dimensions?: {
    palette?: boolean;
    spacing?: boolean;
    typography?: boolean;
    surfaces?: boolean;
  };
  /** Only review files matching these globs */
  include?: string[];
  /** Ignore files matching these globs */
  exclude?: string[];
  /** Only report issues on changed lines (requires git diff context). Default: true */
  changedLinesOnly?: boolean;
}

export interface CollectedFile {
  path: string;
  content: string;
  /** Lines changed in the diff (1-based). Undefined = all lines are "changed". */
  changedLines?: Set<number>;
}
