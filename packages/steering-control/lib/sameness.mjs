const STRUCTURAL_TAGS = new Set([
  "article",
  "aside",
  "footer",
  "header",
  "main",
  "nav",
  "section",
]);
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const LAYOUT_PROPS = [
  "display",
  "flex-direction",
  "grid-template-columns",
  "grid-template-rows",
  "justify-content",
  "align-items",
  "gap",
];

export function structuralFingerprint(html) {
  const rules = parseStyleRules(html);
  const sequence = [];
  const headings = [];
  let topLevelSections = 0;
  let depth = 0;
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/gu;
  for (const match of html.matchAll(tagRe)) {
    const [full, slash, rawTag, attrs] = match;
    const tag = rawTag.toLowerCase();
    if (slash) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const layout = layoutFor(tag, attrs, rules);
    sequence.push(layout ? `${tag}|${layout}` : tag);
    if (/^h[1-6]$/u.test(tag)) headings.push(Number(tag[1]));
    if (STRUCTURAL_TAGS.has(tag) && depth <= 2) topLevelSections += 1;
    if (!VOID_TAGS.has(tag) && !full.endsWith("/>")) depth += 1;
  }
  return {
    sequence,
    headings,
    topLevelSections,
    customProps: collectCustomProps(html),
  };
}

export function cellSameness(htmlStrings) {
  const prints = htmlStrings.map(structuralFingerprint);
  const pairs = [];
  for (let i = 0; i < prints.length; i += 1) {
    for (let j = i + 1; j < prints.length; j += 1) {
      pairs.push(pairSimilarity(prints[i], prints[j]));
    }
  }
  return { mean: pairs.length ? mean(pairs) : null, pairs };
}

function pairSimilarity(a, b) {
  const components = [sequenceSimilarity(a.sequence, b.sequence)];
  if (a.customProps.size > 0 || b.customProps.size > 0)
    components.push(jaccard(a.customProps, b.customProps));
  return mean(components);
}

function sequenceSimilarity(a, b) {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - editDistance(a, b) / max;
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / union.size;
}

function parseStyleRules(html) {
  const rules = new Map();
  for (const block of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/giu)) {
    for (const rule of block[1].matchAll(/([^{}]+)\{([^}]*)\}/gu)) {
      const layout = layoutProps(rule[2]);
      if (!layout) continue;
      for (const selector of rule[1].split(",")) {
        const simple = selector.trim().toLowerCase();
        if (/^\.?[a-z][a-z0-9_-]*$/u.test(simple))
          rules.set(simple, mergeDecl(rules.get(simple), layout));
      }
    }
  }
  return rules;
}

function layoutFor(tag, attrs, rules) {
  const collected = {
    ...rules.get(tag),
    ...classLayout(attrs, rules),
    ...layoutProps(attrValue(attrs, "style") ?? ""),
  };
  return Object.entries(collected)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prop, value]) => `${prop}:${value}`)
    .join(";");
}

function classLayout(attrs, rules) {
  const collected = {};
  const classes = (attrValue(attrs, "class") ?? "").trim().toLowerCase();
  for (const cls of classes.split(/\s+/u).filter(Boolean))
    Object.assign(collected, rules.get(`.${cls}`));
  return collected;
}

function layoutProps(cssText) {
  const found = {};
  for (const prop of LAYOUT_PROPS) {
    const value = cssText
      .match(new RegExp(`(?:^|[\\s;])${prop}\\s*:\\s*([^;]+)`, "iu"))?.[1]
      .trim()
      .toLowerCase();
    if (value) found[prop] = value;
  }
  return Object.keys(found).length > 0 ? found : null;
}

function mergeDecl(existing, layout) {
  return { ...existing, ...layout };
}

function attrValue(attrs, name) {
  const match = attrs.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu"),
  );
  return match ? (match[1] ?? match[2]) : null;
}

function collectCustomProps(html) {
  const props = new Set();
  const sources = [
    ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/giu)].map(
      (m) => m[1],
    ),
    ...[...html.matchAll(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)].map(
      (m) => m[1] ?? m[2],
    ),
  ];
  for (const source of sources) {
    for (const prop of source.match(/--[a-zA-Z0-9_-]+/gu) ?? [])
      props.add(prop);
  }
  return props;
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
