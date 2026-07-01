/**
 * A tiny, dependency-free glob matcher for repo paths. Supports the subset the
 * inventory bridge needs — enough to match diff file paths against inventory
 * `paths` without pulling in a glob library. Shallow by design (see
 * notes/haunt-shape.md → the linter/agent decision tree): inventory names where
 * materials live; the agent reads the actual code.
 *
 * Supported:
 *   *     — any run of characters except '/'
 *   **    — any run of characters including '/' (spans directories)
 *   ?     — a single character except '/'
 *   {a,b} — alternation
 * Paths are normalized to forward slashes; matching is case-sensitive.
 */
export function matchesGlob(glob: string, path: string): boolean {
  const re = globToRegExp(glob);
  return re.test(normalize(path));
}

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

const cache = new Map<string, RegExp>();

function globToRegExp(glob: string): RegExp {
  const cached = cache.get(glob);
  if (cached) return cached;

  const g = normalize(glob);
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        // '**' — match across directory separators.
        i++;
        if (g[i + 1] === "/") {
          // '**/' — zero or more leading directory segments.
          i++;
          re += "(?:.*/)?";
        } else {
          // trailing/standalone '**' — anything, including deeper paths.
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "{") {
      const close = g.indexOf("}", i);
      if (close === -1) {
        re += "\\{";
      } else {
        const alts = g
          .slice(i + 1, close)
          .split(",")
          .map(escapeLiteral)
          .join("|");
        re += `(?:${alts})`;
        i = close;
      }
    } else {
      re += escapeLiteral(c);
    }
  }
  const compiled = new RegExp(`^${re}$`);
  cache.set(glob, compiled);
  return compiled;
}

function escapeLiteral(s: string): string {
  return s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}
