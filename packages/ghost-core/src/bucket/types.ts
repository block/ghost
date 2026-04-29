/**
 * Types for `ghost.bucket/v1` — the objective scan artifact.
 *
 * A bucket is the middle artifact in a scan: produced after topology
 * (`map.md`) and before subjective interpretation (`expression.md`). It
 * catalogues every concrete design value the agent observed in a target,
 * with structured specs and per-row deterministic IDs.
 *
 * Merge semantics are concat-with-id-dedup. Two scans of the same target at
 * the same commit produce identical IDs, so re-merging is idempotent. Two
 * scans of different commits (or different targets) produce different IDs,
 * so cross-bucket merges preserve every observation as its own row.
 */

/** Where a scan came from. Denormalized onto every row in the bucket. */
export interface BucketSource {
  /** Target string the scan was pointed at — `github:owner/repo`, `./path`, etc. */
  target: string;
  /** Git commit sha at scan time, when knowable. */
  commit?: string;
  /** ISO 8601 timestamp the scan started. */
  scanned_at: string;
  /** Version of the scanner that produced this row. */
  scanner_version?: string;
}

/** Fields every row carries regardless of section. */
export interface RowBase {
  /** Deterministic hash of `(source.target, source.commit, kind-tag, content fields)`. */
  id: string;
  /** Source attribution. Denormalized so rows survive merges with their origin. */
  source: BucketSource;
}

// --- Value rows ----------------------------------------------------------

/**
 * Recommended value kinds. The bucket schema treats `kind` as an open
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
}

// --- Component rows -----------------------------------------------------

export interface ComponentRow extends RowBase {
  name: string;
  /** Where the component was discovered — `registry.json`, `heuristic`, etc. */
  discovered_via: string;
  variants?: string[];
  sizes?: string[];
}

// --- Library rows -------------------------------------------------------

export interface LibraryRow extends RowBase {
  /** Package name. */
  name: string;
  /** Library kind — `icons`, `charts`, `animation`, `motion`, etc. Open. */
  kind: string;
  version?: string;
}

// --- Bucket --------------------------------------------------------------

export interface Bucket {
  schema: "ghost.bucket/v1";
  /**
   * Source(s) the bucket came from. Always an array — pre-merge buckets
   * have length 1, merged buckets have N entries (one per source scan).
   */
  sources: BucketSource[];
  values: ValueRow[];
  tokens: TokenRow[];
  components: ComponentRow[];
  libraries: LibraryRow[];
}
