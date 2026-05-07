import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GHOST_CHECKS_FILENAME,
  type GhostChecksDocument,
  GhostChecksSchema,
  loadSkillBundle,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
  SurveySchema,
  type SurveySummary,
  type SurveySummaryBudget,
  summarizeSurvey,
} from "@ghost/core";
import type { CAC } from "cac";
import { parse as parseYaml } from "yaml";
import {
  buildFingerprintViewerHtml,
  emitReviewCommand,
  loadFingerprint,
  resolveFingerprintPackage,
  type ViewerArtifactStatus,
  writeContextBundle,
} from "./core/index.js";

/**
 * The skill bundle's source files live in `src/skill-bundle/` as real
 * markdown and are copied verbatim into `dist/skill-bundle/` by the
 * package build step. This loader points the shared `@ghost/core`
 * walker at that built directory at runtime.
 */
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("./skill-bundle", import.meta.url),
);

const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";
const DEFAULT_CONTEXT_OUT = "ghost-context";
const DEFAULT_SKILL_OUT = ".claude/skills/ghost-fingerprint";
const DEFAULT_VIEWER_OUT = "fingerprint-viewer.html";

export const SUPPORTED_KINDS = [
  "review-command",
  "context-bundle",
  "viewer",
  "skill",
] as const;
export type EmitKind = (typeof SUPPORTED_KINDS)[number];

export type ParseEmitKindResult =
  | { ok: true; kind: EmitKind }
  | { ok: false; error: string };

/**
 * Validate the positional emit kind against the supported set.
 * Exported for unit testing.
 */
export function parseEmitKind(raw: string): ParseEmitKindResult {
  if ((SUPPORTED_KINDS as readonly string[]).includes(raw)) {
    return { ok: true, kind: raw as EmitKind };
  }
  return {
    ok: false,
    error: `unknown emit kind '${raw}'. Supported: ${SUPPORTED_KINDS.join(", ")}`,
  };
}

export function registerEmitCommand(cli: CAC): void {
  cli
    .command(
      "emit <kind>",
      `Emit a derived artifact from the fingerprint package profile (kinds: ${SUPPORTED_KINDS.join(", ")})`,
    )
    .option(
      "-p, --profile <path>",
      "Source profile file (default: .ghost/fingerprint/profile.md)",
    )
    .option(
      "-o, --out <path>",
      `Output path (review-command → ${DEFAULT_REVIEW_OUT}; context-bundle → ${DEFAULT_CONTEXT_OUT}/; skill → ${DEFAULT_SKILL_OUT}/; viewer → ${DEFAULT_VIEWER_OUT})`,
    )
    .option(
      "--stdout",
      "Write to stdout instead of a file (review-command, viewer)",
    )
    .option(
      "--budget <budget>",
      "Survey summary depth for viewer: compact, standard, or full (default: standard)",
    )
    // context-bundle flags:
    .option("--no-tokens", "Skip tokens.css output (context-bundle)")
    .option("--readme", "Include README.md (context-bundle)")
    .option(
      "--prompt-only",
      "Emit only prompt.md — skips SKILL.md / fingerprint.md / tokens.css (context-bundle)",
    )
    .option(
      "--name <name>",
      "Override the skill name (default: fingerprint id) (context-bundle)",
    )
    .action(async (kind: string, opts) => {
      try {
        const parsed = parseEmitKind(kind);
        if (!parsed.ok) {
          console.error(`Error: ${parsed.error}`);
          process.exit(2);
          return;
        }

        if (parsed.kind === "skill") {
          const outDir = resolve(
            process.cwd(),
            (opts.out as string | undefined) ?? DEFAULT_SKILL_OUT,
          );
          const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
          const written: string[] = [];
          for (const file of bundle) {
            const outPath = resolve(outDir, file.path);
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, file.content, "utf-8");
            written.push(file.path);
          }
          process.stdout.write(
            `Wrote ${written.length} file${written.length === 1 ? "" : "s"} to ${outDir}:\n`,
          );
          for (const f of written) process.stdout.write(`  ${f}\n`);
          process.exit(0);
          return;
        }

        const profilePath = resolve(
          process.cwd(),
          opts.profile ??
            resolveFingerprintPackage(undefined, process.cwd()).profile,
        );

        if (parsed.kind === "review-command") {
          const loaded = await loadFingerprint(profilePath, {
            noEmbeddingBackfill: true,
          });
          const content = emitReviewCommand({
            fingerprint: loaded.fingerprint,
          });

          if (opts.stdout) {
            process.stdout.write(content);
            process.exit(0);
            return;
          }

          const outPath = resolve(
            process.cwd(),
            opts.out ?? DEFAULT_REVIEW_OUT,
          );
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, content, "utf-8");
          console.log(`Wrote ${outPath}`);
          process.exit(0);
          return;
        }

        if (parsed.kind === "viewer") {
          const budget = parseSurveyBudget(opts.budget as string | undefined);
          if (!budget.ok) {
            console.error(`Error: ${budget.error}`);
            process.exit(2);
            return;
          }

          const { fingerprint } = await loadFingerprint(profilePath, {
            noEmbeddingBackfill: true,
          });
          const extras = await loadViewerArtifacts(profilePath, budget.budget);
          for (const warning of extras.warnings) {
            console.error(`Warning: ${warning}`);
          }

          const content = buildFingerprintViewerHtml({
            fingerprint,
            sourcePath: profilePath,
            generatedAt: new Date().toISOString(),
            surveySummary: extras.surveySummary,
            surveyBudget: budget.budget,
            map: extras.map,
            checks: extras.checks,
            artifacts: extras.artifacts,
            warnings: extras.warnings,
          });

          if (opts.stdout) {
            process.stdout.write(content);
            process.exit(0);
            return;
          }

          const outPath = resolve(
            process.cwd(),
            opts.out ?? DEFAULT_VIEWER_OUT,
          );
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, content, "utf-8");
          console.log(`Wrote ${outPath}`);
          process.exit(0);
          return;
        }

        // kind === "context-bundle"
        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_CONTEXT_OUT,
        );

        const { fingerprint } = await loadFingerprint(profilePath);
        const result = await writeContextBundle(fingerprint, {
          outDir,
          tokens: opts.tokens !== false,
          readme: Boolean(opts.readme),
          promptOnly: Boolean(opts.promptOnly),
          name: opts.name as string | undefined,
          sourcePath: profilePath,
        });

        process.stdout.write(
          `Wrote ${result.files.length} file${
            result.files.length === 1 ? "" : "s"
          } to ${result.outDir}:\n`,
        );
        for (const f of result.files) {
          process.stdout.write(`  ${f}\n`);
        }
        process.exit(0);
        return;
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
        return;
      }
    });
}

type ParseBudgetResult =
  | { ok: true; budget: SurveySummaryBudget }
  | { ok: false; error: string };

function parseSurveyBudget(raw: string | undefined): ParseBudgetResult {
  if (raw === undefined) return { ok: true, budget: "standard" };
  if (raw === "compact" || raw === "standard" || raw === "full") {
    return { ok: true, budget: raw };
  }
  return {
    ok: false,
    error: `unknown viewer budget '${raw}'. Supported: compact, standard, full`,
  };
}

interface ViewerExtras {
  surveySummary?: SurveySummary;
  map?: MapFrontmatter;
  checks?: GhostChecksDocument;
  artifacts: ViewerArtifactStatus[];
  warnings: string[];
}

async function loadViewerArtifacts(
  profilePath: string,
  budget: SurveySummaryBudget,
): Promise<ViewerExtras> {
  const dir = dirname(profilePath);
  const artifacts: ViewerArtifactStatus[] = [
    { name: "profile.md", state: "included", path: profilePath },
  ];
  const warnings: string[] = [];

  const surveyPath = join(dir, SURVEY_FILENAME);
  const surveyRaw = await readOptional(
    surveyPath,
    "survey.json",
    artifacts,
    warnings,
  );
  let surveySummary: SurveySummary | undefined;
  if (surveyRaw !== undefined) {
    try {
      const parsedJson = JSON.parse(surveyRaw);
      const parsed = SurveySchema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "invalid survey");
      }
      surveySummary = summarizeSurvey(parsed.data, { budget });
    } catch (err) {
      markInvalid(
        artifacts,
        warnings,
        "survey.json",
        surveyPath,
        `Could not load survey.json: ${formatError(err)}`,
      );
    }
  }

  const mapPath = join(dir, MAP_FILENAME);
  const mapRaw = await readOptional(mapPath, "map.md", artifacts, warnings);
  let map: MapFrontmatter | undefined;
  if (mapRaw !== undefined) {
    try {
      const parsedYaml = parseYaml(extractFrontmatter(mapRaw, "map.md"));
      const parsed = MapFrontmatterSchema.safeParse(parsedYaml);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "invalid map");
      }
      map = parsed.data;
    } catch (err) {
      markInvalid(
        artifacts,
        warnings,
        "map.md",
        mapPath,
        `Could not load map.md: ${formatError(err)}`,
      );
    }
  }

  const checksPath = join(dir, GHOST_CHECKS_FILENAME);
  const checksRaw = await readOptional(
    checksPath,
    "checks.yml",
    artifacts,
    warnings,
  );
  let checks: GhostChecksDocument | undefined;
  if (checksRaw !== undefined) {
    try {
      const parsedYaml = parseYaml(checksRaw);
      const parsed = GhostChecksSchema.safeParse(parsedYaml);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "invalid checks");
      }
      checks = parsed.data;
    } catch (err) {
      markInvalid(
        artifacts,
        warnings,
        "checks.yml",
        checksPath,
        `Could not load checks.yml: ${formatError(err)}`,
      );
    }
  }

  return { surveySummary, map, checks, artifacts, warnings };
}

async function readOptional(
  path: string,
  name: ViewerArtifactStatus["name"],
  artifacts: ViewerArtifactStatus[],
  warnings: string[],
): Promise<string | undefined> {
  try {
    const raw = await readFile(path, "utf-8");
    artifacts.push({ name, state: "included", path });
    return raw;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code === "ENOENT") {
      const message = `Optional ${name} not found at ${path}.`;
      artifacts.push({ name, state: "missing", path, message });
      warnings.push(message);
      return undefined;
    }
    const message = `Could not read optional ${name} at ${path}: ${formatError(err)}`;
    artifacts.push({ name, state: "invalid", path, message });
    warnings.push(message);
    return undefined;
  }
}

function markInvalid(
  artifacts: ViewerArtifactStatus[],
  warnings: string[],
  name: ViewerArtifactStatus["name"],
  path: string,
  message: string,
): void {
  const existing = artifacts.find((artifact) => artifact.name === name);
  if (existing) {
    existing.state = "invalid";
    existing.message = message;
  } else {
    artifacts.push({ name, state: "invalid", path, message });
  }
  warnings.push(message);
}

function extractFrontmatter(raw: string, label: string): string {
  const match = raw.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`${label} is missing a YAML frontmatter block`);
  }
  return match[1];
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
