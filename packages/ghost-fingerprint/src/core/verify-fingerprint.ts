import type { Fingerprint, SemanticColor, Survey, ValueRow } from "@ghost/core";
import { lintSurvey } from "@ghost/core";
import { lintFingerprint } from "./lint.js";
import { parseFingerprint } from "./parser.js";

export type VerifyFingerprintSeverity = "error" | "warning" | "info";

export interface VerifyFingerprintIssue {
  severity: VerifyFingerprintSeverity;
  rule: string;
  message: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface VerifyFingerprintReport {
  issues: VerifyFingerprintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface VerifyFingerprintOptions {
  root?: string;
  /**
   * Resolved fingerprint after applying `extends:`. CLI callers should pass
   * this for scoped overlays so provenance checks run against the effective
   * design contract instead of the partial child frontmatter.
   */
  resolvedFingerprint?: Fingerprint;
}

const HIGH_SALIENCE_ROLE_TOKENS = [
  "background",
  "foreground",
  "brand",
  "border",
  "card",
] as const;

const HIGH_SALIENCE_VALUE_THRESHOLD = 5;

/**
 * Deterministically verify that a fingerprinted design language is faithful to the
 * survey that produced it. `lint` remains the shape/schema gate; this verifier
 * checks scan-stage provenance for the non-enforcing design-language prior.
 * Enforceable checks live in `checks.yml` and are validated separately.
 */
export function verifyFingerprint(
  fingerprintRaw: string,
  surveyInput: unknown,
  options: VerifyFingerprintOptions = {},
): VerifyFingerprintReport {
  const issues: VerifyFingerprintIssue[] = [];

  const fingerprintLint = lintFingerprint(fingerprintRaw);
  issues.push(
    ...fingerprintLint.issues.map((issue) =>
      fromLintIssue(issue, "fingerprint"),
    ),
  );
  if (fingerprintLint.errors > 0) return finalize(issues);

  let fingerprint: Fingerprint;
  try {
    const parsed = parseFingerprint(fingerprintRaw);
    if (parsed.meta.extends && !options.resolvedFingerprint) {
      issues.push({
        severity: "error",
        rule: "fingerprint-extends-unresolved",
        message:
          "Fingerprint declares `extends:` but no resolved fingerprint was provided for verification.",
      });
      return finalize(issues);
    }
    fingerprint = options.resolvedFingerprint ?? parsed.fingerprint;
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "fingerprint-parse-failed",
      message: err instanceof Error ? err.message : String(err),
    });
    return finalize(issues);
  }

  const surveyLint = lintSurvey(surveyInput);
  issues.push(
    ...surveyLint.issues.map((issue) => fromLintIssue(issue, "survey")),
  );
  if (surveyLint.errors > 0) return finalize(issues);

  const survey = surveyInput as Survey;
  const evidence = collectSurveyEvidence(survey);
  checkPaletteProvenance(fingerprint, evidence.colors, issues);
  checkRoleTokenAgreement(fingerprint, survey, issues);
  checkStructuredValueProvenance(fingerprint, evidence, issues);
  checkHighSalienceOmissions(fingerprint, evidence, issues);

  return finalize(issues);
}

export function formatVerifyFingerprintReport(
  report: VerifyFingerprintReport,
): string {
  const lines: string[] = [];
  for (const issue of report.issues) {
    const prefix =
      issue.severity === "error"
        ? "ERROR"
        : issue.severity === "warning"
          ? "WARN "
          : "INFO ";
    const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
    const countSuffix =
      issue.expected !== undefined || issue.actual !== undefined
        ? ` (expected ${String(issue.expected)}, actual ${String(issue.actual)})`
        : "";
    lines.push(
      `${prefix} [${issue.rule}] ${issue.message}${pathSuffix}${countSuffix}`,
    );
  }
  lines.push(
    "",
    `${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info`,
  );
  return `${lines.join("\n")}\n`;
}

function fromLintIssue(
  issue: {
    severity: VerifyFingerprintSeverity;
    rule: string;
    message: string;
    path?: string;
  },
  source: "fingerprint" | "survey",
): VerifyFingerprintIssue {
  return {
    severity: issue.severity,
    rule: `${source}/${issue.rule}`,
    message: issue.message,
    path: issue.path ? `${source}.${issue.path}` : source,
  };
}

interface SurveyValueEvidence {
  colors: Map<string, string[]>;
  spacing: Map<string, string[]>;
  radii: Map<string, string[]>;
  typographyFamilies: Map<string, string[]>;
  typographySizes: Map<string, string[]>;
  typographyWeights: Map<string, string[]>;
  shadowValues: Map<string, string[]>;
  rows: SurveyValueEvidenceRow[];
}

interface SurveyValueEvidenceRow {
  kind: string;
  value: string;
  occurrences: number;
  files_count: number;
  path: string;
  color?: string;
  scalarPx?: number;
  typographyFamily?: string;
  typographySizePx?: number;
  typographyWeight?: number;
}

function collectSurveyEvidence(survey: Survey): SurveyValueEvidence {
  const evidence: SurveyValueEvidence = {
    colors: new Map(),
    spacing: new Map(),
    radii: new Map(),
    typographyFamilies: new Map(),
    typographySizes: new Map(),
    typographyWeights: new Map(),
    shadowValues: new Map(),
    rows: [],
  };

  const add = (value: string | undefined, path: string) => {
    if (!value) return;
    for (const color of extractHexColors(value)) {
      const paths = evidence.colors.get(color) ?? [];
      paths.push(path);
      evidence.colors.set(color, paths);
    }
  };

  survey.values.forEach((row, index) => {
    const path = `survey.values[${index}]`;
    const kind = canonicalSurveyValueKind(row);
    const entry: SurveyValueEvidenceRow = {
      kind,
      value: row.value,
      occurrences: row.occurrences,
      files_count: row.files_count,
      path: `${path}.value`,
    };

    if (kind === "color") {
      add(row.value, `${path}.value`);
      const spec = row.spec;
      if (isRecord(spec) && typeof spec.hex === "string") {
        add(spec.hex, `${path}.spec.hex`);
      }
      entry.color = firstHexColor(row.value) ?? specHex(row.spec);
    } else if (kind === "spacing") {
      const scalar = rowScalarPx(row);
      if (scalar !== null) {
        addNumberEvidence(evidence.spacing, scalar, `${path}.value`);
        entry.scalarPx = scalar;
      }
    } else if (kind === "radius") {
      const scalar = rowScalarPx(row);
      if (scalar !== null) {
        addNumberEvidence(evidence.radii, scalar, `${path}.value`);
        entry.scalarPx = scalar;
      }
    } else if (kind === "typography") {
      const family = rowTypographyFamily(row);
      if (family) {
        addTextEvidence(evidence.typographyFamilies, family, `${path}.value`);
        entry.typographyFamily = normalizeFamily(family);
      }
      const size = rowTypographySizePx(row);
      if (size !== null) {
        addNumberEvidence(evidence.typographySizes, size, `${path}.value`);
        entry.typographySizePx = size;
      }
      const weight = rowTypographyWeight(row);
      if (weight !== null) {
        addNumberEvidence(evidence.typographyWeights, weight, `${path}.value`);
        entry.typographyWeight = weight;
      }
    } else if (kind === "shadow") {
      addTextEvidence(evidence.shadowValues, row.value, `${path}.value`);
    }
    evidence.rows.push(entry);
  });

  survey.tokens.forEach((row, index) => {
    add(row.resolved_value, `survey.tokens[${index}].resolved_value`);
  });

  return evidence;
}

function checkPaletteProvenance(
  fingerprint: Fingerprint,
  colorEvidence: Map<string, string[]>,
  issues: VerifyFingerprintIssue[],
): void {
  fingerprint.palette.dominant.forEach((color, index) => {
    checkPaletteColor(
      color.value,
      `palette.dominant[${index}].value`,
      colorEvidence,
      issues,
    );
  });
  fingerprint.palette.semantic.forEach((color, index) => {
    checkPaletteColor(
      color.value,
      `palette.semantic[${index}].value`,
      colorEvidence,
      issues,
    );
  });
  fingerprint.palette.neutrals.steps.forEach((step, index) => {
    checkPaletteColor(
      step,
      `palette.neutrals.steps[${index}]`,
      colorEvidence,
      issues,
    );
  });
}

function checkPaletteColor(
  value: string,
  path: string,
  colorEvidence: Map<string, string[]>,
  issues: VerifyFingerprintIssue[],
): void {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    issues.push({
      severity: "error",
      rule: "palette-color-not-hex",
      message: `Palette value '${value}' is not a hex color and cannot be verified against survey color evidence.`,
      path,
    });
    return;
  }
  if (colorEvidence.has(normalized)) return;
  issues.push({
    severity: "error",
    rule: "palette-color-not-in-survey",
    message: `Palette color ${normalized} is absent from survey color values and token resolved values.`,
    path,
    expected: "survey-backed color",
    actual: normalized,
  });
}

function checkRoleTokenAgreement(
  fingerprint: Fingerprint,
  survey: Survey,
  issues: VerifyFingerprintIssue[],
): void {
  const paletteByRole = new Map<string, { color: string; path: string }[]>();
  collectSemanticPalette(fingerprint.palette.dominant, "dominant").forEach(
    (entry) => {
      addPaletteRole(paletteByRole, entry);
    },
  );
  collectSemanticPalette(fingerprint.palette.semantic, "semantic").forEach(
    (entry) => {
      addPaletteRole(paletteByRole, entry);
    },
  );

  for (const role of HIGH_SALIENCE_ROLE_TOKENS) {
    const paletteEntries = paletteByRole.get(role);
    if (!paletteEntries?.length) continue;
    const token = survey.tokens.find((row) => row.name === `--${role}`);
    if (!token) continue;
    const tokenColor = firstHexColor(token.resolved_value);
    if (!tokenColor) continue;

    for (const entry of paletteEntries) {
      if (entry.color === tokenColor) continue;
      issues.push({
        severity: "warning",
        rule: "palette-role-token-mismatch",
        message: `Palette role '${role}' uses ${entry.color}, but survey token --${role} resolves to ${tokenColor}.`,
        path: entry.path,
        expected: tokenColor,
        actual: entry.color,
      });
    }
  }
}

function collectSemanticPalette(
  colors: SemanticColor[],
  section: "dominant" | "semantic",
): { role: string; color: string; path: string }[] {
  return colors.flatMap((color, index) => {
    const normalized = normalizeHexColor(color.value);
    if (!normalized) return [];
    return [
      {
        role: normalizeRole(color.role),
        color: normalized,
        path: `palette.${section}[${index}].value`,
      },
    ];
  });
}

function addPaletteRole(
  roles: Map<string, { color: string; path: string }[]>,
  entry: { role: string; color: string; path: string },
): void {
  const entries = roles.get(entry.role) ?? [];
  entries.push({ color: entry.color, path: entry.path });
  roles.set(entry.role, entries);
}

function checkStructuredValueProvenance(
  fingerprint: Fingerprint,
  evidence: SurveyValueEvidence,
  issues: VerifyFingerprintIssue[],
): void {
  fingerprint.spacing.scale.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `spacing.scale[${index}]`,
      "spacing-value-not-in-survey",
      "Spacing value is absent from survey spacing values.",
      evidence.spacing,
      issues,
    );
  });

  fingerprint.typography.sizeRamp.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `typography.sizeRamp[${index}]`,
      "typography-size-not-in-survey",
      "Typography size is absent from survey typography values.",
      evidence.typographySizes,
      issues,
    );
  });

  fingerprint.typography.families.forEach((family, index) => {
    const normalized = normalizeFamily(family);
    if (evidence.typographyFamilies.has(normalized)) return;
    issues.push({
      severity: "error",
      rule: "typography-family-not-in-survey",
      message: `Typography family '${family}' is absent from survey typography values.`,
      path: `typography.families[${index}]`,
      expected: "survey-backed typography family",
      actual: family,
    });
  });

  Object.keys(fingerprint.typography.weightDistribution).forEach((weight) => {
    const parsed = Number(weight);
    if (!Number.isFinite(parsed)) return;
    checkNumberEvidence(
      parsed,
      `typography.weightDistribution.${weight}`,
      "typography-weight-not-in-survey",
      "Typography weight is absent from survey typography values.",
      evidence.typographyWeights,
      issues,
      0,
    );
  });

  fingerprint.surfaces.borderRadii.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `surfaces.borderRadii[${index}]`,
      "radius-value-not-in-survey",
      "Radius value is absent from survey radius values.",
      evidence.radii,
      issues,
    );
  });

  checkShadowPosture(fingerprint.surfaces.shadowComplexity, evidence, issues);
}

function checkNumberEvidence(
  value: number,
  path: string,
  rule: string,
  message: string,
  evidence: Map<string, string[]>,
  issues: VerifyFingerprintIssue[],
  decimals = 3,
): void {
  const key = numberKey(value, decimals);
  if (evidence.has(key)) return;
  issues.push({
    severity: "error",
    rule,
    message,
    path,
    expected: "survey-backed value",
    actual: value,
  });
}

function checkShadowPosture(
  shadowComplexity: Fingerprint["surfaces"]["shadowComplexity"],
  evidence: SurveyValueEvidence,
  issues: VerifyFingerprintIssue[],
): void {
  const distinct = evidence.shadowValues.size;
  const matches =
    shadowComplexity === "deliberate-none"
      ? distinct === 0
      : shadowComplexity === "subtle"
        ? distinct >= 1 && distinct <= 2
        : distinct >= 3;
  if (matches) return;
  issues.push({
    severity: "error",
    rule: "shadow-posture-not-in-survey",
    message: `Shadow posture '${shadowComplexity}' is not backed by survey shadow values.`,
    path: "surfaces.shadowComplexity",
    expected:
      shadowComplexity === "deliberate-none"
        ? "0 survey shadow values"
        : shadowComplexity === "subtle"
          ? "1-2 distinct survey shadow values"
          : "3+ distinct survey shadow values",
    actual: distinct,
  });
}

function checkHighSalienceOmissions(
  fingerprint: Fingerprint,
  evidence: SurveyValueEvidence,
  issues: VerifyFingerprintIssue[],
): void {
  const fingerprintValues = {
    colors: new Set([
      ...fingerprint.palette.dominant.flatMap((color) => {
        const normalized = normalizeHexColor(color.value);
        return normalized ? [normalized] : [];
      }),
      ...fingerprint.palette.neutrals.steps.flatMap((color) => {
        const normalized = normalizeHexColor(color);
        return normalized ? [normalized] : [];
      }),
      ...fingerprint.palette.semantic.flatMap((color) => {
        const normalized = normalizeHexColor(color.value);
        return normalized ? [normalized] : [];
      }),
    ]),
    spacing: new Set(
      fingerprint.spacing.scale.map((value) => numberKey(value)),
    ),
    radii: new Set(
      fingerprint.surfaces.borderRadii.map((value) => numberKey(value)),
    ),
    typographySizes: new Set(
      fingerprint.typography.sizeRamp.map((value) => numberKey(value)),
    ),
    typographyFamilies: new Set(
      fingerprint.typography.families.map(normalizeFamily),
    ),
    typographyWeights: new Set(
      Object.keys(fingerprint.typography.weightDistribution).map((value) =>
        numberKey(Number(value), 0),
      ),
    ),
  };

  const rowsByKind = new Map<string, SurveyValueEvidenceRow[]>();
  for (const row of evidence.rows) {
    if (
      !["color", "spacing", "radius", "typography"].includes(row.kind) ||
      row.occurrences < HIGH_SALIENCE_VALUE_THRESHOLD
    ) {
      continue;
    }
    const rows = rowsByKind.get(row.kind) ?? [];
    rows.push(row);
    rowsByKind.set(row.kind, rows);
  }

  for (const [kind, rows] of rowsByKind.entries()) {
    for (const row of rows.sort(sortEvidenceRows).slice(0, 3)) {
      const omitted = isHighSalienceRowOmitted(row, fingerprintValues);
      if (!omitted) continue;
      issues.push({
        severity: "warning",
        rule: "survey-high-salience-value-omitted",
        message: `High-salience survey ${kind} value '${row.value}' is not represented in fingerprint.md.`,
        path: row.path,
        expected: "represented in fingerprint compact value digest",
        actual: row.value,
      });
    }
  }
}

function isHighSalienceRowOmitted(
  row: SurveyValueEvidenceRow,
  fingerprintValues: {
    colors: Set<string>;
    spacing: Set<string>;
    radii: Set<string>;
    typographySizes: Set<string>;
    typographyFamilies: Set<string>;
    typographyWeights: Set<string>;
  },
): boolean {
  if (row.kind === "color" && row.color) {
    return !fingerprintValues.colors.has(row.color);
  }
  if (row.kind === "spacing" && row.scalarPx !== undefined) {
    return !fingerprintValues.spacing.has(numberKey(row.scalarPx));
  }
  if (row.kind === "radius" && row.scalarPx !== undefined) {
    return !fingerprintValues.radii.has(numberKey(row.scalarPx));
  }
  if (row.kind === "typography") {
    if (
      row.typographyFamily &&
      !fingerprintValues.typographyFamilies.has(row.typographyFamily)
    ) {
      return true;
    }
    if (
      row.typographySizePx !== undefined &&
      !fingerprintValues.typographySizes.has(numberKey(row.typographySizePx))
    ) {
      return true;
    }
    if (
      row.typographyWeight !== undefined &&
      !fingerprintValues.typographyWeights.has(
        numberKey(row.typographyWeight, 0),
      )
    ) {
      return true;
    }
  }
  return false;
}

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

function addNumberEvidence(
  evidence: Map<string, string[]>,
  value: number,
  path: string,
  decimals = 3,
): void {
  const key = numberKey(value, decimals);
  const paths = evidence.get(key) ?? [];
  paths.push(path);
  evidence.set(key, paths);
}

function addTextEvidence(
  evidence: Map<string, string[]>,
  value: string,
  path: string,
): void {
  const key = normalizeFamily(value);
  const paths = evidence.get(key) ?? [];
  paths.push(path);
  evidence.set(key, paths);
}

function rowScalarPx(row: ValueRow): number | null {
  const spec = row.spec;
  if (isRecord(spec)) {
    const scalar =
      typeof spec.scalar === "number"
        ? spec.scalar
        : typeof spec.number === "number"
          ? spec.number
          : null;
    if (scalar !== null) {
      const unit = typeof spec.unit === "string" ? spec.unit : "px";
      const px = scalarUnitToPx(scalar, unit);
      if (px !== null) return px;
    }
  }
  return parseLengthPx(row.value);
}

function rowTypographyFamily(row: ValueRow): string | null {
  const spec = row.spec;
  if (isRecord(spec) && typeof spec.family === "string") return spec.family;
  const declaredFamily = declarationValue(row.value, "font-family");
  if (declaredFamily) return declaredFamily;
  if (looksLikeDeclaration(row.value)) return null;
  if (!parseLengthPx(row.value) && rowTypographyWeight(row) === null) {
    return row.value;
  }
  return null;
}

function rowTypographySizePx(row: ValueRow): number | null {
  const spec = row.spec;
  if (isRecord(spec) && isRecord(spec.size)) {
    const scalar = spec.size.scalar;
    const unit = spec.size.unit;
    if (typeof scalar === "number" && typeof unit === "string") {
      return scalarUnitToPx(scalar, unit);
    }
  }
  const value = declarationValue(row.value, "font-size") ?? row.value;
  if (/^[1-9]00$/.test(value.trim())) return null;
  return parseLengthPx(value);
}

function rowTypographyWeight(row: ValueRow): number | null {
  const spec = row.spec;
  if (isRecord(spec) && spec.weight !== undefined) {
    const parsed = Number(spec.weight);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const value = declarationValue(row.value, "font-weight") ?? row.value;
  if (/^[1-9]00$/.test(value.trim())) return Number(value.trim());
  return null;
}

function scalarUnitToPx(scalar: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "px") return scalar;
  if (normalized === "dp" || normalized === "sp") return scalar;
  if (normalized === "rem" || normalized === "em") return scalar * 16;
  if (normalized === "") return scalar;
  return null;
}

function parseLengthPx(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|dp|sp)?$/i);
  if (!match) return null;
  const scalar = Number(match[1]);
  const unit = match[2] ?? "px";
  return scalarUnitToPx(scalar, unit);
}

function canonicalSurveyValueKind(row: ValueRow): string {
  const raw = row as ValueRow & { category?: unknown };
  const kind =
    typeof raw.kind === "string" ? raw.kind.trim().toLowerCase() : "";
  const category =
    typeof raw.category === "string" ? raw.category.trim().toLowerCase() : "";

  if (isCanonicalValueKind(kind)) return kind;
  if (isCanonicalValueKind(category)) return category;
  if (
    category === "color" &&
    ["hex-color", "rgba-color", "keyword"].includes(kind)
  ) {
    return "color";
  }
  if (
    category === "spacing" &&
    ["length", "keyword", "number"].includes(kind)
  ) {
    return "spacing";
  }
  if (category === "radius" && ["length", "number"].includes(kind)) {
    return "radius";
  }
  if (
    category === "typography" &&
    ["font-stack", "length", "number", "keyword"].includes(kind)
  ) {
    return "typography";
  }
  if (category === "shadow") return "shadow";
  return kind || category;
}

function isCanonicalValueKind(kind: string): boolean {
  return [
    "color",
    "spacing",
    "typography",
    "radius",
    "shadow",
    "breakpoint",
    "motion",
    "layout-primitive",
  ].includes(kind);
}

function declarationValue(value: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value
    .trim()
    .match(new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "i"));
  return match ? (match[1]?.trim() ?? null) : null;
}

function looksLikeDeclaration(value: string): boolean {
  return /^[a-z-]+\s*:/i.test(value.trim());
}

function specHex(spec: unknown): string | undefined {
  if (isRecord(spec) && typeof spec.hex === "string") {
    return normalizeHexColor(spec.hex) ?? undefined;
  }
  return undefined;
}

function normalizeFamily(value: string): string {
  return value
    .split(",")
    .map((part) =>
      part
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(",");
}

function numberKey(value: number, decimals = 3): string {
  return Number(value.toFixed(decimals)).toString();
}

function sortEvidenceRows(
  a: SurveyValueEvidenceRow,
  b: SurveyValueEvidenceRow,
): number {
  return (
    compareNumbers(b.occurrences, a.occurrences) ||
    compareNumbers(b.files_count, a.files_count) ||
    compareStrings(a.value, b.value)
  );
}

function firstHexColor(value: string): string | null {
  return extractHexColors(value)[0] ?? null;
}

function extractHexColors(value: string): string[] {
  const matches = value.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  return matches.flatMap((match) => {
    const normalized = normalizeHexColor(match);
    return normalized ? [normalized] : [];
  });
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^#([0-9a-fA-F]{3,8})$/);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }
  return `#${hex}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

function finalize(issues: VerifyFingerprintIssue[]): VerifyFingerprintReport {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors += 1;
    else if (issue.severity === "warning") warnings += 1;
    else info += 1;
  }
  return { issues, errors, warnings, info };
}
