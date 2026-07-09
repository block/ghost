import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { TemplateFile } from "./templates.js";

const INIT_PAYLOADS_DIR = fileURLToPath(
  new URL("../init-payloads", import.meta.url),
);

const BINARY_EXTENSIONS = new Set([".woff", ".woff2"]);

export async function loadPackedPayload(name: string): Promise<TemplateFile[]> {
  const payloadDir = join(INIT_PAYLOADS_DIR, name);
  const files = await listPayloadFiles(payloadDir);

  return Promise.all(
    files.map(async (path) => ({
      relativePath: relative(payloadDir, path),
      content: await readPayloadFile(path),
    })),
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
