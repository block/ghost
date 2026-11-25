import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { TemplateFile } from "./templates.js";

/**
 * Payload roots, first match wins. At runtime this module lives in
 * `dist/scan/`, so `../init-payloads` is the packed payload dir. Under
 * vitest it runs from `src/scan/`, where `../init-payloads` is the source
 * payload dir. Published installs use the first root.
 */
const INIT_PAYLOAD_ROOTS = [
  fileURLToPath(new URL("../init-payloads", import.meta.url)),
  fileURLToPath(new URL("../../dist/init-payloads", import.meta.url)),
];

export async function loadPackedPayload(name: string): Promise<TemplateFile[]> {
  const payloadDir = resolvePayloadDir(name);
  const files = await listPayloadFiles(payloadDir);

  return Promise.all(
    files.map(async (path) => ({
      relativePath: relative(payloadDir, path),
      content: await readFile(path, "utf-8"),
    })),
  );
}

export async function loadPayloadFile(
  payload: string,
  relativePath: string,
): Promise<string> {
  return readFile(join(resolvePayloadDir(payload), relativePath), "utf-8");
}

function resolvePayloadDir(name: string): string {
  return (
    INIT_PAYLOAD_ROOTS.map((root) => join(root, name)).find((dir) =>
      existsSync(dir),
    ) ?? join(INIT_PAYLOAD_ROOTS[0], name)
  );
}

async function listPayloadFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listPayloadFiles(path);
      if (entry.isFile()) return [path];
      return [];
    }),
  );

  return files.flat().sort((a, b) => a.localeCompare(b));
}
