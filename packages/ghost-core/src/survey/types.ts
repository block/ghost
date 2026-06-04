/**
 * Types for `ghost.survey/v1` — the observed evidence scan artifact.
 *
 * A survey is the middle artifact in a scan: produced after the map
 * (`map.md`) and before fingerprint synthesis (`fingerprint.md`). It
 * catalogues every concrete design value and implemented UI surface the
 * agent observed in a target, with structured specs and per-row
 * deterministic IDs.
 *
 * Merge semantics are concat-with-id-dedup. Two scans of the same target at
 * the same commit produce identical IDs, so re-merging is idempotent. Two
 * scans of different commits (or different targets) produce different IDs,
 * so cross-survey merges preserve every observation as its own row.
 */

/** Where a scan came from. Denormalized onto every row in the survey. */
export interface SurveySource {
  /** Stable source id within the scan source graph (`cash-ios`, `arcade-ios`, …). */
  id?: string;
  /**
   * Role this source played in the scan. `primary` supplies usage/salience;
   * `resolver` supplies concrete meaning for imported symbols.
   */
  role?: "primary" | "resolver";
  /** Target string the scan was pointed at — `github:owner/repo`, `./path`, etc. */
  target: string;
  /** Git commit sha at scan time, when knowable. */
  commit?: string;
  /** ISO 8601 timestamp the scan started. */
  scanned_at: string;
  /** Version of the scanner that produced this row. */
  scanner_version?: string;
  /** Design dimensions this source can resolve (`color`, `spacing`, …). */
  resolves?: string[];
}

/** Fields every row carries regardless of section. */
export interface RowBase {
  /** Deterministic hash of `(source.target, source.commit, kind-tag, content fields)`. */
  id: string;
  /** Source attribution. Denormalized so rows survive merges with their origin. */
  source: SurveySource;
}

// --- Value rows ----------------------------------------------------------

/**
 * Recommended value kinds. The survey schema treats `kind` as an open
 * string — scanners may emit additional kinds (e.g. `z-index`, `opacity`,
 * `cursor`, `gradient`, `iconography`) and validators warn rather than
 * reject. The recommended set covers the common cross-fleet vocabulary.
 */
export type RecommendedValueKind =
  | "color"
  | "spacing"
  | "typography"
  | "radius"
  | "shadow"
  | "breakpoint"
  | "motion"
  | "layout-primitive";

export interface ColorSpec {
  space: "srgb" | "p3" | "rec2020" | "lab" | "oklch" | "unknown";
  hex?: string;
  rgb?: { r: number; g: number; b: number; a?: number };
  hsl?: { h: number; s: number; l: number; a?: number };
}

export interface ScalarUnit {
  scalar: number;
  unit: string;
}

export interface SpacingSpec extends ScalarUnit {}
export interface RadiusSpec extends ScalarUnit {}
export interface BreakpointSpec extends ScalarUnit {
  label?: string;
}

export interface TypographySpec {
  family?: string;
  weight?: string | number;
  size?: ScalarUnit;
  line_height?: ScalarUnit | string;
  letter_spacing?: ScalarUnit;
}

export interface ShadowSpec {
  offset_x?: ScalarUnit;
  offset_y?: ScalarUnit;
  blur?: ScalarUnit;
  spread?: ScalarUnit;
  color?: string;
  inset?: boolean;
}

export interface MotionSpec {
  duration_ms?: number;
  easing?: string;
}

export interface LayoutPrimitiveSpec {
  /** Sub-kind: `max-width`, `container-padding`, `grid-track`, `gutter`, etc. Open. */
  kind: string;
  scalar?: number;
  unit?: string;
  raw?: string;
}

/** Fall-through for unknown / open-enum kinds. */
export type UnknownSpec = Record<string, unknown>;

export type ValueSpec =
  | ColorSpec
  | SpacingSpec
  | TypographySpec
  | RadiusSpec
  | ShadowSpec
  | BreakpointSpec
  | MotionSpec
  | LayoutPrimitiveSpec
  | UnknownSpec;

export interface Resolution {
  /** Whether this row resolved to a concrete value, or why it did not. */
  status: "resolved" | "unresolved-external" | "unresolved-local";
  /** Source id from survey.sources[] / map.sources[] that performed resolution. */
  source_id?: string;
  /** Resolver target, useful when the source id is unavailable. */
  target?: string;
  /** Symbol in the resolver source (`ArcadeColor.background`, `--color-bg`, …). */
  symbol?: string;
  /** Full symbolic chain followed during resolution. */
  chain?: string[];
  /** Human-readable note for unavailable resolver packages or partial coverage. */
  message?: string;
}

export interface ValueRow extends RowBase {
  /** One of `RecommendedValueKind` or an extension kind. Open string. */
  kind: string;
  /** Canonical string form (`#f97316`, `8px`, `Inter`). */
  value: string;
  /** As-it-appeared in source (`#F97316`, `bg-orange-500`, `var(--brand)`). */
  raw: string;
  /** Structured spec per kind. */
  spec?: ValueSpec;
  /** Total observed count of this value within this scan. */
  occurrences: number;
  /** Distinct files that contained this value. */
  files_count: number;
  /** Usage breakdown by context (`className`, `css_var`, `inline_style`, etc.). */
  usage?: Record<string, number>;
  /** Agent-assigned role guess (`brand-primary`, `surface-elevated`). */
  role_hypothesis?: string;
  /** Provenance for symbolic values resolved through another source. */
  resolution?: Resolution;
}

// --- Token rows ---------------------------------------------------------

export interface TokenRow extends RowBase {
  /** Token name as declared in source — e.g. `--color-brand-primary`. */
  name: string;
  /**
   * Resolution chain from this token to its terminal value. Empty array
   * means the token is a leaf (defined inline as a literal). Length > 0
   * means each step indirected through another named token.
   */
  alias_chain: string[];
  /** End-of-chain literal value. */
  resolved_value: string;
  /** Per-theme variants when the token resolves differently across themes. */
  by_theme?: Record<string, string>;
  /** Total observed usage count of this token within the scan. */
  occurrences: number;
  /** Provenance for symbolic tokens resolved through another source. */
  resolution?: Resolution;
}

// --- Component rows -----------------------------------------------------

export interface ComponentRow extends RowBase {
  name: string;
  /** Where the component was discovered — `registry.json`, `heuristic`, etc. */
  discovered_via: string;
  variants?: string[];
  sizes?: string[];
}

// --- UI surface rows ------------------------------------------------------

export type UiSurfaceKind =
  | "route"
  | "story"
  | "screen"
  | "fixture"
  | "doc-example"
  | "screenshot"
  | "source";

export type UiSurfaceRenderability =
  | "rendered"
  | "screenshot"
  | "source-only"
  | "unknown";

export type UiSurfaceDensity =
  | "compressed"
  | "standard"
  | "breathing"
  | "unknown";

export type UiSurfaceLayoutShape =
  | "article"
  | "tracker"
  | "comparison"
  | "card"
  | "control-surface"
  | "flow"
  | "navigation"
  | "unknown";

export interface UiSurfaceClassification {
  /** Open tag: what the surface is trying to do (`configure`, `onboard`, …). */
  intent?: string;
  /** Open tag: product-specific surface type (`settings`, `checkout`, …). */
  surface_type?: string;
  density?: UiSurfaceDensity;
  layout_shape?: UiSurfaceLayoutShape;
  /** Confidence in the optional classifier tags, not in the observed facts. */
  confidence?: number;
}

export interface UiSurfaceSignals {
  /** Component names that materially shape this surface. */
  dominant_components?: string[];
  /** Observed composition facts (`sectioned-form`, `left-nav`, …). */
  layout_patterns?: string[];
  /** Observed breakpoint behavior, when available. */
  breakpoint_behavior?: string[];
  /** IDs of value rows that are visibly load-bearing for this surface. */
  value_refs?: string[];
  /** Short factual notes; rationale belongs in patterns.yml or intent.md, not here. */
  notes?: string[];
}

export interface UiSurfaceComposition {
  /** Ordered factual anatomy (`shell`, `compact-header`, `filter-row`, `table`). */
  anatomy?: string[];
  /** Dominant region carrying the surface's work (`table`, `form`, `canvas`). */
  primary_region?: string;
  /** Where actions live relative to objects or regions. */
  action_placement?: string[];
  /** Navigation relationship (`persistent-shell`, `local-tabs`, `none`). */
  navigation_context?: string;
  /** Factual responsive behavior observed for this surface. */
  responsive_behavior?: string[];
  /** Confidence in the observed composition facts, not in interpretation. */
  confidence?: number;
}

export interface UiSurfaceRow extends RowBase {
  name: string;
  kind: UiSurfaceKind;
  /** Route path, story id, screenshot path, fixture id, or source locator. */
  locator: string;
  renderability: UiSurfaceRenderability;
  files: string[];
  classification?: UiSurfaceClassification;
  composition?: UiSurfaceComposition;
  signals: UiSurfaceSignals;
}

// --- Survey --------------------------------------------------------------

export interface Survey {
  schema: "ghost.survey/v1";
  /**
   * Source(s) the survey came from. Always an array — pre-merge surveys
   * have length 1, merged surveys have N entries (one per source scan).
   */
  sources: SurveySource[];
  values: ValueRow[];
  tokens: TokenRow[];
  components: ComponentRow[];
  ui_surfaces: UiSurfaceRow[];
}
