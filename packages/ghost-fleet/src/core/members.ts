import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  getEffectiveMapScopes,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  type MapScope,
} from "@ghost/core";
import { FINGERPRINT_FILENAME, loadFingerprint } from "ghost-fingerprint";
import { parse as parseYaml } from "yaml";
import { FLEET_MEMBERS_DIRNAME } from "./schema.js";
import type { FleetMember, MemberSummary } from "./types.js";

const FINGERPRINTS_DIRNAME = "fingerprints";

/**
 * Walk the canonical fleet layout and produce one FleetMember per
 * subdirectory under `<dir>/members/`.
 *
 * The fleet root is the directory you'd pass to `ghost fleet view`. If a
 * `members/` subdir exists, members live there; otherwise we fall back to
 * treating the passed-in directory itself as the members root, so tooling
 * can also point at a flat `members/` directory directly.
 *
 * This never refreshes anything. Missing or malformed files are surfaced via
 * per-member status; nothing is fetched.
 */
export async function loadMembers(dir: string): Promise<FleetMember[]> {
  const root = resolve(dir);
  const membersRoot = pickMembersRoot(root);

  if (!existsSync(membersRoot)) return [];

  const entries = readdirSync(membersRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => !e.name.startsWith("."));

  const members = await Promise.all(
    entries.map((entry) => loadMember(join(membersRoot, entry.name))),
  );

  // Stable order — id ascending — so reports diff cleanly.
  return members.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Resolve the members directory.
 *
 * Convention is `<root>/members/<id>/{map.md,fingerprint.md}`. We also
 * accept being pointed directly at a `members/` directory.
 */
function pickMembersRoot(root: string): string {
  const candidate = join(root, FLEET_MEMBERS_DIRNAME);
  if (existsSync(candidate)) {
    try {
      return statSync(candidate).isDirectory() ? candidate : root;
    } catch {
      return root;
    }
  }
  return root;
}

/**
 * Load a single member directory.
 *
 * Reads map.md, fingerprint.md, and optional .ghost-sync.json. Each is
 * surfaced through a status field so missing/broken inputs are visible
 * without crashing the rest of the load.
 */
async function loadMember(memberPath: string): Promise<FleetMember> {
  const dirName = memberPath.split("/").pop() ?? "";

  const mapPath = join(memberPath, MAP_FILENAME);
  const fingerprintPath = join(memberPath, FINGERPRINT_FILENAME);

  // Default identity is the directory basename; map.md `id` overrides.
  let id = dirName;

  // --- map.md ---
  let map: MapFrontmatter | undefined;
  let mapStatus: FleetMember["mapStatus"] = "missing";
  let mapError: string | undefined;
  if (existsSync(mapPath)) {
    try {
      const raw = await readFile(mapPath, "utf-8");
      map = parseMapFrontmatter(raw);
      if (map?.id) id = map.id;
      mapStatus = "ok";
    } catch (err) {
      mapStatus = "error";
      mapError = err instanceof Error ? err.message : String(err);
    }
  }

  // --- fingerprint.md ---
  let fingerprintStatus: FleetMember["fingerprintStatus"] = "missing";
  let fingerprintError: string | undefined;
  let fingerprint: FleetMember["fingerprint"];
  let fingerprintMtime: string | undefined;
  const fingerprintNodes: FleetMember["fingerprintNodes"] = [];
  if (existsSync(fingerprintPath)) {
    try {
      const parsed = await loadFingerprint(fingerprintPath);
      fingerprint = parsed.fingerprint;
      const mtime = (await stat(fingerprintPath)).mtime;
      fingerprintMtime = mtime.toISOString();
      fingerprintStatus = "ok";
      fingerprintNodes.push({
        id,
        memberId: id,
        kind: "member",
        fingerprint,
        fingerprintPath,
        fingerprintMtime,
      });
    } catch (err) {
      fingerprintStatus = "error";
      fingerprintError = err instanceof Error ? err.message : String(err);
    }
  }

  fingerprintNodes.push(
    ...(await loadScopedFingerprintNodes(memberPath, id, map)),
  );

  // --- .ghost-sync.json (optional) ---
  const tracks = await readTracksTarget(memberPath);

  return {
    id,
    path: memberPath,
    map,
    mapStatus,
    mapError,
    fingerprint,
    fingerprintStatus,
    fingerprintError,
    fingerprintMtime,
    tracks,
    fingerprintNodes,
  };
}

async function loadScopedFingerprintNodes(
  memberPath: string,
  memberId: string,
  map: MapFrontmatter | undefined,
): Promise<FleetMember["fingerprintNodes"]> {
  const scopesDir = join(memberPath, FINGERPRINTS_DIRNAME);
  if (!existsSync(scopesDir)) return [];

  const scopeById = new Map<string, MapScope>();
  if (map) {
    for (const scope of getEffectiveMapScopes(map)) {
      scopeById.set(scope.id, scope);
    }
  }

  const entries = readdirSync(scopesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const nodes: FleetMember["fingerprintNodes"] = [];
  for (const entry of entries) {
    const scopeId = entry.name.slice(0, -".md".length);
    const fingerprintPath = join(scopesDir, entry.name);
    try {
      const parsed = await loadFingerprint(fingerprintPath);
      const fingerprintMtime = (
        await stat(fingerprintPath)
      ).mtime.toISOString();
      const scope = scopeById.get(scopeId);
      nodes.push({
        id: `${memberId}/${scopeId}`,
        memberId,
        kind: "scope",
        fingerprint: parsed.fingerprint,
        fingerprintPath,
        fingerprintMtime,
        scopeId,
        parentId: memberId,
        ...(scope ? { scope } : {}),
      });
    } catch {
      // Parent member status remains focused on canonical map/fingerprint.
      // Malformed scoped overlays simply don't enter the fleet distance graph.
    }
  }

  return nodes;
}

/**
 * Best-effort parse of a map.md frontmatter block.
 *
 * We don't run the full map linter here — fleet's job is to load,
 * not validate. The schema check still rejects clearly-broken frontmatter
 * so callers get a typed `MapFrontmatter` or nothing.
 */
function parseMapFrontmatter(raw: string): MapFrontmatter | undefined {
  const split = splitFrontmatter(raw);
  if (!split) return undefined;
  const yamlObj = parseYaml(split.frontmatter);
  if (yamlObj === null || typeof yamlObj !== "object") return undefined;
  const result = MapFrontmatterSchema.safeParse(yamlObj);
  if (!result.success) {
    throw new Error(
      `map.md frontmatter failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function splitFrontmatter(
  raw: string,
): { frontmatter: string; body: string } | null {
  const stripped = raw.replace(/^﻿/, "");
  if (!stripped.startsWith("---")) return null;
  const lines = stripped.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return null;
  return {
    frontmatter: lines.slice(1, endIndex).join("\n"),
    body: lines.slice(endIndex + 1).join("\n"),
  };
}

/**
 * Read `.ghost-sync.json` and surface its `tracks` field.
 *
 * Fleet doesn't interpret the value — `tracks` may be a target string
 * (`github:org/repo`), a registered fleet member id, or a local path. The
 * skill recipe decides whether the edge points at another member.
 */
async function readTracksTarget(
  memberPath: string,
): Promise<string | undefined> {
  const syncPath = join(memberPath, ".ghost-sync.json");
  if (!existsSync(syncPath)) return undefined;
  try {
    const data = JSON.parse(await readFile(syncPath, "utf-8"));
    const tracks = data?.tracks;
    if (typeof tracks === "string") return tracks;
    // The shared SyncManifest also allows `tracks` to be a Target object.
    if (tracks && typeof tracks === "object") {
      if (typeof tracks.id === "string") return tracks.id;
      if (typeof tracks.target === "string") return tracks.target;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Compact summary row for `ghost fleet members`.
 *
 * Surfaces the freshness signal (fingerprint mtime) and the axes that the
 * group-by tables use, so the CLI can render either a human table or a
 * machine-readable JSON line per member.
 */
export function summarizeMember(member: FleetMember): MemberSummary {
  const platform = member.map?.platform ?? null;
  const build_system = member.map?.build_system ?? null;
  const registry = member.map?.registry ? member.map.registry.path : null;

  return {
    id: member.id,
    platform,
    build_system,
    registry,
    fingerprint_mtime: member.fingerprintMtime ?? null,
    ok: member.mapStatus === "ok" && member.fingerprintStatus === "ok",
    mapStatus: member.mapStatus,
    fingerprintStatus: member.fingerprintStatus,
  };
}
