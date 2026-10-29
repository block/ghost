import { createHash } from "node:crypto";
import { readdir, readFile, readlink } from "node:fs/promises";
import { join } from "node:path";

export interface GhostPackageIdentity {
  id: string;
  version: string | null;
  hash: string;
}

export interface GhostProvenance {
  package: GhostPackageIdentity;
  baseline: GhostPackageIdentity | null;
}

/** SHA-256 over sorted relative paths and bytes; local dotfiles are excluded. */
export async function hashGhostPackage(packageDir: string): Promise<string> {
  const paths = new Map<string, "file" | "symlink">();
  async function walk(dir: string, prefix: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), path);
      else if (entry.isFile()) paths.set(path, "file");
      else if (entry.isSymbolicLink()) paths.set(path, "symlink");
    }
  }
  await walk(packageDir, "");
  const hash = createHash("sha256").update("ghost.package.sha256/v1\0");
  function field(bytes: Uint8Array): void {
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.byteLength));
    hash.update(length).update(bytes);
  }
  for (const path of [...paths.keys()].sort()) {
    const kind = paths.get(path) ?? "file";
    field(Buffer.from(kind, "utf8"));
    field(Buffer.from(path, "utf8"));
    field(
      kind === "symlink"
        ? Buffer.from(await readlink(join(packageDir, path)), "utf8")
        : await readFile(join(packageDir, path)),
    );
  }
  return `sha256:${hash.digest("hex")}`;
}

/** Machine-readable identity footer without adding guidance to the packet. */
export function formatProvenance(provenance: GhostProvenance): string {
  return `<!-- ghost provenance ${JSON.stringify(provenance).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e")} -->\n`;
}
