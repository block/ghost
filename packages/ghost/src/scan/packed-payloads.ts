import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { TemplateFile } from "./templates.js";

/**
 * Payload roots, first match wins. At runtime this module lives in
 * `dist/scan/`, so `../init-payloads` is the packed payload dir. Under
 * vitest it runs from `src/scan/`, where only committed payloads (skeleton)
 * exist — synced payloads (vessel-light) resolve through the built
 * `dist/init-payloads` sibling.
 */
const INIT_PAYLOAD_ROOTS = [
  fileURLToPath(new URL("../init-payloads", import.meta.url)),
  fileURLToPath(new URL("../../dist/init-payloads", import.meta.url)),
];

const BINARY_EXTENSIONS = new Set([".woff", ".woff2"]);

export async function loadPackedPayload(name: string): Promise<TemplateFile[]> {
  const payloadDir = resolvePayloadDir(name);
  const files = await listPayloadFiles(payloadDir);

  return Promise.all(
    files.map(async (path) => ({
      relativePath: relative(payloadDir, path),
      content: await readPayloadFile(path),
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

async function readPayloadFile(path: string): Promise<string | Uint8Array> {
  const bytes = await readFile(path);
  if (isBinaryPayloadPath(path)) return bytes;
  return bytes.toString("utf-8");
}

function isBinaryPayloadPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return BINARY_EXTENSIONS.has(path.slice(dot).toLowerCase());
}
