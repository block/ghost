import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ExpressionHistoryEntry } from "../types.js";

const GHOST_DIR = ".ghost";
const HISTORY_FILE = "history.jsonl";

function historyPath(cwd: string): string {
  return resolve(cwd, GHOST_DIR, HISTORY_FILE);
}

/**
 * Append an expression history entry to .ghost/history.jsonl.
 * Creates the .ghost directory if it doesn't exist.
 */
export async function appendHistory(
  entry: ExpressionHistoryEntry,
  cwd: string = process.cwd(),
): Promise<void> {
  const dir = resolve(cwd, GHOST_DIR);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const line = JSON.stringify(entry);
  await appendFile(historyPath(cwd), `${line}\n`, "utf-8");
}

/**
 * Read all history entries from .ghost/history.jsonl.
 * Returns an empty array if no history exists.
 */
export async function readHistory(
  cwd: string = process.cwd(),
): Promise<ExpressionHistoryEntry[]> {
  const path = historyPath(cwd);
  if (!existsSync(path)) return [];

  const content = await readFile(path, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ExpressionHistoryEntry);
}

/**
 * Read the most recent N history entries.
 */
export async function readRecentHistory(
  count: number,
  cwd: string = process.cwd(),
): Promise<ExpressionHistoryEntry[]> {
  const all = await readHistory(cwd);
  return all.slice(-count);
}
