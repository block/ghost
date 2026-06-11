import { readdir } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
import type {
  GhostChecksDocument,
  GhostFingerprintDocument,
  GhostFingerprintPackageManifest,
} from "#ghost-core";
import { loadPackageContext } from "../../../../packages/ghost/src/scan/context/package-context";
import {
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "../../../../packages/ghost/src/scan/fingerprint-package";
import {
  type DiscoveredGhostPackage,
  discoverGhostPackages,
  groupFingerprintStacksForPaths,
} from "../../../../packages/ghost/src/scan/fingerprint-stack";
import type { LintReport } from "../../../../packages/ghost/src/scan/lint";
import type { VerifyFingerprintReport } from "../../../../packages/ghost/src/scan/verify-fingerprint";
import { verifyFingerprintPackage } from "../../../../packages/ghost/src/scan/verify-package";
import type {
  WorkbenchFingerprintHealth,
  WorkbenchFingerprintLayerView,
  WorkbenchFingerprintPackageSummary,
  WorkbenchFingerprintRefSummary,
  WorkbenchFingerprintStackPreview,
  WorkbenchFingerprintStudioResult,
  WorkbenchPackageInventory,
} from "../shared";
import { type InspectScenarioHooks, statusError } from "./inspect";
import { createSandbox, removeSandbox } from "./sandbox";
import { getScenario, toDetail } from "./scenarios";

export async function runFingerprintStudio(
  id: string,
  hooks: InspectScenarioHooks = {},
): Promise<WorkbenchFingerprintStudioResult> {
  const scenario = getScenario(id);
  if (!scenario) throw statusError(404, `Unknown scenario: ${id}`);

  const root = await createSandbox({
    kind: scenario.sandbox,
    cache: scenario.cache,
  });

  try {
    hooks.onSandboxCreated?.(root);
    const discovered = await discoverGhostPackages(root);
    const packages = await Promise.all(
      discovered.map((pkg) => summarizePackage(root, pkg)),
    );
    const stackPreviews = await buildStackPreviews(
      root,
      scenario.defaultTargetPaths,
    );

    return {
      scenario: toDetail(scenario),
      packages,
      stackPreviews,
      lesson:
        "Fingerprint Studio reads the durable .ghost/fingerprint package contract that the other Workbench modes consume.",
    };
  } finally {
    await removeSandbox(root);
  }
}

async function summarizePackage(
  sandboxRoot: string,
  pkg: DiscoveredGhostPackage,
): Promise<WorkbenchFingerprintPackageSummary> {
  const paths = resolveFingerprintPackage(pkg.dir, sandboxRoot);
  const [context, loaded, lintReport, verifyReport, decisions] =
    await Promise.all([
      loadPackageContext(paths),
      loadFingerprintPackage(paths),
      lintFingerprintPackage(pkg.dir, sandboxRoot),
      verifyFingerprintPackage(pkg.dir, sandboxRoot, { root: pkg.root }),
      readDecisionPaths(sandboxRoot, paths.decisions),
    ]);
  const packageDir = displayPath(sandboxRoot, pkg.dir);
  const manifest = loaded.manifest as GhostFingerprintPackageManifest;

  return {
    packageDir,
    root: displayPath(sandboxRoot, pkg.root),
    fingerprintDir: displayPath(sandboxRoot, paths.fingerprintDir),
    manifest: {
      schema: manifest.schema,
      id: manifest.id,
    },
    ...(context.fingerprint.prose.summary.product
      ? { product: context.fingerprint.prose.summary.product }
      : {}),
    layers: layerViews(sandboxRoot, paths, context.fingerprintLayers, {
      checks: context.checksRaw,
      intent: context.intent,
    }),
    refs: refSummaries(packageDir, context.fingerprint, context.checks),
    health: buildHealth(lintReport, verifyReport),
    inventory: normalizeInventory(sandboxRoot, context.inventory),
    decisions,
    counts: {
      scopes: context.fingerprint.inventory.topology.scopes?.length ?? 0,
      prose:
        context.fingerprint.prose.situations.length +
        context.fingerprint.prose.principles.length +
        context.fingerprint.prose.experience_contracts.length,
      exemplars: context.fingerprint.inventory.exemplars.length,
      composition: context.fingerprint.composition.patterns.length,
      activeChecks:
        context.checks?.checks.filter((check) => check.status === "active")
          .length ?? 0,
      advisoryChecks:
        context.checks?.checks.filter((check) => check.status !== "active")
          .length ?? 0,
    },
  };
}

function layerViews(
  sandboxRoot: string,
  paths: ReturnType<typeof resolveFingerprintPackage>,
  layers:
    | {
        manifest: string;
        prose?: string;
        inventory?: string;
        composition?: string;
      }
    | undefined,
  support: {
    checks?: string;
    intent?: string;
  },
): WorkbenchFingerprintLayerView[] {
  return [
    {
      id: "manifest",
      title: "Package manifest",
      path: displayPath(sandboxRoot, paths.manifest),
      state: "present",
      role: "package-anchor",
      raw: layers?.manifest ?? "",
      note: "Anchors the portable fingerprint package.",
    },
    {
      id: "prose",
      title: "Prose",
      path: displayPath(sandboxRoot, paths.prose),
      state: layers?.prose ? "present" : "missing",
      role: "generation-input",
      ...(layers?.prose ? { raw: layers.prose } : {}),
      note: "Canonical intent: product summary, situations, principles, and contracts.",
    },
    {
      id: "inventory",
      title: "Inventory",
      path: displayPath(sandboxRoot, paths.inventory),
      state: layers?.inventory ? "present" : "missing",
      role: "generation-input",
      ...(layers?.inventory ? { raw: layers.inventory } : {}),
      note: "Canonical curated material: topology, building blocks, exemplars, and sources.",
    },
    {
      id: "composition",
      title: "Composition",
      path: displayPath(sandboxRoot, paths.composition),
      state: layers?.composition ? "present" : "missing",
      role: "generation-input",
      ...(layers?.composition ? { raw: layers.composition } : {}),
      note: "Canonical experience patterns and composition guidance.",
    },
    {
      id: "checks",
      title: "Checks",
      path: displayPath(sandboxRoot, paths.checks),
      state: support.checks ? "present" : "missing",
      role: "deterministic-gate",
      ...(support.checks ? { raw: support.checks } : {}),
      note: "Deterministic gates. Active checks can block; proposed and disabled checks remain advisory.",
    },
    {
      id: "intent",
      title: "Intent memory",
      path: displayPath(sandboxRoot, paths.intent),
      state: support.intent ? "present" : "missing",
      role: "human-context",
      ...(support.intent ? { raw: support.intent } : {}),
      note: "Optional human-authored or human-approved context; absent in the canned v1 fixtures.",
    },
  ];
}

function refSummaries(
  packageDir: string,
  fingerprint: GhostFingerprintDocument,
  checks: GhostChecksDocument | undefined,
): WorkbenchFingerprintRefSummary[] {
  const referenceCounts = collectReferenceCounts(fingerprint, checks);
  const refs: WorkbenchFingerprintRefSummary[] = [];
  const withCount = (ref: string) => referenceCounts.get(ref) ?? 0;

  for (const situation of fingerprint.prose.situations) {
    const ref = `prose.situation:${situation.id}`;
    refs.push({
      ref,
      group: "prose",
      kind: "situation",
      title: situation.title ?? situation.id,
      summary: joinSummary([
        situation.user_intent,
        situation.product_obligation,
      ]),
      sourceFile: "fingerprint/prose.yml",
      packageDir,
      referenceCount: withCount(ref),
    });
  }

  for (const principle of fingerprint.prose.principles) {
    const ref = `prose.principle:${principle.id}`;
    refs.push({
      ref,
      group: "prose",
      kind: "principle",
      title: principle.id,
      summary: principle.principle,
      sourceFile: "fingerprint/prose.yml",
      packageDir,
      referenceCount: withCount(ref),
    });
  }

  for (const contract of fingerprint.prose.experience_contracts) {
    const ref = `prose.experience_contract:${contract.id}`;
    refs.push({
      ref,
      group: "prose",
      kind: "experience contract",
      title: contract.id,
      summary: contract.contract,
      sourceFile: "fingerprint/prose.yml",
      packageDir,
      referenceCount: withCount(ref),
    });
  }

  for (const exemplar of fingerprint.inventory.exemplars) {
    const ref = `inventory.exemplar:${exemplar.id}`;
    refs.push({
      ref,
      group: "inventory",
      kind: "exemplar",
      title: exemplar.title ?? exemplar.id,
      summary: exemplar.why ?? exemplar.note ?? exemplar.path,
      sourceFile: "fingerprint/inventory.yml",
      packageDir,
      referenceCount: withCount(ref),
    });
  }

  for (const pattern of fingerprint.composition.patterns) {
    const ref = `composition.pattern:${pattern.id}`;
    refs.push({
      ref,
      group: "composition",
      kind: pattern.kind,
      title: pattern.id,
      summary: pattern.pattern,
      sourceFile: "fingerprint/composition.yml",
      packageDir,
      referenceCount: withCount(ref),
    });
  }

  for (const check of checks?.checks ?? []) {
    const ref = `check:${check.id}`;
    refs.push({
      ref,
      group: "checks",
      kind: "check",
      title: check.title,
      summary: check.repair ?? check.detector.type,
      sourceFile: "fingerprint/enforcement/checks.yml",
      packageDir,
      referenceCount: withCount(ref),
      status: check.status,
      severity: check.severity,
    });
  }

  return refs;
}

function collectReferenceCounts(
  fingerprint: GhostFingerprintDocument,
  checks: GhostChecksDocument | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (refs: readonly string[] | undefined) => {
    refs?.forEach((ref) => {
      counts.set(ref, (counts.get(ref) ?? 0) + 1);
    });
  };

  for (const situation of fingerprint.prose.situations) {
    add(situation.principles);
    add(situation.experience_contracts);
    add(situation.patterns);
  }
  for (const principle of fingerprint.prose.principles) {
    add(principle.check_refs);
  }
  for (const contract of fingerprint.prose.experience_contracts) {
    add(contract.check_refs);
  }
  for (const exemplar of fingerprint.inventory.exemplars) {
    add(exemplar.refs);
  }
  for (const pattern of fingerprint.composition.patterns) {
    add(pattern.check_refs);
  }
  for (const check of checks?.checks ?? []) {
    add(check.derivation?.prose);
    add(check.derivation?.inventory);
    add(check.derivation?.composition);
  }

  return counts;
}

async function buildStackPreviews(
  sandboxRoot: string,
  targetPaths: string[],
): Promise<WorkbenchFingerprintStackPreview[]> {
  const groups = await groupFingerprintStacksForPaths(targetPaths, sandboxRoot);
  return groups.map((group, index) => {
    const localPackageDir = displayPath(
      sandboxRoot,
      group.stack.layers.at(-1)?.dir,
    );
    return {
      id: `stack-${index + 1}`,
      title:
        groups.length === 1
          ? `Stack: ${localPackageDir}`
          : `Stack ${index + 1}: ${localPackageDir}`,
      targetPaths: group.changed_files,
      packageDirs: group.stack.layers.map((layer) =>
        displayPath(sandboxRoot, layer.dir),
      ),
      localPackageDir,
      mergePolicy: group.stack.provenance.merge,
      mergedRefs: {
        prose: [
          ...group.stack.merged.fingerprint.prose.situations.map(
            (entry) => `prose.situation:${entry.id}`,
          ),
          ...group.stack.merged.fingerprint.prose.principles.map(
            (entry) => `prose.principle:${entry.id}`,
          ),
          ...group.stack.merged.fingerprint.prose.experience_contracts.map(
            (entry) => `prose.experience_contract:${entry.id}`,
          ),
        ],
        inventory: group.stack.merged.fingerprint.inventory.exemplars.map(
          (entry) => `inventory.exemplar:${entry.id}`,
        ),
        composition: group.stack.merged.fingerprint.composition.patterns.map(
          (entry) => `composition.pattern:${entry.id}`,
        ),
        checks: group.stack.merged.checks.checks.map(
          (check) => `check:${check.id}`,
        ),
      },
    };
  });
}

function buildHealth(
  lintReport: LintReport,
  verifyReport: VerifyFingerprintReport,
): WorkbenchFingerprintHealth {
  const issues: WorkbenchFingerprintHealth["issues"] = [
    ...lintReport.issues.map((issue) => ({
      ...issue,
      source: "lint" as const,
    })),
    ...verifyReport.issues.map((issue) => ({
      severity: issue.severity,
      rule: issue.rule,
      message: issue.message,
      ...(issue.path ? { path: issue.path } : {}),
      source: "verify" as const,
    })),
  ];
  const status = issues.some((issue) => issue.severity === "error")
    ? "error"
    : issues.some((issue) => issue.severity === "warning")
      ? "warning"
      : "ok";
  return { status, issues };
}

function normalizeInventory(
  sandboxRoot: string,
  inventory: WorkbenchPackageInventory,
): WorkbenchPackageInventory {
  if (inventory.state === "missing") {
    return { ...inventory, path: displayPath(sandboxRoot, inventory.path) };
  }
  if (inventory.state === "unreadable") {
    return { ...inventory, path: displayPath(sandboxRoot, inventory.path) };
  }
  return { ...inventory, path: displayPath(sandboxRoot, inventory.path) };
}

async function readDecisionPaths(
  sandboxRoot: string,
  decisionsDir: string,
): Promise<WorkbenchFingerprintPackageSummary["decisions"]> {
  try {
    const entries = await readdir(decisionsDir, { withFileTypes: true });
    const paths = entries
      .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
      .map((entry) => displayPath(sandboxRoot, `${decisionsDir}/${entry.name}`))
      .sort();
    return { count: paths.length, paths };
  } catch {
    return { count: 0, paths: [] };
  }
}

function joinSummary(values: Array<string | undefined>): string {
  const summary = values.filter(Boolean).join(" ");
  return summary || "No summary text supplied.";
}

function displayPath(root: string, path: string | undefined): string {
  if (!path) return ".";
  if (!isAbsolute(path)) return path;
  const rel = relative(root, path).replaceAll(sep, "/");
  if (!rel) return ".";
  return rel.startsWith("..") ? path : rel;
}
