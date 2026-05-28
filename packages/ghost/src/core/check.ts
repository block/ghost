import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_SCHEMA,
  type GhostCheck,
  type GhostChecksDocument,
  GhostChecksSchema,
  type GhostFingerprintDocument,
  GhostFingerprintSchema,
  lintGhostChecks,
  type MapFrontmatter,
  MapFrontmatterSchema,
  type MapScope,
  routeGhostChecksForPath,
} from "#ghost-core";
import {
  groupMemoryStacksForPaths,
  mapFromFingerprint,
  resolveFingerprintPackage,
} from "../scan/index.js";

const execFileAsync = promisify(execFile);

export interface GhostDriftCheckOptions {
  cwd?: string;
  packageDir?: string;
  memoryDir?: string;
  base?: string;
  diffText?: string;
}

export interface GhostDriftChangedLine {
  path: string;
  line: number;
  text: string;
}

export interface GhostDriftChangedFile {
  path: string;
  added_lines: GhostDriftChangedLine[];
}

export interface GhostDriftRoutedFile {
  path: string;
  scopes: string[];
  checks: string[];
}

export interface GhostDriftCheckFinding {
  check_id: string;
  title: string;
  severity: GhostCheck["severity"];
  path: string;
  line: number;
  detector: GhostCheck["detector"]["type"];
  message: string;
  repair?: string;
  match?: string;
}

export interface GhostDriftCheckReport {
  schema: "ghost.check-report/v1";
  result: "pass" | "fail";
  package_dir: string;
  memory_dir?: string;
  base?: string;
  changed_files: string[];
  routed_files: GhostDriftRoutedFile[];
  findings: GhostDriftCheckFinding[];
  stacks?: GhostDriftCheckStack[];
}

export interface GhostDriftCheckStack {
  target_path: string;
  package_dir: string;
  memory_dir: string;
  changed_files: string[];
  layer_dirs: string[];
  provenance: {
    merge: "child-wins-by-id";
    layers: Array<{
      dir: string;
      root: string;
      relative_root: string;
    }>;
  };
}

interface LoadedCheckPackage {
  dir: string;
  map: Pick<MapFrontmatter, "scopes" | "feature_areas">;
  checks: GhostChecksDocument;
}

export async function runGhostDriftCheck(
  options: GhostDriftCheckOptions = {},
): Promise<GhostDriftCheckReport> {
  const cwd = options.cwd ?? process.cwd();
  const diffText =
    options.diffText ??
    (await readGitDiff(cwd, options.base ?? "HEAD", "--unified=0"));
  const changedFiles = parseUnifiedDiff(diffText);

  if (options.packageDir) {
    const pkg = await loadCheckPackage(options.packageDir, cwd);
    const evaluated = evaluateChangedFiles(changedFiles, pkg);
    return {
      schema: "ghost.check-report/v1",
      result: evaluated.findings.length > 0 ? "fail" : "pass",
      package_dir: pkg.dir,
      ...(options.base ? { base: options.base } : {}),
      changed_files: changedFiles.map((file) => file.path),
      routed_files: evaluated.routedFiles,
      findings: evaluated.findings,
    };
  }

  const groups = await groupMemoryStacksForPaths(
    changedFiles.map((file) => file.path),
    cwd,
    { memoryDir: options.memoryDir },
  );
  const routedFiles: GhostDriftRoutedFile[] = [];
  const findings: GhostDriftCheckFinding[] = [];
  const stacks: GhostDriftCheckStack[] = [];

  for (const group of groups) {
    const filesForStack = changedFiles.filter((file) =>
      group.changed_files.includes(file.path),
    );
    const leaf = group.stack.layers.at(-1);
    const pkg: LoadedCheckPackage = {
      dir: leaf?.dir ?? group.stack.layers[0].dir,
      map: mapFromFingerprint(group.stack.merged.fingerprint),
      checks: group.stack.merged.checks,
    };
    const evaluated = evaluateChangedFiles(filesForStack, pkg);
    routedFiles.push(...evaluated.routedFiles);
    findings.push(...evaluated.findings);
    stacks.push({
      target_path: group.stack.target_path,
      package_dir: pkg.dir,
      memory_dir: group.stack.memory_dir,
      changed_files: group.changed_files,
      layer_dirs: group.stack.layers.map((layer) => layer.dir),
      provenance: group.stack.provenance,
    });
  }

  return {
    schema: "ghost.check-report/v1",
    result: findings.length > 0 ? "fail" : "pass",
    package_dir:
      stacks.length === 1 ? stacks[0].package_dir : "memory-stack/multiple",
    memory_dir: stacks[0]?.memory_dir ?? options.memoryDir,
    ...(options.base ? { base: options.base } : {}),
    changed_files: changedFiles.map((file) => file.path),
    routed_files: routedFiles,
    findings,
    stacks,
  };
}

export function parseUnifiedDiff(diffText: string): GhostDriftChangedFile[] {
  const files = new Map<string, GhostDriftChangedFile>();
  let current: GhostDriftChangedFile | undefined;
  let newLine = 0;

  for (const rawLine of diffText.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      current = undefined;
      continue;
    }

    if (rawLine.startsWith("+++ ")) {
      const file = rawLine.replace(/^\+\+\+\s+/, "");
      if (file === "/dev/null") {
        current = undefined;
        continue;
      }
      const path = file.replace(/^b\//, "");
      current = files.get(path) ?? { path, added_lines: [] };
      files.set(path, current);
      continue;
    }

    const hunk = rawLine.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    if (!current) continue;
    if (rawLine.startsWith("+")) {
      current.added_lines.push({
        path: current.path,
        line: newLine,
        text: rawLine.slice(1),
      });
      newLine += 1;
    } else if (rawLine.startsWith("-")) {
    } else {
      newLine += 1;
    }
  }

  return [...files.values()];
}

export function formatGhostDriftCheckMarkdown(
  report: GhostDriftCheckReport,
): string {
  const lines = [
    `Design Check: ${report.result === "pass" ? "PASS" : "FAIL"}`,
    `Package: ${report.package_dir}`,
    `Changed files: ${report.changed_files.length}`,
    `Findings: ${report.findings.length}`,
    "",
  ];

  if (report.routed_files.length > 0) {
    lines.push("## Routed Files", "");
    for (const file of report.routed_files) {
      const scopes = file.scopes.length > 0 ? file.scopes.join(", ") : "none";
      const checks = file.checks.length > 0 ? file.checks.join(", ") : "none";
      lines.push(`- ${file.path}: scopes ${scopes}; checks ${checks}`);
    }
    lines.push("");
  }

  if (report.findings.length === 0) {
    lines.push("No active deterministic check failures.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Issues", "");
  report.findings.forEach((finding, index) => {
    lines.push(
      `${index + 1}. [${finding.severity}] ${finding.title} (${finding.check_id})`,
      `   ${finding.path}:${finding.line} — ${finding.message}`,
    );
    if (finding.match) lines.push(`   Match: \`${finding.match}\``);
    if (finding.repair) lines.push(`   Repair: ${finding.repair}`);
  });
  return `${lines.join("\n")}\n`;
}

async function loadCheckPackage(
  packageDir: string | undefined,
  cwd: string,
): Promise<LoadedCheckPackage> {
  const paths = resolveFingerprintPackage(packageDir, cwd);
  const [fingerprintRaw, mapRaw, checksRaw] = await Promise.all([
    readFile(paths.fingerprintYml, "utf-8"),
    readOptional(paths.map),
    readOptional(paths.checks),
  ]);
  const fingerprintResult = GhostFingerprintSchema.safeParse(
    parseYaml(fingerprintRaw),
  );
  if (!fingerprintResult.success) {
    throw new Error(
      `fingerprint.yml failed validation: ${fingerprintResult.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  const fingerprint = fingerprintResult.data as GhostFingerprintDocument;
  const map = mapRaw ? parseMap(mapRaw) : mapFromFingerprint(fingerprint);
  if (checksRaw === undefined) {
    return {
      dir: paths.dir,
      map,
      checks: {
        schema: GHOST_CHECKS_SCHEMA,
        id: "none",
        checks: [],
      },
    };
  }
  const checksInput = parseYaml(checksRaw);
  const checksResult = GhostChecksSchema.safeParse(checksInput);
  if (!checksResult.success) {
    throw new Error(
      `checks.yml failed schema validation: ${checksResult.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  const checks = checksResult.data as GhostChecksDocument;
  const checkLint = lintGhostChecks(checks, { fingerprint, map });
  if (checkLint.errors > 0) {
    throw new Error(
      `checks.yml failed lint with ${checkLint.errors} error(s): ${checkLint.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => `[${issue.rule}] ${issue.message}`)
        .join("; ")}`,
    );
  }
  return { dir: paths.dir, map, checks };
}

function evaluateChangedFiles(
  changedFiles: GhostDriftChangedFile[],
  pkg: LoadedCheckPackage,
): {
  routedFiles: GhostDriftRoutedFile[];
  findings: GhostDriftCheckFinding[];
} {
  const routedFiles: GhostDriftRoutedFile[] = [];
  const findings: GhostDriftCheckFinding[] = [];

  for (const file of changedFiles) {
    const routed = routeGhostChecksForPath(
      pkg.checks.checks,
      pkg.map,
      file.path,
    );
    routedFiles.push({
      path: file.path,
      scopes: uniqueScopeIds(routed.flatMap((entry) => entry.matched_scopes)),
      checks: routed.map((entry) => entry.check.id),
    });

    for (const entry of routed) {
      if (!detectorAppliesToPath(entry.check, file.path)) continue;
      findings.push(...evaluateCheck(entry.check, file));
    }
  }

  return { routedFiles, findings };
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

function parseMap(raw: string): MapFrontmatter {
  const block = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) throw new Error("map.md is missing YAML frontmatter");
  const parsed = parseYaml(block);
  const result = MapFrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `map.md failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

async function readGitDiff(
  cwd: string,
  base: string,
  contextFlag: string,
): Promise<string> {
  const { stdout } = await execFileAsync("git", ["diff", contextFlag, base], {
    cwd,
    maxBuffer: 1024 * 1024 * 20,
  });
  return stdout;
}

function evaluateCheck(
  check: GhostCheck,
  file: GhostDriftChangedFile,
): GhostDriftCheckFinding[] {
  const regex = detectorRegex(check);
  if (!regex) return [];

  if (isRequiredDetector(check)) {
    if (file.added_lines.length === 0) return [];
    const hasMatch = file.added_lines.some((line) => {
      regex.lastIndex = 0;
      return regex.test(line.text);
    });
    if (hasMatch) return [];
    const firstLine = file.added_lines[0];
    return [
      {
        check_id: check.id,
        title: check.title,
        severity: check.severity,
        path: file.path,
        line: firstLine.line,
        detector: check.detector.type,
        message: requiredMessage(check),
        ...(check.repair ? { repair: check.repair } : {}),
      },
    ];
  }

  const findings: GhostDriftCheckFinding[] = [];
  for (const line of file.added_lines) {
    regex.lastIndex = 0;
    let match = regex.exec(line.text);
    while (match !== null) {
      findings.push({
        check_id: check.id,
        title: check.title,
        severity: check.severity,
        path: file.path,
        line: line.line,
        detector: check.detector.type,
        message: forbiddenMessage(check),
        match: match[0],
        ...(check.repair ? { repair: check.repair } : {}),
      });
      if (match[0] === "") regex.lastIndex += 1;
      match = regex.exec(line.text);
    }
  }
  return findings;
}

function detectorRegex(check: GhostCheck): RegExp | null {
  const source =
    check.detector.pattern ??
    (check.detector.value ? escapeRegExp(check.detector.value) : undefined);
  if (!source) return null;
  return new RegExp(source, "g");
}

function detectorAppliesToPath(check: GhostCheck, path: string): boolean {
  const contexts = check.detector.contexts;
  if (!contexts?.length) return true;
  const context = contextForPath(path);
  return context ? contexts.includes(context) : false;
}

function contextForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".swift")) return "swift";
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) return "react";
  if (lower.endsWith(".ts") || lower.endsWith(".js")) return "typescript";
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "css";
  return undefined;
}

function isRequiredDetector(check: GhostCheck): boolean {
  return (
    check.detector.type === "required-regex" ||
    check.detector.type === "required-token"
  );
}

function requiredMessage(check: GhostCheck): string {
  if (check.detector.type === "required-token") {
    return "Added UI code did not use the required design token.";
  }
  return "Added UI code did not match the required pattern.";
}

function forbiddenMessage(check: GhostCheck): string {
  if (check.detector.type === "banned-import") {
    return "Added UI code imports a banned dependency.";
  }
  if (check.detector.type === "banned-component") {
    return "Added UI code uses a banned component.";
  }
  return "Added UI code matched a forbidden pattern.";
}

function uniqueScopeIds(scopes: MapScope[]): string[] {
  return [...new Set(scopes.map((scope) => scope.id))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
