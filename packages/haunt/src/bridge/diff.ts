/**
 * Extract the set of touched file paths from a unified diff. We read the
 * `diff --git a/… b/…` headers (and fall back to `+++ b/…`), preferring the new
 * path and ignoring `/dev/null` (deletions). The bridge only needs *which files*
 * changed to resolve inventory; the hunks themselves are embedded verbatim into
 * the review packet later (Slice 4).
 */
export interface TouchedFile {
  path: string;
  /** The raw hunk text for this file (header + hunks), for the review packet. */
  patch: string;
}

export function parseTouchedFiles(diffText: string): TouchedFile[] {
  const files: TouchedFile[] = [];
  const lines = diffText.split(/\r?\n/);

  let current: { path: string; start: number } | null = null;

  const flush = (endExclusive: number) => {
    if (current) {
      files.push({
        path: current.path,
        patch: lines.slice(current.start, endExclusive).join("\n"),
      });
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const gitHeader = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gitHeader) {
      flush(i);
      const newPath = gitHeader[2];
      current = { path: newPath, start: i };
      continue;
    }
    // Fallback for plain unified diffs without a `diff --git` header.
    const plusPlus = line.match(/^\+\+\+ b?\/?(.+)$/);
    if (plusPlus && current === null) {
      const p = plusPlus[1].trim();
      if (p !== "/dev/null") current = { path: p, start: i };
    }
  }
  flush(lines.length);

  // Drop deletions (new path is /dev/null) and dedupe by path.
  const seen = new Set<string>();
  const out: TouchedFile[] = [];
  for (const f of files) {
    if (f.path === "/dev/null" || seen.has(f.path)) continue;
    seen.add(f.path);
    out.push(f);
  }
  return out;
}
