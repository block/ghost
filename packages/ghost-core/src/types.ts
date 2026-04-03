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
  analysis: boolean;
}

export interface GhostConfig {
  designSystems: DesignSystemConfig[];
  scan: ScanOptions;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
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

export interface DesignSystemReport {
  designSystem: string;
  values: ValueDrift[];
  structure: StructureDrift[];
}

export interface DriftReport {
  timestamp: string;
  systems: DesignSystemReport[];
  summary: DriftSummary;
}
