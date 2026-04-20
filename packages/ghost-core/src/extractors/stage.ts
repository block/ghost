import { cp, mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Target } from "../types.js";
import { materializeGithub } from "./sources/github.js";
import { materializeNpm } from "./sources/npm.js";
import { materializeUrl } from "./sources/url.js";

export interface StagedSource {
  label: string;
  target: Target;
  /** Directory the agent sees for this source (under `cwd` when multi). */
  dir: string;
}

export interface StagedTargets {
  /** Working directory for the agent. Single local path is returned verbatim. */
  cwd: string;
  sources: StagedSource[];
  /** True when a temporary staging root was created. */
  staged: boolean;
}

/**
 * Prepare one or more targets for a single Agent SDK run.
 *
 *   1 local path   → return the path (no staging, no copy).
 *   1 remote       → materialize to a temp dir, use that as cwd.
 *   N targets      → materialize each, symlink into a shared staging root
 *                    under sibling subdirs labelled per source.
 *
 * Falls back to `cp -R` if symlinks fail (rare, some filesystems).
 */
export async function stageTargets(targets: Target[]): Promise<StagedTargets> {
  if (targets.length === 0) {
    throw new Error("stageTargets requires at least one target.");
  }

  const materialized = await Promise.all(
    targets.map(async (target) => ({
      target,
      dir: await materialize(target),
      label: labelFor(target),
    })),
  );

  if (materialized.length === 1) {
    const only = materialized[0];
    return {
      cwd: only.dir,
      sources: [{ label: only.label, target: only.target, dir: only.dir }],
      staged: only.target.type !== "path",
    };
  }

  const stagingRoot = await mkdtemp(join(tmpdir(), "ghost-stage-"));
  const sources: StagedSource[] = [];

  for (const m of materialized) {
    const subdir = join(stagingRoot, safeLabel(m.label));
    try {
      await symlink(m.dir, subdir, "dir");
    } catch {
      await cp(m.dir, subdir, { recursive: true });
    }
    sources.push({ label: m.label, target: m.target, dir: subdir });
  }

  return { cwd: stagingRoot, sources, staged: true };
}

async function materialize(target: Target): Promise<string> {
  switch (target.type) {
    case "path":
      return resolve(process.cwd(), target.value);
    case "url":
    case "registry":
    case "doc-site":
      return materializeUrl(target.value);
    case "npm":
      return materializeNpm(target.value);
    case "github":
      return materializeGithub(target.value, target.options?.branch);
    case "figma":
      throw new Error("Figma extraction not yet implemented");
    default:
      throw new Error(`Unsupported target type: ${target.type}`);
  }
}

function labelFor(target: Target): string {
  if (target.name) return target.name;
  if (target.type === "path") {
    const parts = target.value.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "source";
  }
  return `${target.type}-${target.value}`;
}

function safeLabel(label: string): string {
  return (
    label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "src"
  );
}
