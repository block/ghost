/** Tiny dependency-free glob matcher for repo-relative paths. */
export function matchesGlob(glob: string, path: string): boolean {
  const re = globToRegExp(glob);
  return re.test(normalize(path));
}

export function hasGlobMagic(path: string): boolean {
  return /[*?{]/.test(path);
}

export function normalizeGlobPath(path: string): string {
  return normalize(path);
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
        i++;
        if (g[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else {
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
