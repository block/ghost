/** One added line in a parsed unified diff. */
export interface ChangedLine {
  path: string;
  line: number;
  text: string;
}

/** A changed file in a parsed unified diff, with its added lines. */
export interface ChangedFile {
  path: string;
  added_lines: ChangedLine[];
}

/**
 * Parse a unified diff into changed files and their added lines. Generic diff
 * parsing — no governance logic. Used by `review` and `checks` to resolve which
 * paths a diff touches.
 */
export function parseUnifiedDiff(diffText: string): ChangedFile[] {
  const files = new Map<string, ChangedFile>();
  let current: ChangedFile | undefined;
  let newLine = 0;

  for (const rawLine of diffText.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      current = undefined;
      continue;
    }

    if (rawLine.startsWith("+++ ")) {
      const file = rawLine.replace(/^\+\+\+\s+/, "");
      if (file === "/dev/null") {
        current = undefined;
        continue;
      }
      const path = file.replace(/^b\//, "");
      current = files.get(path) ?? { path, added_lines: [] };
      files.set(path, current);
      continue;
    }

    const hunk = rawLine.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    if (!current) continue;
    if (rawLine.startsWith("+")) {
      current.added_lines.push({
        path: current.path,
        line: newLine,
        text: rawLine.slice(1),
      });
      newLine += 1;
    } else if (rawLine.startsWith("-")) {
      // Removed line: does not advance the new-file line counter.
    } else {
      newLine += 1;
    }
  }

  return [...files.values()];
}
