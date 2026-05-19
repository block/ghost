import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  formatSurveySummaryMarkdown,
  lintSurvey,
  type Survey,
  summarizeSurvey,
} from "#ghost-core";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";
import type { WriteContextResult } from "./writer.js";

export interface WritePackageContextOptions {
  outDir: string;
  /** Override the skill/package name. Default: resources.yml id. */
  name?: string;
  /** Emit only prompt.md. Default: false. */
  promptOnly?: boolean;
  /** Include README.md. Default: false. */
  readme?: boolean;
}

interface PackageContext {
  name: string;
  resources: string;
  map: string;
  surveySummary: string;
  patterns: string;
  checks?: string;
  intent?: string;
}

export async function writePackageContextBundle(
  paths: FingerprintPackagePaths,
  options: WritePackageContextOptions,
): Promise<WriteContextResult> {
  const context = await loadPackageContext(paths, options.name);
  await mkdir(options.outDir, { recursive: true });
  const files: string[] = [];

  const promptPath = join(options.outDir, "prompt.md");
  await writeFile(promptPath, buildPackagePromptMd(context), "utf-8");
  files.push(promptPath);

  if (options.promptOnly) {
    return { outDir: options.outDir, files };
  }

  const skillPath = join(options.outDir, "SKILL.md");
  await writeFile(skillPath, buildPackageSkillMd(context), "utf-8");
  files.push(skillPath);

  await writeContextFile(
    options.outDir,
    files,
    "resources.yml",
    context.resources,
  );
  await writeContextFile(options.outDir, files, "map.md", context.map);
  await writeContextFile(
    options.outDir,
    files,
    "survey-summary.md",
    context.surveySummary,
  );
  await writeContextFile(
    options.outDir,
    files,
    "patterns.yml",
    context.patterns,
  );
  if (context.checks) {
    await writeContextFile(options.outDir, files, "checks.yml", context.checks);
  }
  if (context.intent) {
    await writeContextFile(options.outDir, files, "intent.md", context.intent);
  }
  if (options.readme) {
    await writeContextFile(
      options.outDir,
      files,
      "README.md",
      buildPackageReadmeMd(context),
    );
  }

  return { outDir: options.outDir, files };
}

async function loadPackageContext(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageContext> {
  const [resources, map, surveyRaw, patterns, checks, intent] =
    await Promise.all([
      readFile(paths.resources, "utf-8"),
      readFile(paths.map, "utf-8"),
      readFile(paths.survey, "utf-8"),
      readFile(paths.patterns, "utf-8"),
      readOptional(paths.checks),
      readOptional(paths.intent),
    ]);

  const survey = parseSurvey(surveyRaw);
  const report = lintSurvey(survey);
  if (report.errors > 0) {
    throw new Error(
      `survey.json failed lint with ${report.errors} error(s); fix before emitting a context bundle.`,
    );
  }

  return {
    name: sanitizeName(nameOverride ?? inferPackageName(resources, map)),
    resources,
    map,
    surveySummary: formatSurveySummaryMarkdown(
      summarizeSurvey(survey, { budget: "compact" }),
    ),
    patterns,
    checks,
    intent,
  };
}

function parseSurvey(raw: string): Survey {
  try {
    return JSON.parse(raw) as Survey;
  } catch (err) {
    throw new Error(
      `survey.json is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function writeContextFile(
  outDir: string,
  files: string[],
  name: string,
  content: string,
): Promise<void> {
  const outPath = join(outDir, name);
  await writeFile(outPath, ensureTrailingNewline(content), "utf-8");
  files.push(outPath);
}

function inferPackageName(resources: string, map: string): string {
  const fromResources = parseYamlSafe(resources);
  if (isRecord(fromResources) && typeof fromResources.id === "string") {
    return fromResources.id;
  }

  const frontmatter = map.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (frontmatter) {
    const fromMap = parseYamlSafe(frontmatter);
    if (isRecord(fromMap) && typeof fromMap.id === "string") {
      return fromMap.id;
    }
  }

  return "ghost-package";
}

function parseYamlSafe(raw: string): unknown {
  try {
    return parseYaml(raw);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "ghost-package";
}

function buildPackageSkillMd(context: PackageContext): string {
  return `---
name: ${context.name}
description: Use this root Ghost fingerprint package to preserve design identity during UI generation and review.
user-invocable: true
---

This skill grounds work in the **${context.name}** root Ghost fingerprint package.

Read the files in this order:

1. \`intent.md\` when present - human-approved direction.
2. \`map.md\` - topology, scopes, surface families, and routing.
3. \`patterns.yml\` - operational composition grammar backed by survey evidence.
4. \`checks.yml\` when present - deterministic gates or proposed gates.
5. \`survey-summary.md\` - compact evidence digest from \`survey.json\`.
6. \`resources.yml\` - what counted as source evidence.

When generating or reviewing UI, identify the map scope and surface type first,
then apply matching composition patterns. Treat survey rows as evidence, not
taste. Treat checks as gates only when their status is \`active\`; proposed
checks are advisory until promoted by a human.
`;
}

function buildPackagePromptMd(context: PackageContext): string {
  const parts = [
    `You are working inside the **${context.name}** design language as captured by a root Ghost fingerprint package.`,
  ];

  if (context.intent?.trim()) {
    parts.push(`# Intent\n\n${context.intent.trim()}`);
  }

  parts.push(`# Use The Package

- Start with \`map.md\` to route the task to scopes, surface families, and examples.
- Use \`patterns.yml\` for composition decisions; cite evidence when reviewing.
- Use \`checks.yml\` for deterministic gates. Only \`active\` checks block.
- Use \`survey-summary.md\` for observed tokens, values, components, and surfaces.
- Use \`resources.yml\` to understand what evidence was included or excluded.
- Do not invent tokens, components, or surface patterns when the package provides an observed option.`);

  parts.push(`# Package Files

- \`resources.yml\`
- \`map.md\`
- \`survey-summary.md\`
- \`patterns.yml\`
${context.checks ? "- `checks.yml`\n" : ""}${context.intent ? "- `intent.md`\n" : ""}`);

  parts.push(`# Review Posture

Before calling drift, classify the changed file by \`map.md\` scope. For UI
generation, preserve matching \`patterns.yml\` anatomy and prefer values from
the survey's token/value digest. If a divergence is intentional, name it in the
package rather than hiding it in generated UI.`);

  return `${parts.join("\n\n")}\n`;
}

function buildPackageReadmeMd(context: PackageContext): string {
  return `# ${context.name} context bundle

Generated by \`ghost emit context-bundle\` from a root Ghost
fingerprint package.

## Files

- \`SKILL.md\` - agent skill manifest.
- \`prompt.md\` - portable prompt distilled from the package.
- \`resources.yml\` - evidence sources.
- \`map.md\` - topology and routing.
- \`survey-summary.md\` - compact survey evidence.
- \`patterns.yml\` - composition grammar.
${context.checks ? "- `checks.yml` - deterministic gates and proposed gates.\n" : ""}${context.intent ? "- `intent.md` - human-approved direction.\n" : ""}
The full \`survey.json\` stays in the source package by default because it can
be large; regenerate this bundle when the survey changes.
`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
