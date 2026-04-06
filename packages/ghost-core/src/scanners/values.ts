import { buildReverseValueMap, buildTokenMap } from "../resolvers/css.js";
import type { CSSToken, RuleSeverity, ValueDrift } from "../types.js";

const COLOR_REGEX = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

export interface ValuesScannerOptions {
  registryTokens: CSSToken[];
  consumerTokens: CSSToken[];
  consumerCSS: string;
  rules: Record<string, RuleSeverity>;
  styleFile: string;
}

export function scanValues(options: ValuesScannerOptions): ValueDrift[] {
  const { registryTokens, consumerTokens, consumerCSS, rules, styleFile } =
    options;
  const results: ValueDrift[] = [];

  if (rules["token-override"] !== "off") {
    results.push(
      ...detectTokenOverrides(
        registryTokens,
        consumerTokens,
        rules["token-override"] ?? "warn",
        styleFile,
      ),
    );
  }

  if (rules["hardcoded-color"] !== "off") {
    results.push(
      ...detectHardcodedColors(
        registryTokens,
        consumerCSS,
        rules["hardcoded-color"] ?? "error",
        styleFile,
      ),
    );
  }

  if (rules["missing-token"] !== "off") {
    results.push(
      ...detectMissingTokens(
        registryTokens,
        consumerTokens,
        rules["missing-token"] ?? "warn",
        styleFile,
      ),
    );
  }

  return results;
}

function detectTokenOverrides(
  registryTokens: CSSToken[],
  consumerTokens: CSSToken[],
  severity: RuleSeverity,
  styleFile: string,
): ValueDrift[] {
  const registryMap = buildTokenMap(registryTokens);
  const consumerMap = buildTokenMap(consumerTokens);
  const drifts: ValueDrift[] = [];

  for (const [key, consumerToken] of consumerMap) {
    const registryToken = registryMap.get(key);
    if (!registryToken) continue;

    if (consumerToken.value !== registryToken.value) {
      drifts.push({
        token: consumerToken.name,
        rule: "token-override",
        severity,
        message: `Token "${consumerToken.name}" value differs from registry`,
        registryValue: registryToken.value,
        consumerValue: consumerToken.value,
        selector: consumerToken.selector,
        file: styleFile,
      });
    }
  }

  return drifts;
}

function detectHardcodedColors(
  registryTokens: CSSToken[],
  consumerCSS: string,
  severity: RuleSeverity,
  styleFile: string,
): ValueDrift[] {
  const reverseMap = buildReverseValueMap(registryTokens);
  const drifts: ValueDrift[] = [];
  const lines = consumerCSS.split("\n");

  let inThemeBlock = false;
  let inKeyframes = false;
  let inFontFace = false;
  let braceDepth = 0;
  let blockStartDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track @theme, @keyframes, @font-face blocks
    if (trimmed.startsWith("@theme")) {
      inThemeBlock = true;
      blockStartDepth = braceDepth;
    }
    if (trimmed.startsWith("@keyframes")) {
      inKeyframes = true;
      blockStartDepth = braceDepth;
    }
    if (trimmed.startsWith("@font-face")) {
      inFontFace = true;
      blockStartDepth = braceDepth;
    }

    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if (braceDepth <= blockStartDepth) {
          if (inThemeBlock) inThemeBlock = false;
          if (inKeyframes) inKeyframes = false;
          if (inFontFace) inFontFace = false;
        }
      }
    }

    // Skip lines inside @theme, @keyframes, @font-face
    if (inThemeBlock || inKeyframes || inFontFace) continue;

    // Skip custom property definitions (--*: value)
    if (/^\s*--[a-zA-Z]/.test(trimmed)) continue;

    // Skip comments
    if (trimmed.startsWith("/*") || trimmed.startsWith("//")) continue;

    COLOR_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = COLOR_REGEX.exec(line);
    while (match !== null) {
      const colorValue = match[0];
      const tokenName = reverseMap.get(colorValue);
      const suggestion = tokenName ? `var(${tokenName})` : undefined;

      drifts.push({
        token: colorValue,
        rule: "hardcoded-color",
        severity,
        message: `Hardcoded color "${colorValue}" found${suggestion ? ` — use ${suggestion} instead` : ""}`,
        consumerValue: colorValue,
        file: styleFile,
        line: i + 1,
        suggestion,
      });
      match = COLOR_REGEX.exec(line);
    }
  }

  return drifts;
}

function detectMissingTokens(
  registryTokens: CSSToken[],
  consumerTokens: CSSToken[],
  severity: RuleSeverity,
  styleFile: string,
): ValueDrift[] {
  // Only check :root tokens — these are the semantic tokens consumers should have
  const registryRootTokens = registryTokens.filter(
    (t) => t.selector === ":root",
  );
  const consumerNames = new Set(consumerTokens.map((t) => t.name));
  const drifts: ValueDrift[] = [];

  for (const token of registryRootTokens) {
    if (!consumerNames.has(token.name)) {
      drifts.push({
        token: token.name,
        rule: "missing-token",
        severity,
        message: `Token "${token.name}" defined in registry but missing from consumer`,
        registryValue: token.value,
        file: styleFile,
      });
    }
  }

  return drifts;
}
