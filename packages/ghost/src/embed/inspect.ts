import { readFile, stat } from "node:fs/promises";
import { TextDecoder } from "node:util";
import {
  classifyMaterialLocator,
  expandLocalMaterialLocator,
  hasGlobMagic,
  inferMaterialMime,
  isTextMime,
  materialLocatorClaimsPath,
  resolveContainedRealFile,
  resolveLocalMaterialLocator,
  validateMaterialLocator,
} from "#ghost-core";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type {
  GhostEmbedSnapshot,
  GhostInspectPolicy,
  InspectGhostMaterialRequest,
  InspectGhostMaterialResult,
} from "./types.js";

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export async function inspectGhostMaterial(
  snapshot: GhostEmbedSnapshot,
  request: InspectGhostMaterialRequest,
): Promise<InspectGhostMaterialResult> {
  const node = snapshot.catalog.nodes.get(request.nodeId);
  if (node === undefined) {
    return rejected(request, "unknown node");
  }
  const validationError = validateMaterialLocator(request.locator);
  if (validationError !== null) {
    return rejected(request, validationError);
  }

  const declaredLocator = declaredMaterialLocator(
    node.materials ?? [],
    request.locator,
    request.repoRoot,
    snapshot.package.dir,
  );
  if (declaredLocator === undefined) {
    return rejected(request, "locator is not declared by node");
  }

  const classified = classifyMaterialLocator(request.locator);
  if (classified.kind === "url") {
    return rejected(
      request,
      "network material inspection is disabled by policy",
      "url",
    );
  }

  const policy = normalizePolicy(request.policy);
  const expanded = await expandLocalMaterialLocator(request.locator, {
    repoRoot: request.repoRoot,
    packageDir: snapshot.package.dir,
    materialsDir: GHOST_MATERIALS_DIR,
  });

  if (expanded.tier === "referenced" && policy.local === "bundled") {
    return rejected(
      request,
      "referenced material inspection is disabled by policy",
      expanded.tier,
    );
  }
  if (expanded.matches.length === 0) {
    return rejected(request, "locator matched no local files", expanded.tier);
  }
  if (expanded.matches.length > 1 || expanded.truncated) {
    return rejected(
      request,
      "locator matched multiple local files; inspect one matching file path at a time",
      expanded.tier,
    );
  }

  const match = expanded.matches[0];
  if (match === undefined) {
    return rejected(request, "locator matched no local files", expanded.tier);
  }

  let contained: Awaited<ReturnType<typeof resolveContainedRealFile>>;
  try {
    contained = await resolveContainedRealFile(
      match.absolutePath,
      request.repoRoot,
    );
  } catch {
    return rejected(
      request,
      "matched file could not be read",
      expanded.tier,
      match.repoRelativePath,
    );
  }
  if (contained === null) {
    return rejected(
      request,
      "resolved material path escapes repo",
      expanded.tier,
      match.repoRelativePath,
    );
  }

  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(contained.realPath);
  } catch {
    return rejected(
      request,
      "matched file could not be read",
      expanded.tier,
      contained.repoRelativePath,
    );
  }
  if (!info.isFile()) {
    return rejected(
      request,
      "not a file",
      expanded.tier,
      contained.repoRelativePath,
    );
  }
  if (info.size > policy.maxBytes) {
    return rejected(
      request,
      `exceeds ${policy.maxBytes} byte inspect limit`,
      expanded.tier,
      contained.repoRelativePath,
      info.size,
    );
  }

  const { mime, contentKind } = inferMaterialMime(contained.repoRelativePath);
  if (!mimeAllowed(mime, policy.allowedMimeTypes)) {
    return rejected(
      request,
      `MIME type ${mime} is not allowed by policy`,
      expanded.tier,
      contained.repoRelativePath,
      info.size,
      mime,
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(contained.realPath);
  } catch {
    return rejected(
      request,
      "matched file could not be read",
      expanded.tier,
      contained.repoRelativePath,
    );
  }
  if (buffer.byteLength > policy.maxBytes) {
    return rejected(
      request,
      `exceeds ${policy.maxBytes} byte inspect limit`,
      expanded.tier,
      contained.repoRelativePath,
      buffer.byteLength,
      mime,
    );
  }

  const base = {
    ok: true as const,
    nodeId: request.nodeId,
    locator: request.locator,
    tier: expanded.tier,
    path: contained.repoRelativePath,
    byteLength: buffer.byteLength,
    mime,
  };
  if (isTextMime(mime)) {
    try {
      return {
        ...base,
        contentKind: "text",
        encoding: "utf-8",
        text: textDecoder.decode(buffer),
      };
    } catch {
      return rejected(
        request,
        "not valid UTF-8 text",
        expanded.tier,
        contained.repoRelativePath,
        buffer.byteLength,
        mime,
      );
    }
  }
  return {
    ...base,
    contentKind: contentKind === "image" ? "image" : "binary",
  };
}

function declaredMaterialLocator(
  declared: readonly string[],
  requested: string,
  repoRoot: string,
  packageDir: string,
): string | undefined {
  if (declared.includes(requested)) return requested;
  const requestedKind = classifyMaterialLocator(requested);
  if (requestedKind.kind !== "local") return undefined;
  const requestedPath = resolveLocalMaterialLocator(requested, {
    repoRoot,
    packageDir,
    materialsDir: GHOST_MATERIALS_DIR,
  }).pattern;
  return declared.find(
    (locator) =>
      hasGlobMagic(locator) &&
      materialLocatorClaimsPath(locator, requestedPath, {
        repoRoot,
        packageDir,
        materialsDir: GHOST_MATERIALS_DIR,
      }),
  );
}

function normalizePolicy(
  policy: GhostInspectPolicy | undefined,
): Required<GhostInspectPolicy> {
  return {
    local: policy?.local ?? "bundled",
    maxBytes: policy?.maxBytes ?? DEFAULT_MAX_BYTES,
    allowedMimeTypes: policy?.allowedMimeTypes ?? [
      "text/*",
      "image/*",
      "application/octet-stream",
    ],
  };
}

function rejected(
  request: Pick<InspectGhostMaterialRequest, "nodeId" | "locator">,
  reason: string,
  tier?: "bundled" | "referenced" | "url",
  path?: string,
  byteLength?: number,
  mime?: string,
): InspectGhostMaterialResult {
  return {
    ok: false,
    nodeId: request.nodeId,
    locator: request.locator,
    reason,
    ...(tier ? { tier } : {}),
    ...(path ? { path } : {}),
    ...(byteLength !== undefined ? { byteLength } : {}),
    ...(mime ? { mime } : {}),
  };
}

function mimeAllowed(mime: string, allowed: readonly string[]): boolean {
  return allowed.some((entry) => {
    if (entry.endsWith("/*")) return mime.startsWith(entry.slice(0, -1));
    return entry === mime;
  });
}
