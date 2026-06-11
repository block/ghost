export type WorkbenchScenarioKind = "context" | "review" | "cache";

export interface WorkbenchScenarioSummary {
  id: string;
  title: string;
  kicker: string;
  kind: WorkbenchScenarioKind;
  tags: string[];
  defaultTargetPaths: string[];
  hasDiff: boolean;
  promptSampleCount: number;
  driftSampleCount: number;
  fingerprintPackageCount: number;
  lesson: string;
}

export interface WorkbenchScenarioDetail extends WorkbenchScenarioSummary {
  description: string;
  repoTree: WorkbenchTreeNode[];
  promptSamples: WorkbenchPromptSample[];
  driftSamples: WorkbenchDriftSample[];
  defaultDiffText?: string;
}

export interface WorkbenchInspectionRequest {
  targetPaths?: string[];
  diffText?: string;
}

export interface WorkbenchInspectionResult {
  scenario: WorkbenchScenarioDetail;
  targetPaths: string[];
  diffText?: string;
  contexts: WorkbenchContextSection[];
  checkReport?: WorkbenchCheckReport;
  deterministic?: {
    repeated: boolean;
    equal: boolean;
  };
}

export interface WorkbenchPromptSample {
  id: string;
  title: string;
  prompt: string;
  intent: string;
  matchTerms: string[];
  targetPaths?: string[];
  diffPaths?: string[];
  expectedFocusRefs: string[];
  lesson: string;
}

export interface WorkbenchPromptLabRequest {
  promptSampleId?: string;
  promptText?: string;
  targetPaths?: string[];
  diffText?: string;
  runAI?: boolean;
}

export interface WorkbenchPromptLabResult {
  scenario: WorkbenchScenarioDetail;
  selectedSample?: WorkbenchPromptSample;
  interpretation: WorkbenchPromptInterpretation;
  inspection: WorkbenchInspectionResult;
  handoffMarkdown: string;
  runner: WorkbenchPromptRunnerState;
}

export interface WorkbenchPromptInterpretation {
  status: "sample-match" | "text-match" | "fallback";
  source: "explicit-sample" | "default-sample" | "freeform" | "fallback";
  promptText: string;
  intent: string;
  matchedTerms: string[];
  targetPaths: string[];
  diffText?: string;
  selectedSampleId?: string;
  expectedFocusRefs: string[];
  overrides: {
    targetPaths: boolean;
    diffText: boolean;
  };
  rationale: string[];
}

export interface WorkbenchPromptRunnerState {
  mode: "ai";
  state: "not_requested" | "not_configured" | "ok" | "error";
  provider?: WorkbenchAIProvider | "none";
  model?: string;
  message: string;
  generatedOutput: string | null;
  rawText?: string;
  latencyMs?: number;
  usage?: WorkbenchAIUsage;
}

export type WorkbenchAIRunState = WorkbenchPromptRunnerState;

export interface WorkbenchDriftSample {
  id: string;
  title: string;
  intent: string;
  diffText: string;
  expectedSignal:
    | "active-check-failure"
    | "advisory-only"
    | "multi-stack"
    | "pass"
    | "cache-caveat";
  expectedFocusRefs: string[];
  lesson: string;
}

export interface WorkbenchDriftDeskRequest {
  driftSampleId?: string;
  diffText?: string;
  includeAcceptedDecisions?: boolean;
}

export interface WorkbenchDriftDeskResult {
  scenario: WorkbenchScenarioDetail;
  selectedSample?: WorkbenchDriftSample;
  diffText: string;
  contexts: WorkbenchContextSection[];
  checkReport: WorkbenchCheckReport;
  reviewPacket: unknown;
  reviewPacketMarkdown: string;
  aiReview: WorkbenchAIReviewState;
  stance: WorkbenchStancePreview;
}

export interface WorkbenchFingerprintStudioResult {
  scenario: WorkbenchScenarioDetail;
  packages: WorkbenchFingerprintPackageSummary[];
  stackPreviews: WorkbenchFingerprintStackPreview[];
  lesson: string;
}

export interface WorkbenchFingerprintPackageSummary {
  packageDir: string;
  root: string;
  fingerprintDir: string;
  manifest: {
    schema: string;
    id: string;
  };
  product?: string;
  layers: WorkbenchFingerprintLayerView[];
  refs: WorkbenchFingerprintRefSummary[];
  health: WorkbenchFingerprintHealth;
  inventory: WorkbenchPackageInventory;
  decisions: {
    count: number;
    paths: string[];
  };
  counts: {
    scopes: number;
    prose: number;
    exemplars: number;
    composition: number;
    activeChecks: number;
    advisoryChecks: number;
  };
}

export interface WorkbenchFingerprintLayerView {
  id: "manifest" | "prose" | "inventory" | "composition" | "checks" | "intent";
  title: string;
  path: string;
  state: "present" | "missing";
  role:
    | "package-anchor"
    | "generation-input"
    | "deterministic-gate"
    | "human-context";
  raw?: string;
  note: string;
}

export interface WorkbenchFingerprintRefSummary {
  ref: string;
  group: "prose" | "inventory" | "composition" | "checks";
  kind: string;
  title: string;
  summary: string;
  sourceFile: string;
  packageDir: string;
  referenceCount: number;
  status?: "active" | "proposed" | "disabled";
  severity?: "critical" | "serious" | "nit";
}

export interface WorkbenchFingerprintHealth {
  status: "ok" | "warning" | "error";
  issues: Array<{
    source: "lint" | "verify";
    severity: "error" | "warning" | "info";
    rule: string;
    message: string;
    path?: string;
  }>;
}

export interface WorkbenchFingerprintStackPreview {
  id: string;
  title: string;
  targetPaths: string[];
  packageDirs: string[];
  localPackageDir: string;
  mergePolicy: "child-wins-by-id";
  mergedRefs: {
    prose: string[];
    inventory: string[];
    composition: string[];
    checks: string[];
  };
}

export type WorkbenchAIProvider =
  | "openai-compatible"
  | "anthropic"
  | "google"
  | "local-openai-compatible";

export interface WorkbenchAISettings {
  state: "configured" | "not_configured";
  provider: WorkbenchAIProvider;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  apiKeyConfigured: boolean;
  apiKeySource?: "workbench" | "alias" | "process";
  message: string;
  defaults: Array<{
    provider: WorkbenchAIProvider;
    label: string;
    model: string;
    baseUrl: string;
    requiresApiKey: boolean;
  }>;
}

export interface WorkbenchAISettingsUpdate {
  provider?: WorkbenchAIProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface WorkbenchAIConnectionTestResult {
  state: "ok" | "not_configured" | "error";
  provider: WorkbenchAIProvider | "none";
  model?: string;
  latencyMs?: number;
  message: string;
  rawText?: string;
}

export interface WorkbenchAIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface WorkbenchAIGenerationResult {
  mode: "ai";
  state: "not_configured" | "ok" | "error";
  provider: WorkbenchAIProvider | "none";
  model?: string;
  message: string;
  generatedOutput: string | null;
  rawText?: string;
  latencyMs?: number;
  usage?: WorkbenchAIUsage;
}

export interface WorkbenchVirtualPatch {
  source: "ai" | "drift-sample" | "diff-override";
  diffText: string;
  files: Array<{
    path: string;
    content: string;
    summary?: string;
  }>;
  notes: string[];
}

export interface WorkbenchAIProviderTrace {
  label: string;
  provider: WorkbenchAIProvider | "none";
  model?: string;
  state: "not_configured" | "ok" | "error";
  latencyMs?: number;
  message: string;
  jsonMode: boolean;
  usage?: WorkbenchAIUsage;
}

export interface WorkbenchAILoopRequest extends WorkbenchPromptLabRequest {
  driftSampleId?: string;
  includeAcceptedDecisions?: boolean;
}

export interface WorkbenchAILoopResult {
  scenario: WorkbenchScenarioDetail;
  promptLab: WorkbenchPromptLabResult;
  generation: WorkbenchAIGenerationResult;
  virtualPatch?: WorkbenchVirtualPatch;
  contexts: WorkbenchContextSection[];
  checkReport?: WorkbenchCheckReport;
  reviewPacket?: unknown;
  reviewPacketMarkdown?: string;
  aiReview?: WorkbenchAIReviewState;
  stance?: WorkbenchStancePreview;
  timeline: Array<{
    label: string;
    state: "ok" | "skipped" | "error";
    detail: string;
  }>;
  providerTrace: WorkbenchAIProviderTrace[];
}

export interface WorkbenchAdvisoryFinding {
  category:
    | "fix"
    | "intentional-divergence"
    | "missing-memory"
    | "experience-gap"
    | "eval-uncertainty";
  severity: "info" | "nit" | "serious" | "critical";
  title: string;
  path?: string;
  line?: number;
  message: string;
  evidence: string[];
  repair?: string;
}

export type WorkbenchAIReviewState =
  | {
      state: "not_configured";
      provider: "none";
      model?: string;
      message: string;
      findings: [];
      rawText?: string;
    }
  | {
      state: "ok";
      provider: WorkbenchAIProvider;
      model: string;
      message: string;
      findings: WorkbenchAdvisoryFinding[];
      rawText?: string;
    }
  | {
      state: "error";
      provider: WorkbenchAIProvider | "none";
      model?: string;
      message: string;
      findings: [];
      rawText?: string;
    };

export interface WorkbenchStancePreview {
  state: "preview-only";
  recommendation:
    | "repair-required"
    | "review-advisory"
    | "aligned"
    | "needs-human-stance";
  summary: string;
  blockingSignals: number;
  advisorySignals: number;
  disabledActions: Array<"ack" | "track" | "diverge">;
  writes: [];
}

export interface WorkbenchContextSection {
  id: string;
  title: string;
  packageDir?: string;
  changedFiles: string[];
  entrypoint: WorkbenchEntrypoint;
  markdown: string;
}

export interface WorkbenchEntrypoint {
  name: string;
  match: {
    status: "path-match" | "global-fallback";
    requestedPaths: string[];
    matchedScopes: string[];
    matchedSurfaceTypes: string[];
    sourceLayers: string[];
    reasons: string[];
  };
  identity: {
    product: string;
    audience: string[];
    goals: string[];
    antiGoals: string[];
    tradeoffs: string[];
    tone: string[];
  };
  selected: {
    prose: WorkbenchGraphNode[];
    composition: WorkbenchGraphNode[];
    exemplars: WorkbenchGraphNode[];
    checks: WorkbenchGraphNode[];
  };
  suggestedReads: Array<{ path: string; reason: string }>;
  omissions: Array<{ label: string; omitted: number; source: string }>;
  generatedCache: WorkbenchPackageInventory;
}

export interface WorkbenchGraphNode {
  ref: string;
  kind: string;
  summary: string;
  details: string[];
  appliesTo: {
    paths: string[];
    scopes: string[];
    surfaceTypes: string[];
  };
}

export type WorkbenchPackageInventory =
  | { state: "missing"; path: string }
  | {
      state: "present";
      path: string;
      summary: {
        root?: string;
        platform_hints: string[];
        build_system_hints: string[];
        language_histogram: Array<{ name: string; files: number }>;
        package_manifests: string[];
        candidate_config_files: string[];
        registry_files: string[];
        top_level_tree: Array<{
          path: string;
          kind: string;
          child_count: number;
        }>;
      };
    }
  | { state: "unreadable"; path: string; error: string };

export interface WorkbenchCheckReport {
  schema: "ghost.check-report/v1";
  result: "pass" | "fail";
  package_dir: string;
  fingerprint_dir?: string;
  changed_files: string[];
  routed_files: Array<{
    path: string;
    scopes: string[];
    checks: string[];
  }>;
  findings: Array<{
    check_id: string;
    title: string;
    severity: string;
    path: string;
    line: number;
    detector: string;
    message: string;
    repair?: string;
    match?: string;
  }>;
}

export interface WorkbenchTreeNode {
  path: string;
  name: string;
  kind: "file" | "directory";
  children?: WorkbenchTreeNode[];
}

export interface WorkbenchErrorResponse {
  error: {
    message: string;
  };
}
