import { isAbsolute, relative } from "node:path";
import {
  parseUnifiedDiff,
  runGhostDriftCheck,
} from "../../../../packages/ghost/src/core/check";
import {
  buildContextEntrypoint,
  type ContextEntrypoint,
} from "../../../../packages/ghost/src/scan/context/entrypoint";
import { formatContextEntrypointMarkdown } from "../../../../packages/ghost/src/scan/context/entrypoint-markdown";
import {
  fingerprintStackToPackageContext,
  groupFingerprintStacksForPaths,
  loadFingerprintStackForPath,
} from "../../../../packages/ghost/src/scan/fingerprint-stack";
import type {
  WorkbenchCheckReport,
  WorkbenchContextSection,
  WorkbenchEntrypoint,
  WorkbenchInspectionRequest,
  WorkbenchInspectionResult,
} from "../shared";
import { createSandbox, diffFor, removeSandbox } from "./sandbox";
import { getScenario, toDetail } from "./scenarios";
import { buildContextTraceGraph } from "./trace";

export interface InspectScenarioHooks {
  onSandboxCreated?: (root: string) => void;
}

export async function inspectScenario(
  id: string,
  request: WorkbenchInspectionRequest = {},
  hooks: InspectScenarioHooks = {},
): Promise<WorkbenchInspectionResult> {
  const scenario = getScenario(id);
  if (!scenario) throw statusError(404, `Unknown scenario: ${id}`);
  assertInspectionRequest(request);

  const root = await createSandbox({
    kind: scenario.sandbox,
    cache: scenario.cache,
  });

  try {
    hooks.onSandboxCreated?.(root);
    const targetPaths = request.targetPaths ?? scenario.defaultTargetPaths;
    const diffText =
      request.diffText ??
      (scenario.defaultDiffPaths
        ? diffFor(...scenario.defaultDiffPaths)
        : undefined);
    const contexts = diffText
      ? await contextsFromDiff(root, diffText)
      : await contextsFromTargetPaths(root, targetPaths);
    const checkReport = diffText
      ? ((await runGhostDriftCheck({
          cwd: root,
          diffText,
        })) as WorkbenchCheckReport)
      : undefined;
    const deterministic = scenario.deterministicRepeat
      ? {
          repeated: true,
          equal:
            JSON.stringify(contexts.map((context) => context.markdown)) ===
            JSON.stringify(
              (await contextsFromTargetPaths(root, targetPaths)).map(
                (context) => context.markdown,
              ),
            ),
        }
      : undefined;

    return {
      scenario: toDetail(scenario),
      targetPaths,
      ...(diffText ? { diffText } : {}),
      contexts,
      ...(checkReport ? { checkReport } : {}),
      ...(deterministic ? { deterministic } : {}),
    };
  } finally {
    await removeSandbox(root);
  }
}

function assertInspectionRequest(request: WorkbenchInspectionRequest): void {
  if (!isPlainObject(request)) {
    throw statusError(400, "Request body must be a JSON object.");
  }
  if (
    request.targetPaths !== undefined &&
    (!Array.isArray(request.targetPaths) ||
      !request.targetPaths.every(isSafeRelativePath))
  ) {
    throw statusError(
      400,
      "targetPaths must be an array of relative sandbox paths.",
    );
  }
  if (
    request.diffText !== undefined &&
    (typeof request.diffText !== "string" || request.diffText.length > 100_000)
  ) {
    throw statusError(
      400,
      "diffText must be a string shorter than 100000 characters.",
    );
  }
}

async function contextsFromTargetPaths(
  root: string,
  targetPaths: string[],
): Promise<WorkbenchContextSection[]> {
  const primaryTarget = targetPaths[0] ?? ".";
  const stack = await loadFingerprintStackForPath(primaryTarget, root);
  const context = fingerprintStackToPackageContext(
    stack,
    undefined,
    targetPaths,
  );
  return [
    sectionFromEntrypoint(
      root,
      "context-1",
      "Selected Context",
      context,
      stack.layers.at(-1)?.dir,
    ),
  ];
}

export async function contextsFromDiff(
  root: string,
  diffText: string,
): Promise<WorkbenchContextSection[]> {
  const changedFiles = parseUnifiedDiff(diffText).map((file) => file.path);
  if (changedFiles.length === 0) return contextsFromTargetPaths(root, ["."]);

  const groups = await groupFingerprintStacksForPaths(changedFiles, root);
  return groups.map((group, index) => {
    const context = fingerprintStackToPackageContext(
      group.stack,
      undefined,
      group.changed_files,
    );
    return sectionFromEntrypoint(
      root,
      `context-${index + 1}`,
      groups.length === 1
        ? "Selected Context"
        : `Context ${index + 1}: ${displayPath(
            root,
            group.stack.layers.at(-1)?.dir,
          )}`,
      context,
      group.stack.layers.at(-1)?.dir,
      group.changed_files,
    );
  });
}

function sectionFromEntrypoint(
  root: string,
  id: string,
  title: string,
  context: Parameters<typeof buildContextEntrypoint>[0],
  packageDir?: string,
  changedFiles: string[] = context.targetPaths ?? [],
): WorkbenchContextSection {
  const entrypoint = buildContextEntrypoint(context, {
    targetPaths: changedFiles.length > 0 ? changedFiles : context.targetPaths,
  });
  const normalized = normalizeEntrypoint(root, entrypoint);
  const markdown = formatContextEntrypointMarkdown(
    normalized as unknown as ContextEntrypoint,
  );
  const section = {
    id,
    title,
    packageDir: displayPath(root, packageDir ?? context.fingerprintDir),
    changedFiles,
    entrypoint: normalized,
    markdown,
  };
  return {
    ...section,
    trace: buildContextTraceGraph(section),
  };
}

function normalizeEntrypoint(
  root: string,
  entrypoint: ContextEntrypoint,
): WorkbenchEntrypoint {
  const normalized = structuredClone(entrypoint) as WorkbenchEntrypoint;
  normalized.match.sourceLayers = normalized.match.sourceLayers.map((path) =>
    displayPath(root, path),
  );
  if (normalized.generatedCache.state !== "missing") {
    normalized.generatedCache.path = displayPath(
      root,
      normalized.generatedCache.path,
    );
  } else {
    normalized.generatedCache.path = displayPath(
      root,
      normalized.generatedCache.path,
    );
  }
  return normalized;
}

function displayPath(root: string, path: string | undefined): string {
  if (!path) return ".";
  if (!isAbsolute(path)) return path;
  const rel = relative(root, path);
  if (!rel) return ".";
  return rel.startsWith("..") ? path : rel;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.split(/[\\/]/).includes("..")
  );
}

export function statusError(
  status: number,
  message: string,
): Error & {
  status: number;
} {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}
