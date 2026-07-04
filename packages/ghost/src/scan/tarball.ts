import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

export interface TarballEntryInput {
  /** Archive path, using forward slashes and no leading slash. */
  path: string;
  data: Buffer | string;
  mtime?: Date;
  mode?: number;
}

export interface CreateDirectoryTarballOptions {
  rootDir: string;
  outFile: string;
  extraEntries?: TarballEntryInput[];
  exclude?: (relativePath: string) => boolean;
}

interface FileEntry {
  path: string;
  absolutePath: string;
  size: number;
  mode: number;
  mtime: Date;
}

const BLOCK_SIZE = 512;

/**
 * Write a dependency-free `.tgz` archive for a Ghost package directory.
 *
 * This intentionally implements only the portable subset Ghost needs: ustar
 * regular-file entries, deterministic path ordering, no symlink traversal.
 */
export async function writeDirectoryTarball(
  options: CreateDirectoryTarballOptions,
): Promise<void> {
  const files = await listRegularFiles(options.rootDir, options.exclude);
  const fileEntries: TarballEntryInput[] = await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      data: await readFile(file.absolutePath),
      mtime: file.mtime,
      mode: file.mode,
    })),
  );

  const archive = createTarArchive([
    ...(options.extraEntries ?? []),
    ...fileEntries,
  ]);
  await writeFile(options.outFile, gzipSync(archive));
}

export function createTarArchive(entries: TarballEntryInput[]): Buffer {
  const sorted = entries
    .map(normalizeEntry)
    .sort((a, b) => a.path.localeCompare(b.path));
  const chunks: Buffer[] = [];

  for (const entry of sorted) {
    const data = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data, "utf-8");
    chunks.push(
      createHeader({
        path: entry.path,
        size: data.byteLength,
        mode: entry.mode ?? 0o644,
        mtime: entry.mtime ?? new Date(0),
      }),
    );
    chunks.push(data);
    const remainder = data.byteLength % BLOCK_SIZE;
    if (remainder !== 0) chunks.push(Buffer.alloc(BLOCK_SIZE - remainder));
  }

  chunks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return Buffer.concat(chunks);
}

async function listRegularFiles(
  rootDir: string,
  exclude: ((relativePath: string) => boolean) | undefined,
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  await walk(rootDir, rootDir, exclude, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

async function walk(
  rootDir: string,
  dir: string,
  exclude: ((relativePath: string) => boolean) | undefined,
  files: FileEntry[],
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = join(dir, entry.name);
    const relPath = normalizeTarPath(relative(rootDir, absolutePath));
    if (exclude?.(relPath)) continue;

    if (entry.isDirectory()) {
      await walk(rootDir, absolutePath, exclude, files);
      continue;
    }
    if (!entry.isFile()) continue;

    const s = await stat(absolutePath);
    if (!s.isFile()) continue;
    files.push({
      path: relPath,
      absolutePath,
      size: s.size,
      mode: s.mode & 0o777,
      mtime: s.mtime,
    });
  }
}

function normalizeEntry(entry: TarballEntryInput): TarballEntryInput {
  const path = normalizeTarPath(entry.path);
  if (path === "" || path.startsWith("../") || path.includes("/../")) {
    throw new Error(`Invalid tar entry path: ${entry.path}`);
  }
  return { ...entry, path };
}

function createHeader(entry: {
  path: string;
  size: number;
  mode: number;
  mtime: Date;
}): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE, 0);
  const path = splitUstarPath(entry.path);
  writeString(header, path.name, 0, 100);
  writeOctal(header, entry.mode, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, entry.size, 124, 12);
  writeOctal(header, Math.floor(entry.mtime.getTime() / 1000), 136, 12);
  header.fill(0x20, 148, 156);
  writeString(header, "0", 156, 1);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  if (path.prefix !== undefined) writeString(header, path.prefix, 345, 155);

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeChecksum(header, checksum);
  return header;
}

function splitUstarPath(path: string): { name: string; prefix?: string } {
  const byteLength = Buffer.byteLength(path);
  if (byteLength <= 100) return { name: path };

  const parts = path.split("/");
  for (let index = 1; index < parts.length; index++) {
    const prefix = parts.slice(0, index).join("/");
    const name = parts.slice(index).join("/");
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) {
      return { prefix, name };
    }
  }
  throw new Error(`Tar entry path is too long for ustar: ${path}`);
}

function writeString(
  buffer: Buffer,
  value: string,
  offset: number,
  length: number,
): void {
  const bytes = Buffer.from(value, "utf-8");
  if (bytes.byteLength > length) {
    throw new Error(`Tar header value is too long: ${value}`);
  }
  bytes.copy(buffer, offset);
}

function writeOctal(
  buffer: Buffer,
  value: number,
  offset: number,
  length: number,
): void {
  const text = value.toString(8).padStart(length - 1, "0");
  if (text.length > length - 1) {
    throw new Error(`Tar numeric value is too large: ${value}`);
  }
  buffer.write(text, offset, length - 1, "ascii");
}

function writeChecksum(buffer: Buffer, checksum: number): void {
  const text = checksum.toString(8).padStart(6, "0");
  buffer.write(text, 148, 6, "ascii");
  buffer[154] = 0;
  buffer[155] = 0x20;
}

function normalizeTarPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function defaultArchiveName(id: string): string {
  return `${id}-fingerprint.tgz`;
}
