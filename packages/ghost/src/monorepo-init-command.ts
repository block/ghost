import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type FingerprintPackagePaths,
  initFingerprintPackage,
  initScopedFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint.js";
import {
  detectMonorepoInitCandidates,
  type MonorepoInitCandidate,
  normalizeGhostDir,
} from "./scan/index.js";

type InitOptions = NonNullable<Parameters<typeof initFingerprintPackage>[2]>;

type MonorepoInitCandidateState = MonorepoInitCandidate & {
  state: "candidate" | "exists";
};

interface MonorepoInitOutput {
  root: Record<string, string>;
  rootState: "created" | "exists";
  mode: "plan" | "apply";
  ghostDir: string;
  candidates: MonorepoInitCandidateState[];
  created: Array<MonorepoInitCandidate & { state: "created" }>;
  skipped: MonorepoInitCandidateState[];
  errors: Array<{ path: string; message: string }>;
  commands: string[];
}

export async function initMonorepoFingerprintPackages(options: {
  ghostDir: string;
  apply: boolean;
  initOptions: InitOptions;
}): Promise<MonorepoInitOutput> {
  const cwd = process.cwd();
  const rootPaths = resolveFingerprintPackage(options.ghostDir, cwd);
  const rootExists = await hasFingerprintPackage(rootPaths);
  const rootState =
    rootExists && !options.initOptions.force ? "exists" : "created";
  const root =
    rootState === "exists"
      ? rootPaths
      : await initFingerprintPackage(
          options.ghostDir,
          cwd,
          options.initOptions,
        );

  const candidates = await Promise.all(
    (await detectMonorepoInitCandidates(cwd)).map(
      async (candidate): Promise<MonorepoInitCandidateState> => ({
        ...candidate,
        state: (await hasScopeFingerprintPackage(
          candidate,
          options.ghostDir,
          cwd,
        ))
          ? "exists"
          : "candidate",
      }),
    ),
  );
  const commands = candidates
    .filter((candidate) => candidate.state === "candidate")
    .map((candidate) =>
      formatScopedInitCommand(candidate.path, options.ghostDir),
    );
  const created: MonorepoInitOutput["created"] = [];
  const skipped: MonorepoInitOutput["skipped"] = candidates.filter(
    (candidate) => candidate.state === "exists",
  );
  const errors: MonorepoInitOutput["errors"] = [];

  if (options.apply) {
    for (const candidate of candidates) {
      if (candidate.state === "exists" && !options.initOptions.force) continue;
      try {
        await initScopedFingerprintPackage(candidate.path, cwd, {
          ...options.initOptions,
          ghostDir: options.ghostDir,
        });
        created.push({ ...stripCandidateState(candidate), state: "created" });
      } catch (err) {
        errors.push({
          path: candidate.path,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    root: initPackageOutput(root),
    rootState,
    mode: options.apply ? "apply" : "plan",
    ghostDir: options.ghostDir,
    candidates,
    created,
    skipped,
    errors,
    commands,
  };
}

export function writeMonorepoInitOutput(
  output: MonorepoInitOutput,
  format: unknown,
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  const rootVerb =
    output.rootState === "exists" ? "Using existing" : "Initialized";
  process.stdout.write(`${rootVerb} Ghost root package: ${output.root.dir}\n`);
  if (output.candidates.length === 0) {
    process.stdout.write("\nNo monorepo child package candidates found.\n");
    return;
  }

  process.stdout.write("\nDetected monorepo child candidates:\n");
  for (const candidate of output.candidates) {
    const suffix = candidate.state === "exists" ? " (exists)" : "";
    process.stdout.write(`  ${candidate.path}${suffix}\n`);
  }

  if (output.mode === "apply") {
    process.stdout.write("\nCreated child packages:\n");
    if (output.created.length === 0) {
      process.stdout.write("  none\n");
    } else {
      for (const candidate of output.created) {
        process.stdout.write(`  ${candidate.path}\n`);
      }
    }
    if (output.skipped.length > 0) {
      process.stdout.write("\nSkipped existing child packages:\n");
      for (const candidate of output.skipped) {
        process.stdout.write(`  ${candidate.path}\n`);
      }
    }
    return;
  }

  if (output.commands.length > 0) {
    process.stdout.write("\nNext:\n");
    for (const command of output.commands) {
      process.stdout.write(`  ${command}\n`);
    }
    process.stdout.write(
      "\nRun ghost init --monorepo --apply to create these child packages.\n",
    );
  } else {
    process.stdout.write("\nAll detected child packages already have Ghost.\n");
  }
}

async function hasScopeFingerprintPackage(
  candidate: MonorepoInitCandidate,
  ghostDir: string,
  cwd: string,
): Promise<boolean> {
  return hasFingerprintPackage(
    resolveFingerprintPackage(ghostDir, resolve(cwd, candidate.path)),
  );
}

async function hasFingerprintPackage(
  paths: Pick<FingerprintPackagePaths, "manifest">,
): Promise<boolean> {
  try {
    return (await stat(paths.manifest)).isFile();
  } catch {
    return false;
  }
}

function stripCandidateState(
  candidate: MonorepoInitCandidateState,
): MonorepoInitCandidate {
  return {
    path: candidate.path,
    source: candidate.source,
    packageJson: candidate.packageJson,
  };
}

function formatScopedInitCommand(path: string, ghostDir: string): string {
  const base = `ghost init --scope ${formatCommandArg(path)}`;
  return ghostDir === normalizeGhostDir()
    ? base
    : `GHOST_PACKAGE_DIR=${formatCommandArg(ghostDir)} ${base}`;
}

function formatCommandArg(value: string): string {
  return /^[A-Za-z0-9._/-]+$/.test(value) ? value : JSON.stringify(value);
}

function initPackageOutput(
  paths: FingerprintPackagePaths,
): Record<string, string> {
  return {
    dir: paths.dir,
    manifest: paths.manifest,
    intent: paths.intent,
    inventory: paths.inventory,
    composition: paths.composition,
    checks: paths.checks,
  };
}
