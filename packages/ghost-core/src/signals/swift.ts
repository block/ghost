import type { CSSToken, SampledMaterial, TokenCategory } from "../types.js";

/**
 * Extract design tokens from Swift/SwiftUI files and .xcassets color definitions.
 */
export function extractSwiftSignals(material: SampledMaterial): {
  tokens: CSSToken[];
  methodologySignals: string[];
} {
  const tokens: CSSToken[] = [];
  const methodologySignals = new Set<string>();

  for (const file of material.files) {
    if (file.path.endsWith(".swift")) {
      const result = parseSwiftFile(file.content);
      tokens.push(...result.tokens);
      for (const m of result.methodologies) methodologySignals.add(m);
    }

    // Asset catalog color definitions (Contents.json inside .colorset)
    if (file.path.includes(".xcassets") && file.path.endsWith(".json")) {
      const result = parseAssetCatalogColor(file.content, file.path);
      if (result) {
        tokens.push(result);
        methodologySignals.add("asset-catalog");
      }
    }
  }

  return { tokens, methodologySignals: [...methodologySignals] };
}

function parseSwiftFile(content: string): {
  tokens: CSSToken[];
  methodologies: string[];
} {
  const tokens: CSSToken[] = [];
  const methodologies: string[] = [];

  // Color(red:green:blue:) patterns
  for (const match of content.matchAll(
    /Color\(\s*red:\s*([\d.]+)\s*,\s*green:\s*([\d.]+)\s*,\s*blue:\s*([\d.]+)/g,
  )) {
    const r = Math.round(Number(match[1]) * 255);
    const g = Math.round(Number(match[2]) * 255);
    const b = Math.round(Number(match[3]) * 255);
    tokens.push({
      name: `--swift-color-rgb-${r}-${g}-${b}`,
      value: `rgb(${r}, ${g}, ${b})`,
      selector: "swift",
      category: "color",
      resolvedValue: `rgb(${r}, ${g}, ${b})`,
    });
  }

  // static let/var CGFloat token patterns
  // e.g., static let spacing4: CGFloat = 4
  for (const match of content.matchAll(
    /static\s+(?:let|var)\s+(\w+)\s*:\s*CGFloat\s*=\s*([\d.]+)/g,
  )) {
    const name = match[1];
    const value = match[2];
    tokens.push({
      name: `--swift-${camelToKebab(name)}`,
      value,
      selector: "swift",
      category: inferSwiftTokenCategory(name),
      resolvedValue: value,
    });
  }

  // Font size patterns: .font(.system(size: N, weight: .W))
  for (const match of content.matchAll(
    /\.font\(\s*\.system\(\s*size:\s*([\d.]+)(?:\s*,\s*weight:\s*\.(\w+))?\s*\)/g,
  )) {
    tokens.push({
      name: `--swift-font-size-${match[1]}`,
      value: match[1],
      selector: "swift",
      category: "typography",
      resolvedValue: match[1],
    });
  }

  // Custom font: .font(.custom("Inter", size: 14))
  for (const match of content.matchAll(
    /\.font\(\s*\.custom\(\s*"([^"]+)"\s*,\s*size:\s*([\d.]+)\s*\)/g,
  )) {
    tokens.push({
      name: `--swift-font-family-${match[1].toLowerCase().replace(/\s+/g, "-")}`,
      value: match[1],
      selector: "swift",
      category: "font",
      resolvedValue: match[1],
    });
    tokens.push({
      name: `--swift-font-size-${match[2]}`,
      value: match[2],
      selector: "swift",
      category: "typography",
      resolvedValue: match[2],
    });
  }

  // Padding/spacing inline: .padding(N) or .padding(.horizontal, N)
  for (const match of content.matchAll(/\.padding\(\s*(?:\.\w+\s*,\s*)?([\d.]+)\s*\)/g)) {
    tokens.push({
      name: `--swift-padding-${match[1]}`,
      value: match[1],
      selector: "swift",
      category: "spacing",
      resolvedValue: match[1],
    });
  }

  // cornerRadius: .cornerRadius(N)
  for (const match of content.matchAll(/\.cornerRadius\(\s*([\d.]+)\s*\)/g)) {
    tokens.push({
      name: `--swift-radius-${match[1]}`,
      value: match[1],
      selector: "swift",
      category: "radius",
      resolvedValue: match[1],
    });
  }

  // Methodology detection
  if (/@Environment\(\s*\\\./.test(content)) methodologies.push("environment-theming");
  if (/ViewModifier/.test(content)) methodologies.push("view-modifiers");
  if (/\.foregroundColor\(|\.font\(|\.padding\(/.test(content)) methodologies.push("swiftui-inline");
  if (/enum\s+\w+.*\{[^}]*static\s+(?:let|var)/s.test(content)) methodologies.push("swift-enums");

  return { tokens, methodologies };
}

function parseAssetCatalogColor(content: string, path: string): CSSToken | null {
  try {
    const json = JSON.parse(content);
    const colors = json.colors;
    if (!Array.isArray(colors)) return null;

    for (const entry of colors) {
      const components = entry?.color?.components;
      const colorSpace = entry?.color?.["color-space"];
      if (!components) continue;

      const r = Math.round(Number(components.red) * 255);
      const g = Math.round(Number(components.green) * 255);
      const b = Math.round(Number(components.blue) * 255);

      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) continue;

      // Derive name from path: ...SomeColor.colorset/Contents.json → SomeColor
      const colorName = path.match(/([^/]+)\.colorset/)?.[1] ?? "unknown";

      return {
        name: `--xcassets-${camelToKebab(colorName)}`,
        value: `rgb(${r}, ${g}, ${b})`,
        selector: "xcassets",
        category: "color",
        resolvedValue: `rgb(${r}, ${g}, ${b})`,
      };
    }
  } catch {
    // Not a valid color asset
  }
  return null;
}

function inferSwiftTokenCategory(name: string): TokenCategory {
  const lower = name.toLowerCase();
  if (/spacing|padding|margin|gap|inset/.test(lower)) return "spacing";
  if (/radius|corner/.test(lower)) return "radius";
  if (/font|text|size/.test(lower)) return "typography";
  if (/color|tint|hue/.test(lower)) return "color";
  return "other";
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
