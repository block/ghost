import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type {
  Check,
  Expression,
  SemanticColor,
  Survey,
  ValueRow,
} from "@ghost/core";
import { lintSurvey } from "@ghost/core";
import { lintExpression } from "./lint.js";
import { parseExpression } from "./parser.js";

export type VerifyProfileSeverity = "error" | "warning" | "info";

export interface VerifyProfileIssue {
  severity: VerifyProfileSeverity;
  rule: string;
  message: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface VerifyProfileReport {
  issues: VerifyProfileIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface VerifyProfileOptions {
  root?: string;
}

const HIGH_SALIENCE_ROLE_TOKENS = [
  "background",
  "foreground",
  "brand",
  "border",
  "card",
] as const;

const HIGH_SALIENCE_VALUE_THRESHOLD = 5;

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
]);

/**
 * Deterministically verify that a profiled expression is faithful to the
 * survey that produced it. `lint` remains the shape/schema gate; this verifier
 * checks scan-stage provenance: palette colors must be survey-backed, promoted
 * checks must be calibrated, and optional root scanning must confirm counts.
 */
export function verifyProfile(
  expressionRaw: string,
  surveyInput: unknown,
  options: VerifyProfileOptions = {},
): VerifyProfileReport {
  const issues: VerifyProfileIssue[] = [];

  const expressionLint = lintExpression(expressionRaw);
  issues.push(
    ...expressionLint.issues.map((issue) => fromLintIssue(issue, "expression")),
  );
  if (expressionLint.errors > 0) return finalize(issues);

  let expression: Expression;
  try {
    expression = parseExpression(expressionRaw).expression;
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "expression-parse-failed",
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
  checkPaletteProvenance(expression, evidence.colors, issues);
  checkRoleTokenAgreement(expression, survey, issues);
  checkStructuredValueProvenance(expression, evidence, issues);
  checkHighSalienceOmissions(expression, evidence, issues);
  checkPromotedChecks(expression.checks ?? [], options, issues);

  return finalize(issues);
}

export function formatVerifyProfileReport(report: VerifyProfileReport): string {
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
    severity: VerifyProfileSeverity;
    rule: string;
    message: string;
    path?: string;
  },
  source: "expression" | "survey",
): VerifyProfileIssue {
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
    const entry: SurveyValueEvidenceRow = {
      kind: row.kind,
      value: row.value,
      occurrences: row.occurrences,
      files_count: row.files_count,
      path: `${path}.value`,
    };

    if (row.kind === "color") {
      add(row.value, `${path}.value`);
      const spec = row.spec;
      if (isRecord(spec) && typeof spec.hex === "string") {
        add(spec.hex, `${path}.spec.hex`);
      }
      entry.color = firstHexColor(row.value) ?? specHex(row.spec);
    } else if (row.kind === "spacing") {
      const scalar = rowScalarPx(row);
      if (scalar !== null) {
        addNumberEvidence(evidence.spacing, scalar, `${path}.value`);
        entry.scalarPx = scalar;
      }
    } else if (row.kind === "radius") {
      const scalar = rowScalarPx(row);
      if (scalar !== null) {
        addNumberEvidence(evidence.radii, scalar, `${path}.value`);
        entry.scalarPx = scalar;
      }
    } else if (row.kind === "typography") {
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
    } else if (row.kind === "shadow") {
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
  expression: Expression,
  colorEvidence: Map<string, string[]>,
  issues: VerifyProfileIssue[],
): void {
  expression.palette.dominant.forEach((color, index) => {
    checkPaletteColor(
      color.value,
      `palette.dominant[${index}].value`,
      colorEvidence,
      issues,
    );
  });
  expression.palette.semantic.forEach((color, index) => {
    checkPaletteColor(
      color.value,
      `palette.semantic[${index}].value`,
      colorEvidence,
      issues,
    );
  });
  expression.palette.neutrals.steps.forEach((step, index) => {
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
  issues: VerifyProfileIssue[],
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
  expression: Expression,
  survey: Survey,
  issues: VerifyProfileIssue[],
): void {
  const paletteByRole = new Map<string, { color: string; path: string }[]>();
  collectSemanticPalette(expression.palette.dominant, "dominant").forEach(
    (entry) => {
      addPaletteRole(paletteByRole, entry);
    },
  );
  collectSemanticPalette(expression.palette.semantic, "semantic").forEach(
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
  expression: Expression,
  evidence: SurveyValueEvidence,
  issues: VerifyProfileIssue[],
): void {
  expression.spacing.scale.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `spacing.scale[${index}]`,
      "spacing-value-not-in-survey",
      "Spacing value is absent from survey spacing values.",
      evidence.spacing,
      issues,
    );
  });

  expression.typography.sizeRamp.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `typography.sizeRamp[${index}]`,
      "typography-size-not-in-survey",
      "Typography size is absent from survey typography values.",
      evidence.typographySizes,
      issues,
    );
  });

  expression.typography.families.forEach((family, index) => {
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

  Object.keys(expression.typography.weightDistribution).forEach((weight) => {
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

  expression.surfaces.borderRadii.forEach((value, index) => {
    checkNumberEvidence(
      value,
      `surfaces.borderRadii[${index}]`,
      "radius-value-not-in-survey",
      "Radius value is absent from survey radius values.",
      evidence.radii,
      issues,
    );
  });

  checkShadowPosture(expression.surfaces.shadowComplexity, evidence, issues);
}

function checkNumberEvidence(
  value: number,
  path: string,
  rule: string,
  message: string,
  evidence: Map<string, string[]>,
  issues: VerifyProfileIssue[],
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
  shadowComplexity: Expression["surfaces"]["shadowComplexity"],
  evidence: SurveyValueEvidence,
  issues: VerifyProfileIssue[],
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
  expression: Expression,
  evidence: SurveyValueEvidence,
  issues: VerifyProfileIssue[],
): void {
  const expressionValues = {
    colors: new Set([
      ...expression.palette.dominant.flatMap((color) => {
        const normalized = normalizeHexColor(color.value);
        return normalized ? [normalized] : [];
      }),
      ...expression.palette.neutrals.steps.flatMap((color) => {
        const normalized = normalizeHexColor(color);
        return normalized ? [normalized] : [];
      }),
      ...expression.palette.semantic.flatMap((color) => {
        const normalized = normalizeHexColor(color.value);
        return normalized ? [normalized] : [];
      }),
    ]),
    spacing: new Set(expression.spacing.scale.map((value) => numberKey(value))),
    radii: new Set(
      expression.surfaces.borderRadii.map((value) => numberKey(value)),
    ),
    typographySizes: new Set(
      expression.typography.sizeRamp.map((value) => numberKey(value)),
    ),
    typographyFamilies: new Set(
      expression.typography.families.map(normalizeFamily),
    ),
    typographyWeights: new Set(
      Object.keys(expression.typography.weightDistribution).map((value) =>
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
      const omitted = isHighSalienceRowOmitted(row, expressionValues);
      if (!omitted) continue;
      issues.push({
        severity: "warning",
        rule: "survey-high-salience-value-omitted",
        message: `High-salience survey ${kind} value '${row.value}' is not represented in expression.md.`,
        path: row.path,
        expected: "represented in expression compact value digest",
        actual: row.value,
      });
    }
  }
}

function isHighSalienceRowOmitted(
  row: SurveyValueEvidenceRow,
  expressionValues: {
    colors: Set<string>;
    spacing: Set<string>;
    radii: Set<string>;
    typographySizes: Set<string>;
    typographyFamilies: Set<string>;
    typographyWeights: Set<string>;
  },
): boolean {
  if (row.kind === "color" && row.color) {
    return !expressionValues.colors.has(row.color);
  }
  if (row.kind === "spacing" && row.scalarPx !== undefined) {
    return !expressionValues.spacing.has(numberKey(row.scalarPx));
  }
  if (row.kind === "radius" && row.scalarPx !== undefined) {
    return !expressionValues.radii.has(numberKey(row.scalarPx));
  }
  if (row.kind === "typography") {
    if (
      row.typographyFamily &&
      !expressionValues.typographyFamilies.has(row.typographyFamily)
    ) {
      return true;
    }
    if (
      row.typographySizePx !== undefined &&
      !expressionValues.typographySizes.has(numberKey(row.typographySizePx))
    ) {
      return true;
    }
    if (
      row.typographyWeight !== undefined &&
      !expressionValues.typographyWeights.has(
        numberKey(row.typographyWeight, 0),
      )
    ) {
      return true;
    }
  }
  return false;
}

function checkPromotedChecks(
  checks: Check[],
  options: VerifyProfileOptions,
  issues: VerifyProfileIssue[],
): void {
  const root = options.root ? resolve(options.root) : undefined;

  checks.forEach((check, index) => {
    const path = `checks[${index}]`;
    const regex = compileCheckPattern(check.pattern, `${path}.pattern`, issues);

    if (typeof check.support !== "number") {
      issues.push({
        severity: "error",
        rule: "check-support-missing",
        message: "Promoted checks must record survey-derived `support`.",
        path: `${path}.support`,
      });
    }
    if (typeof check.observed_count !== "number") {
      issues.push({
        severity: "error",
        rule: "check-observed-count-missing",
        message:
          "Promoted checks must record `observed_count` so absence escalation and PR gates are calibrated.",
        path: `${path}.observed_count`,
      });
    }
    if (!check.paths || check.paths.length === 0) {
      issues.push({
        severity: "error",
        rule: "check-paths-missing",
        message:
          "Promoted checks must declare `paths` for deterministic verification.",
        path: `${path}.paths`,
      });
    }

    if (
      !root ||
      !regex ||
      typeof check.observed_count !== "number" ||
      !check.paths?.length
    ) {
      return;
    }

    const files = collectFilesForCheck(root, check.paths, path, issues);
    const actual = countMatches(files, regex);
    if (actual !== check.observed_count) {
      issues.push({
        severity: "error",
        rule: "check-observed-count-mismatch",
        message: `Promoted check '${check.id}' observed_count does not match scoped source matches.`,
        path: `${path}.observed_count`,
        expected: check.observed_count,
        actual,
      });
    }
  });
}

function compileCheckPattern(
  pattern: string,
  path: string,
  issues: VerifyProfileIssue[],
): RegExp | null {
  try {
    return new RegExp(pattern, "g");
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "check-pattern-invalid",
      message: `Check pattern is not a valid JavaScript regular expression: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path,
    });
    return null;
  }
}

function collectFilesForCheck(
  root: string,
  paths: string[],
  checkPath: string,
  issues: VerifyProfileIssue[],
): string[] {
  const files = new Set<string>();
  let resolvedScopeCount = 0;

  paths.forEach((scope, index) => {
    const scopedPath = scope.trim();
    if (!scopedPath) {
      issues.push({
        severity: "error",
        rule: "check-path-empty",
        message: "Check paths entries must be non-empty repo-relative paths.",
        path: `${checkPath}.paths[${index}]`,
      });
      return;
    }

    const absolute = resolve(root, scopedPath);
    if (!isWithinRoot(root, absolute)) {
      issues.push({
        severity: "error",
        rule: "check-path-outside-root",
        message: `Check path '${scope}' resolves outside --root.`,
        path: `${checkPath}.paths[${index}]`,
      });
      return;
    }
    if (!existsSync(absolute)) {
      issues.push({
        severity: "warning",
        rule: "check-path-missing",
        message: `Check path '${scope}' does not exist under --root; it was skipped for count calibration.`,
        path: `${checkPath}.paths[${index}]`,
      });
      return;
    }

    resolvedScopeCount += 1;
    for (const file of collectFiles(absolute)) files.add(file);
  });

  if (resolvedScopeCount === 0) {
    issues.push({
      severity: "warning",
      rule: "check-paths-unresolved",
      message:
        "No check path resolved under --root; observed_count calibration used zero source files.",
      path: `${checkPath}.paths`,
    });
  }

  return [...files].sort();
}

function collectFiles(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function countMatches(files: string[], regex: RegExp): number {
  let count = 0;
  for (const file of files) {
    if (!isLikelyTextFile(file)) continue;
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match !== null) {
      count += 1;
      if (match[0] === "") regex.lastIndex += 1;
      match = regex.exec(content);
    }
  }
  return count;
}

function isLikelyTextFile(path: string): boolean {
  const name = basename(path);
  if (/^(\.?env|Dockerfile|Makefile|Justfile)$/.test(name)) return true;
  return /\.(cjs|css|cts|html|js|json|jsx|md|mdx|mjs|mts|scss|sass|svelte|ts|tsx|txt|vue|yaml|yml)$/.test(
    path,
  );
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
  if (isRecord(spec) && typeof spec.scalar === "number") {
    const unit = typeof spec.unit === "string" ? spec.unit : "px";
    const px = scalarUnitToPx(spec.scalar, unit);
    if (px !== null) return px;
  }
  return parseLengthPx(row.value);
}

function rowTypographyFamily(row: ValueRow): string | null {
  const spec = row.spec;
  if (isRecord(spec) && typeof spec.family === "string") return spec.family;
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
  if (/^[1-9]00$/.test(row.value.trim())) return null;
  return parseLengthPx(row.value);
}

function rowTypographyWeight(row: ValueRow): number | null {
  const spec = row.spec;
  if (isRecord(spec) && spec.weight !== undefined) {
    const parsed = Number(spec.weight);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (/^[1-9]00$/.test(row.value.trim())) return Number(row.value.trim());
  return null;
}

function scalarUnitToPx(scalar: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "px") return scalar;
  if (normalized === "rem" || normalized === "em") return scalar * 16;
  if (normalized === "") return scalar;
  return null;
}

function parseLengthPx(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/i);
  if (!match) return null;
  const scalar = Number(match[1]);
  const unit = match[2] ?? "px";
  return scalarUnitToPx(scalar, unit);
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

function isWithinRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
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

function finalize(issues: VerifyProfileIssue[]): VerifyProfileReport {
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
