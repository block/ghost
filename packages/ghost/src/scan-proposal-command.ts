import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { CAC } from "cac";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_PROPOSAL_SCHEMA,
  type GhostProposalDocument,
  lintGhostProposal,
} from "#ghost-core";
import {
  type GhostMemoryStack,
  loadMemoryStackForPath,
  normalizeMemoryDir,
} from "./scan/index.js";

export function registerProposalCommand(cli: CAC): void {
  cli
    .command(
      "proposal <op> [id]",
      "Create, list, or resolve scoped Ghost memory proposals.",
    )
    .option("--path <path>", "Repo path used to resolve the memory stack", {
      default: ".",
    })
    .option(
      "--memory-dir <relative-dir>",
      "Relative memory package directory for proposal stack resolution (default: .ghost)",
    )
    .option("--id <id>", "Proposal id for create")
    .option("--kind <kind>", "Proposal kind for create")
    .option("--title <title>", "Proposal title for create")
    .option("--claim <text>", "Proposal claim for create")
    .option("--rationale <text>", "Proposal rationale for create")
    .option(
      "--target <target>",
      "Proposed target: fingerprint, checks, or review_policy",
      { default: "fingerprint" },
    )
    .option("--summary <text>", "Proposed action summary for create")
    .option(
      "--evidence <path-or-note>",
      "Evidence path or note for create; repeat or comma-separate for multiple values",
    )
    .option(
      "--status <status>",
      "Resolution status: accepted, rejected, or superseded",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (op: string, idArg: string | undefined, opts) => {
      try {
        if (op === "create") {
          const result = await createScopedProposal(idArg, opts);
          writeProposalCommandResult(result, opts.format);
          process.exit(0);
          return;
        }
        if (op === "list") {
          const stack = await loadMemoryStackForPath(
            typeof opts.path === "string" ? opts.path : ".",
            process.cwd(),
            { memoryDir: memoryDirFromOpts(opts) },
          );
          writeProposalList(stack, opts.format);
          process.exit(0);
          return;
        }
        if (op === "resolve") {
          const result = await resolveScopedProposal(idArg, opts);
          writeProposalCommandResult(result, opts.format);
          process.exit(0);
          return;
        }

        console.error(
          `Error: unknown proposal op '${op}'. Supported: create, list, resolve`,
        );
        process.exit(2);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

async function createScopedProposal(
  idArg: string | undefined,
  opts: Record<string, unknown>,
): Promise<ProposalCommandResult> {
  const targetPath = typeof opts.path === "string" ? opts.path : ".";
  const stack = await loadMemoryStackForPath(targetPath, process.cwd(), {
    memoryDir: memoryDirFromOpts(opts),
  });
  const layer = stack.layers.at(-1);
  if (!layer) throw new Error("No memory stack layer found for proposal path.");

  const id = requiredString(idArg ?? opts.id, "proposal id");
  const kind = requiredString(opts.kind, "proposal kind");
  const title = requiredString(opts.title, "proposal title");
  const claim = requiredString(opts.claim, "proposal claim");
  const rationale = requiredString(opts.rationale, "proposal rationale");
  const target = requiredString(opts.target, "proposal target");
  const summary = requiredString(opts.summary, "proposal action summary");
  if (!isProposalKind(kind))
    throw new Error(`Unsupported proposal kind: ${kind}`);
  if (!isProposalTarget(target)) {
    throw new Error(`Unsupported proposal target: ${target}`);
  }

  const scopedPath = toLayerRelativePath(layer.root, targetPath);
  const proposal: GhostProposalDocument = {
    schema: GHOST_PROPOSAL_SCHEMA,
    id,
    status: "open",
    kind,
    title,
    claim,
    rationale,
    ...(scopedPath !== "." ? { scope: { paths: [scopedPath] } } : {}),
    evidence: proposalEvidence(opts.evidence, layer.root),
    proposed_action: {
      target,
      summary,
    },
  };
  assertProposalIsValid(proposal);

  const proposalDir = join(layer.dir, "proposals");
  await mkdir(proposalDir, { recursive: true });
  const outPath = join(proposalDir, `${id}.yml`);
  if (await fileExists(outPath)) {
    throw new Error(`Proposal already exists: ${outPath}`);
  }
  await writeFile(outPath, stringifyYaml(proposal, { lineWidth: 0 }), "utf-8");
  return { package_dir: layer.dir, path: outPath, proposal };
}

async function resolveScopedProposal(
  idArg: string | undefined,
  opts: Record<string, unknown>,
): Promise<ProposalCommandResult> {
  const id = requiredString(idArg ?? opts.id, "proposal id");
  const status = requiredString(opts.status, "proposal status");
  if (!isResolveStatus(status)) {
    throw new Error(
      "Proposal resolve --status must be accepted, rejected, or superseded",
    );
  }

  const targetPath = typeof opts.path === "string" ? opts.path : ".";
  const stack = await loadMemoryStackForPath(targetPath, process.cwd(), {
    memoryDir: memoryDirFromOpts(opts),
  });
  const found = await findProposalFileInStack(stack, id);
  if (!found) {
    throw new Error(`No proposal '${id}' found in resolved memory stack.`);
  }
  const proposal = parseYaml(
    await readFile(found.path, "utf-8"),
  ) as GhostProposalDocument;
  proposal.status = status;
  assertProposalIsValid(proposal);
  await writeFile(
    found.path,
    stringifyYaml(proposal, { lineWidth: 0 }),
    "utf-8",
  );
  return { package_dir: found.layer.dir, path: found.path, proposal };
}

function writeProposalCommandResult(
  result: ProposalCommandResult,
  format: unknown,
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(
    `${result.proposal.id}: ${result.proposal.status} in ${result.path}\n`,
  );
}

function writeProposalList(stack: GhostMemoryStack, format: unknown): void {
  if (format === "json") {
    process.stdout.write(
      `${JSON.stringify(
        {
          target_path: stack.target_path,
          memory_dir: stack.memory_dir,
          layers: stack.layers.map((layer) => ({
            dir: layer.dir,
            relative_root: layer.relative_root,
            memory_dir: layer.memory_dir,
          })),
          open_proposals: stack.merged.open_proposals,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(`target: ${stack.target_path}\n`);
  if (stack.merged.open_proposals.length === 0) {
    process.stdout.write("open proposals: none\n");
    return;
  }
  process.stdout.write("open proposals:\n");
  for (const proposal of stack.merged.open_proposals) {
    process.stdout.write(`  - ${proposal.id}: ${proposal.title}\n`);
  }
}

interface ProposalCommandResult {
  package_dir: string;
  path: string;
  proposal: GhostProposalDocument;
}

async function findProposalFileInStack(
  stack: GhostMemoryStack,
  id: string,
): Promise<{ layer: GhostMemoryStack["layers"][number]; path: string } | null> {
  for (const layer of [...stack.layers].reverse()) {
    const proposalDir = join(layer.dir, "proposals");
    const direct = [
      join(proposalDir, `${id}.yml`),
      join(proposalDir, `${id}.yaml`),
    ];
    for (const path of direct) {
      if (await proposalFileHasId(path, id)) return { layer, path };
    }

    let entries: Dirent<string>[];
    try {
      entries = await readdir(proposalDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
      const path = join(proposalDir, entry.name);
      if (direct.includes(path)) continue;
      if (await proposalFileHasId(path, id)) return { layer, path };
    }
  }
  return null;
}

async function proposalFileHasId(path: string, id: string): Promise<boolean> {
  try {
    const parsed = parseYaml(await readFile(path, "utf-8")) as { id?: unknown };
    return parsed.id === id;
  } catch {
    return false;
  }
}

function proposalEvidence(
  evidence: unknown,
  layerRoot: string,
): GhostProposalDocument["evidence"] {
  const values = splitOptionValues(evidence);
  if (values.length === 0) {
    return [{ note: "Created by ghost proposal create." }];
  }
  return values.map((value) => {
    if (value.startsWith("note:")) {
      return { note: value.slice("note:".length).trim() };
    }
    return { path: toLayerRelativePath(layerRoot, value) };
  });
}

function splitOptionValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(splitOptionValues);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toLayerRelativePath(layerRoot: string, value: string): string {
  const absolute = isAbsolute(value) ? value : resolve(process.cwd(), value);
  const rel = relative(layerRoot, absolute);
  if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
    return rel.replaceAll(sep, "/");
  }
  return value.replaceAll(sep, "/");
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required ${label}.`);
  }
  return value.trim();
}

function isProposalKind(value: string): value is GhostProposalDocument["kind"] {
  return (
    value === "missing-memory" ||
    value === "intentional-divergence" ||
    value === "experience-gap" ||
    value === "check-candidate"
  );
}

function isProposalTarget(
  value: string,
): value is GhostProposalDocument["proposed_action"]["target"] {
  return (
    value === "fingerprint" || value === "checks" || value === "review_policy"
  );
}

function isResolveStatus(
  value: string,
): value is Exclude<GhostProposalDocument["status"], "open"> {
  return value === "accepted" || value === "rejected" || value === "superseded";
}

function assertProposalIsValid(proposal: GhostProposalDocument): void {
  const report = lintGhostProposal(proposal);
  if (report.errors === 0) return;
  const first = report.issues.find((issue) => issue.severity === "error");
  const suffix = first?.path ? ` @ ${first.path}` : "";
  throw new Error(
    `proposal failed lint: ${first?.message ?? "invalid proposal"}${suffix}`,
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function memoryDirFromOpts(opts: Record<string, unknown>): string {
  return normalizeMemoryDir(
    typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
  );
}
