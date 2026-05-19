import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_FILENAME,
  GHOST_PATTERNS_FILENAME,
  GHOST_RESOURCES_FILENAME,
  getEffectiveMapScopes,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
  type Survey,
} from "#ghost-core";
import {
  FINGERPRINTS_DIRNAME,
  INTENT_FILENAME,
  SCOPE_SURVEYS_DIRNAME,
} from "./constants.js";

/**
 * Per-stage state in a fingerprint capture directory.
 *
 *   `missing` — the artifact doesn't exist yet.
 *   `present` — the artifact exists. Existence is the only signal this
 *     surfaces; hash-based freshness (`stale` vs `present`) is a planned
 *     enhancement once `.scan-meta.json` is in play.
 */
export type ScanStageState = "missing" | "present";

export interface ScanStageReport {
  state: ScanStageState;
  /** Absolute path to the artifact (whether it exists or not). */
  path: string;
}

export type ScanStage = "resources" | "map" | "survey" | "patterns";

export interface ScanScopeReport {
  id: string;
  name?: string;
  kind: string;
  parent?: string;
  survey: ScanStageReport;
  fingerprint: ScanStageReport;
}

export type ScanReadinessState =
  | "pending"
  | "product-observed"
  | "component-demo"
  | "substrate-only"
  | "unobservable"
  | "unknown";

export interface ScanReadinessReport {
  state: ScanReadinessState;
  product_surface_count: number;
  demo_surface_count: number;
  substrate_rows: {
    values: number;
    tokens: number;
    components: number;
  };
  can_review: string[];
  cannot_review: string[];
  reasons: string[];
}

export interface ScanStatusOptions {
  includeScopes?: boolean;
}

export interface ScanStatus {
  /** Absolute path to the fingerprint capture directory. */
  dir: string;
  resources: ScanStageReport;
  map: ScanStageReport;
  survey: ScanStageReport;
  patterns: ScanStageReport;
  checks: ScanStageReport;
  intent: ScanStageReport;
  scopes?: ScanScopeReport[];
  scope_error?: string;
  /**
   * Best-effort evidence maturity derived from map.md + survey.json. This is
   * advisory: invalid or missing artifacts still surface through lint/verify.
   */
  readiness: ScanReadinessReport;
  /**
   * The next stage an orchestrator should run, or `null` if every required
   * stage is `present`. Stages run in order:
   * resources → map → survey → patterns. `checks.yml` and `intent.md` are
   * reported but optional, so they never block completion.
   */
  recommended_next: ScanStage | null;
}

/**
 * Inspect a fingerprint capture directory and report which stages have produced
 * artifacts.
 *
 * Existence-only check today. The artifacts checked are:
 *
 *   - resources → `resources.yml`
 *   - map       → `map.md`
 *   - survey    → `survey.json`
 *   - patterns  → `patterns.yml`
 *   - checks    → optional `checks.yml`
 *   - intent    → optional `intent.md`
 *
 * Hash-keyed freshness (`.scan-meta.json` with input/output hashes per
 * stage) is the planned enhancement. For now, orchestrators that want
 * "force rerun" behavior delete the artifact themselves before calling
 * scan — same idiom design-world-model already uses.
 */
export async function scanStatus(
  dirPath: string,
  options: ScanStatusOptions = {},
): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const resourcesPath = resolve(dir, GHOST_RESOURCES_FILENAME);
  const mapPath = resolve(dir, MAP_FILENAME);
  const surveyPath = resolve(dir, SURVEY_FILENAME);
  const patternsPath = resolve(dir, GHOST_PATTERNS_FILENAME);
  const checksPath = resolve(dir, GHOST_CHECKS_FILENAME);
  const intentPath = resolve(dir, INTENT_FILENAME);

  const [
    resourcesPresent,
    mapPresent,
    surveyPresent,
    patternsPresent,
    checksPresent,
    intentPresent,
  ] = await Promise.all([
    pathExists(resourcesPath),
    pathExists(mapPath),
    pathExists(surveyPath),
    pathExists(patternsPath),
    pathExists(checksPath),
    pathExists(intentPath),
  ]);

  const resources: ScanStageReport = {
    state: resourcesPresent ? "present" : "missing",
    path: resourcesPath,
  };
  const map: ScanStageReport = {
    state: mapPresent ? "present" : "missing",
    path: mapPath,
  };
  const survey: ScanStageReport = {
    state: surveyPresent ? "present" : "missing",
    path: surveyPath,
  };
  const patterns: ScanStageReport = {
    state: patternsPresent ? "present" : "missing",
    path: patternsPath,
  };
  const checks: ScanStageReport = {
    state: checksPresent ? "present" : "missing",
    path: checksPath,
  };
  const intent: ScanStageReport = {
    state: intentPresent ? "present" : "missing",
    path: intentPath,
  };

  let recommended_next: ScanStage | null = null;
  if (resources.state === "missing") recommended_next = "resources";
  else if (map.state === "missing") recommended_next = "map";
  else if (survey.state === "missing") recommended_next = "survey";
  else if (patterns.state === "missing") recommended_next = "patterns";

  const readiness = await scanReadiness({
    mapPath,
    mapPresent,
    surveyPath,
    surveyPresent,
  });

  const status: ScanStatus = {
    dir,
    resources,
    map,
    survey,
    patterns,
    checks,
    intent,
    readiness,
    recommended_next,
  };

  if (options.includeScopes) {
    try {
      status.scopes = await scanScopes(dir, mapPath, map.state === "present");
    } catch (err) {
      status.scope_error = err instanceof Error ? err.message : String(err);
      status.scopes = [];
    }
  }

  return status;
}

async function scanReadiness(options: {
  mapPath: string;
  mapPresent: boolean;
  surveyPath: string;
  surveyPresent: boolean;
}): Promise<ScanReadinessReport> {
  const reasons: string[] = [];

  if (!options.mapPresent || !options.surveyPresent) {
    if (!options.mapPresent) {
      reasons.push("map.md is missing, so observation paths are unknown.");
    }
    if (!options.surveyPresent) {
      reasons.push("survey.json is missing, so evidence rows are unknown.");
    }
    return readinessReport("pending", {
      reasons,
      can_review: [],
      cannot_review: [],
    });
  }

  let map: MapFrontmatter | undefined;
  try {
    map = await readMapFrontmatter(options.mapPath);
  } catch (err) {
    reasons.push(
      `map.md could not be read for readiness: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  let survey: Pick<Survey, "values" | "tokens" | "components" | "ui_surfaces">;
  try {
    survey = await readSurveyEvidence(options.surveyPath);
  } catch (err) {
    return readinessReport("unknown", {
      reasons: [
        `survey.json could not be read for readiness: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
      can_review: [],
      cannot_review: [
        "product composition",
        "surface flow",
        "tokens",
        "components",
      ],
    });
  }

  const productSurfaceCount = survey.ui_surfaces.filter((surface) =>
    isProductSurfaceKind(surface.kind),
  ).length;
  const demoSurfaceCount = survey.ui_surfaces.filter((surface) =>
    isDemoSurfaceKind(surface.kind),
  ).length;
  const substrateRows = {
    values: survey.values.length,
    tokens: survey.tokens.length,
    components: survey.components.length,
  };
  const substrateRowCount =
    substrateRows.values + substrateRows.tokens + substrateRows.components;

  if (productSurfaceCount > 0) {
    reasons.push(
      `${productSurfaceCount} product surface(s) were observed in survey.ui_surfaces.`,
    );
    return readinessReport("product-observed", {
      product_surface_count: productSurfaceCount,
      demo_surface_count: demoSurfaceCount,
      substrate_rows: substrateRows,
      reasons,
      can_review: [
        "product composition",
        "surface flow",
        "tokens",
        "components",
        "design values",
      ],
      cannot_review: [],
    });
  }

  if (demoSurfaceCount > 0) {
    reasons.push(
      `${demoSurfaceCount} demo surface(s) were observed, but no product route, screen, screenshot, or source surface is present.`,
    );
    return readinessReport("component-demo", {
      demo_surface_count: demoSurfaceCount,
      substrate_rows: substrateRows,
      reasons,
      can_review: [
        "tokens",
        "components",
        "design values",
        "component demonstration composition",
      ],
      cannot_review: ["product composition", "surface flow"],
    });
  }

  if (substrateRowCount > 0) {
    reasons.push(
      `survey.json has ${substrateRowCount} value/token/component row(s), but no UI surfaces.`,
    );
    if (map?.surface_sources.render_strategy === "unknown") {
      reasons.push("map.md declares surface_sources.render_strategy: unknown.");
    }
    return readinessReport("substrate-only", {
      substrate_rows: substrateRows,
      reasons,
      can_review: ["tokens", "components", "design values"],
      cannot_review: [
        "product composition",
        "surface flow",
        "surface hierarchy",
      ],
    });
  }

  reasons.push(
    "survey.json has no values, tokens, components, or UI surfaces to support product-experience judgment.",
  );
  return readinessReport("unobservable", {
    reasons,
    can_review: [],
    cannot_review: [
      "product composition",
      "surface flow",
      "surface hierarchy",
      "tokens",
      "components",
    ],
  });
}

function readinessReport(
  state: ScanReadinessState,
  overrides: Partial<Omit<ScanReadinessReport, "state">> = {},
): ScanReadinessReport {
  return {
    state,
    product_surface_count: 0,
    demo_surface_count: 0,
    substrate_rows: { values: 0, tokens: 0, components: 0 },
    can_review: [],
    cannot_review: [],
    reasons: [],
    ...overrides,
  };
}

async function readSurveyEvidence(
  path: string,
): Promise<Pick<Survey, "values" | "tokens" | "components" | "ui_surfaces">> {
  const raw = JSON.parse(await readFile(path, "utf-8")) as Partial<Survey>;
  return {
    values: Array.isArray(raw.values) ? raw.values : [],
    tokens: Array.isArray(raw.tokens) ? raw.tokens : [],
    components: Array.isArray(raw.components) ? raw.components : [],
    ui_surfaces: Array.isArray(raw.ui_surfaces) ? raw.ui_surfaces : [],
  };
}

function isProductSurfaceKind(kind: string): boolean {
  return (
    kind === "route" ||
    kind === "screen" ||
    kind === "screenshot" ||
    kind === "source"
  );
}

function isDemoSurfaceKind(kind: string): boolean {
  return kind === "story" || kind === "doc-example" || kind === "fixture";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

async function scanScopes(
  dir: string,
  mapPath: string,
  mapPresent: boolean,
): Promise<ScanScopeReport[]> {
  if (!mapPresent) return [];

  const map = await readMapFrontmatter(mapPath);
  const scopes = getEffectiveMapScopes(map);
  const out: ScanScopeReport[] = [];

  for (const scope of scopes) {
    const surveyPath = join(
      dir,
      SCOPE_SURVEYS_DIRNAME,
      scope.id,
      SURVEY_FILENAME,
    );
    const fingerprintPath = join(dir, FINGERPRINTS_DIRNAME, `${scope.id}.md`);
    const [surveyPresent, fingerprintPresent] = await Promise.all([
      pathExists(surveyPath),
      pathExists(fingerprintPath),
    ]);

    out.push({
      id: scope.id,
      ...(scope.name ? { name: scope.name } : {}),
      kind: scope.kind,
      ...(scope.parent ? { parent: scope.parent } : {}),
      survey: {
        state: surveyPresent ? "present" : "missing",
        path: surveyPath,
      },
      fingerprint: {
        state: fingerprintPresent ? "present" : "missing",
        path: fingerprintPath,
      },
    });
  }

  return out;
}

async function readMapFrontmatter(path: string): Promise<MapFrontmatter> {
  const raw = await readFile(path, "utf-8");
  const split = splitFrontmatter(raw);
  if (!split) {
    throw new Error("map.md is missing a YAML frontmatter block");
  }
  const parsed = parseYaml(split.frontmatter);
  const result = MapFrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `map.md frontmatter failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function splitFrontmatter(raw: string): { frontmatter: string } | null {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      return { frontmatter: lines.slice(1, i).join("\n") };
    }
  }
  return null;
}
