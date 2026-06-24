export interface ReferenceInventoryInput {
  id: string;
  source: string;
  fingerprint?: string;
}

export function normalizeReferenceInput(
  reference: string,
): ReferenceInventoryInput {
  const normalized = reference.replace(/\\/g, "/").replace(/\/+$/, "");
  const explicitRegistry = normalized.startsWith("registry:");
  const isLegacyFingerprint = /(^|\/)fingerprint\.ya?ml$/i.test(normalized);
  const isPackageManifest = /(^|\/)manifest\.ya?ml$/i.test(normalized);
  const isFingerprint = isLegacyFingerprint || isPackageManifest;
  const baseReference = isPackageManifest
    ? normalized.replace(/\/manifest\.ya?ml$/i, "")
    : isLegacyFingerprint
      ? normalized.replace(/\/fingerprint\.ya?ml$/i, "")
      : normalized;
  const ghostIndex = baseReference.lastIndexOf("/.ghost");
  const sourcePath =
    ghostIndex >= 0
      ? baseReference.slice(0, ghostIndex)
      : isFingerprint
        ? baseReference
        : normalized;
  const registrySource = inferRegistrySource(normalized, sourcePath);
  const source = registrySource
    ? registrySource
    : normalized.startsWith("npm:")
      ? normalized
      : normalized.startsWith("workspace:")
        ? `workspace:${sourcePath.replace(/^workspace:/, "")}`
        : normalized.startsWith("@")
          ? `npm:${normalized}`
          : `workspace:${sourcePath}`;
  const fingerprintBase = normalized.replace(/^workspace:/, "");
  const fingerprint = isFingerprint
    ? fingerprintBase
    : ghostIndex >= 0
      ? `${fingerprintBase}/manifest.yml`
      : undefined;
  const referenceIdSource =
    source.startsWith("registry:") &&
    (explicitRegistry || /(^|\/)registry\.json$/i.test(normalized))
      ? source
          .slice("registry:".length)
          .replace(/\/public\/r\/registry\.json$/i, "")
          .replace(/\/r\/registry\.json$/i, "")
          .replace(/\/registry\.json$/i, "")
      : sourcePath;
  return {
    id: inferReferenceId(referenceIdSource),
    source,
    ...(fingerprint ? { fingerprint } : {}),
  };
}

function inferRegistrySource(
  normalized: string,
  sourcePath: string,
): string | undefined {
  if (normalized.startsWith("registry:")) return normalized;
  if (/\/r\/registry\.json$/i.test(normalized)) {
    return `registry:${normalized}`;
  }
  if (/(^|\/)registry\.json$/i.test(normalized)) {
    return `registry:${normalized}`;
  }
  if (inferReferenceId(sourcePath) === "ghost-ui") {
    return `registry:${sourcePath}/public/r/registry.json`;
  }
  return undefined;
}

function inferReferenceId(source: string): string {
  const npmName = source.match(/(?:^npm:)?(@[^/]+\/[^/]+|[^/:]+)$/)?.[1];
  const pathName = source
    .replace(/^workspace:/, "")
    .replace(/^registry:/, "")
    .split("/")
    .filter(Boolean)
    .at(-1);
  const id = (npmName ?? pathName ?? "reference")
    .replace(/^@/, "")
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return id || "reference";
}
