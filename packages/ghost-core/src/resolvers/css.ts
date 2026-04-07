import postcss, {
  type AtRule,
  type Declaration,
  type Root,
  type Rule,
} from "postcss";
import type { CSSToken, TokenCategory } from "../types.js";

const CATEGORY_PREFIXES: [string, TokenCategory][] = [
  ["--background-", "background"],
  ["--border-", "border"],
  ["--text-", "text"],
  ["--shadow-", "shadow"],
  ["--radius", "radius"],
  ["--spacing-", "spacing"],
  ["--heading-", "typography"],
  ["--body-", "typography"],
  ["--label-", "typography"],
  ["--display-", "typography"],
  ["--pull-quote-", "typography"],
  ["--animate-", "animation"],
  ["--duration-", "animation"],
  ["--ease-", "animation"],
  ["--color-", "color"],
  ["--font-face-", "font-face"],
  ["--font-", "font"],
  ["--chart-", "chart"],
  ["--sidebar-", "sidebar"],
];

function categorize(name: string): TokenCategory {
  for (const [prefix, category] of CATEGORY_PREFIXES) {
    if (name.startsWith(prefix)) return category;
  }
  return "other";
}

function getSelectorFromParent(node: postcss.Container): string {
  if (node.type === "rule") return (node as Rule).selector;
  if (node.type === "atrule") {
    const atrule = node as AtRule;
    return atrule.params
      ? `@${atrule.name} ${atrule.params}`
      : `@${atrule.name}`;
  }
  return "root";
}

export function parseCSS(css: string): CSSToken[] {
  const root: Root = postcss.parse(css);
  const tokens: CSSToken[] = [];

  root.walk((node) => {
    if (node.type !== "decl") return;
    const decl = node as Declaration;
    if (!decl.prop.startsWith("--")) return;

    const parent = decl.parent;
    if (!parent) return;

    const selector = getSelectorFromParent(parent);

    tokens.push({
      name: decl.prop,
      value: decl.value,
      selector,
      category: categorize(decl.prop),
    });
  });

  return resolveVarReferences(tokens);
}

const VAR_REGEX = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/;

function resolveVarReferences(tokens: CSSToken[], maxPasses = 5): CSSToken[] {
  const valueMap = new Map<string, string>();
  for (const token of tokens) {
    valueMap.set(token.name, token.value);
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const token of tokens) {
      const current = token.resolvedValue ?? token.value;
      const match = VAR_REGEX.exec(current);
      if (!match) {
        if (!token.resolvedValue) token.resolvedValue = current;
        continue;
      }

      const refName = match[1];
      const fallback = match[2]?.trim();
      const refValue = valueMap.get(refName);

      if (refValue && !VAR_REGEX.test(refValue)) {
        token.resolvedValue = current.replace(match[0], refValue);
        changed = true;
      } else if (refValue) {
        token.resolvedValue = current.replace(match[0], refValue);
        changed = true;
      } else if (fallback) {
        token.resolvedValue = current.replace(match[0], fallback);
        changed = true;
      } else {
        token.resolvedValue = current;
      }
    }
    if (!changed) break;
  }

  return tokens;
}

export function buildTokenMap(tokens: CSSToken[]): Map<string, CSSToken> {
  const map = new Map<string, CSSToken>();
  for (const token of tokens) {
    map.set(`${token.selector}::${token.name}`, token);
  }
  return map;
}

export function buildReverseValueMap(tokens: CSSToken[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const token of tokens) {
    const resolved = token.resolvedValue ?? token.value;
    if (!VAR_REGEX.test(resolved) && !map.has(resolved)) {
      map.set(resolved, token.name);
    }
  }
  return map;
}
