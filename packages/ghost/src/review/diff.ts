export interface TouchedFile {
  path: string;
  patch: string;
}

/** Extract touched file paths from a unified diff. */
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
      current = { path: gitHeader[2], start: i };
      continue;
    }
    const plusPlus = line.match(/^\+\+\+ b?\/?(.+)$/);
    if (plusPlus && current === null) {
      const p = plusPlus[1].trim();
      if (p !== "/dev/null") current = { path: p, start: i };
    }
  }
  flush(lines.length);

  const seen = new Set<string>();
  const out: TouchedFile[] = [];
  for (const file of files) {
    if (file.path === "/dev/null" || seen.has(file.path)) continue;
    seen.add(file.path);
    out.push(file);
  }
  return out;
}
