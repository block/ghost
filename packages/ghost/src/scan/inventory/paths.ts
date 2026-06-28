import { relative, sep } from "node:path";
import { SKIP_DIR_PREFIXES, SKIP_DIRS } from "./constants.js";

/** Basename of an absolute path, OS-separator aware. */
export function basenameOf(absPath: string): string {
  const idx = absPath.lastIndexOf(sep);
  return idx === -1 ? absPath : absPath.slice(idx + 1);
}

/** True when `absPath` is strictly inside `root` (defensive against bad globs). */
export function isInsideRoot(absPath: string, root: string): boolean {
  const rel = relative(root, absPath);
  return (
    rel.length > 0 &&
    !rel.startsWith("..") &&
    !rel.startsWith(`..${sep}`) &&
    rel !== ".."
  );
}

/** POSIX-style relative path from `root` to `abs`. */
export function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join("/");
}

/** Lowercase file extension without the leading dot, or null. */
export function extOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

/** True when a directory should not be walked (build/cache/vcs dirs). */
export function shouldSkipDir(name: string): boolean {
  if (SKIP_DIRS.has(name)) return true;
  for (const prefix of SKIP_DIR_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
}

/** Dedupe + sort absolute paths as POSIX-relative-to-root strings. */
export function sortRelative(absPaths: string[], root: string): string[] {
  return absPaths
    .map((p) => toPosixRel(root, p))
    .sort()
    .filter((v, i, arr) => arr.indexOf(v) === i);
}
