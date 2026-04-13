import { parseColorToOklch } from "./colors.js";

export interface RoleCandidate {
  role: string;
  confidence: number; // 0-1
}

// Exact token name → semantic role mapping (shadcn + common conventions)
const EXACT_ROLES: Record<string, string> = {
  // Surface/background tokens
  "--background-default": "surface",
  "--background-alt": "surface-alt",
  "--background-accent": "accent",
  "--background": "surface",
  "--bg": "surface",
  "--bg-accent": "accent",
  // shadcn conventions
  "--primary": "primary",
  "--primary-foreground": "primary-foreground",
  "--secondary": "secondary",
  "--secondary-foreground": "secondary-foreground",
  "--accent": "accent",
  "--accent-foreground": "accent-foreground",
  "--muted": "muted",
  "--muted-foreground": "muted-foreground",
  "--destructive": "destructive",
  "--destructive-foreground": "destructive-foreground",
  "--card": "surface",
  "--card-foreground": "text",
  "--popover": "surface-alt",
  "--popover-foreground": "text",
  "--foreground": "text",
  "--input": "border",
  "--ring": "ring",
  // Text tokens
  "--text-default": "text",
  "--text-muted": "text-muted",
  "--text-inverse": "text-inverse",
  "--text-danger": "danger",
  // Border tokens
  "--border-default": "border",
  "--border-strong": "border-strong",
  "--border": "border",
  // Brand tokens
  "--brand": "primary",
  "--brand-primary": "primary",
  "--brand-secondary": "secondary",
};

// Pattern-based rules: regex → role derivation
const PATTERN_RULES: [RegExp, (match: RegExpMatchArray, name: string) => string][] = [
  // Primary/brand
  [/--(?:color-)?primary(?:-|$)/, () => "primary"],
  [/--(?:color-)?brand(?:-|$)/, () => "primary"],
  // Surface/background
  [/--(?:bg|background|surface)(?:-(.+))?$/, (m) => m[1] ? `surface-${m[1]}` : "surface"],
  // Text/foreground
  [/--(?:text|fg|foreground)(?:-(.+))?$/, (m) => m[1] ? `text-${m[1]}` : "text"],
  // Border/stroke
  [/--(?:border|stroke|outline)(?:-(.+))?$/, (m) => m[1] ? `border-${m[1]}` : "border"],
  // Semantic states
  [/--(?:color-)?(?:error|danger|destructive)/, () => "destructive"],
  [/--(?:color-)?(?:warning|caution|alert)/, () => "warning"],
  [/--(?:color-)?(?:success|positive|valid)/, () => "success"],
  [/--(?:color-)?(?:info|notice|informative)/, () => "info"],
  // Accent/highlight
  [/--(?:color-)?(?:accent|highlight)/, () => "accent"],
  // Muted/subtle
  [/--(?:color-)?(?:muted|subtle|disabled)/, () => "muted"],
  // Secondary
  [/--(?:color-)?secondary/, () => "secondary"],
  // Ring/focus
  [/--(?:color-)?(?:ring|focus|outline)/, () => "ring"],
  // Generic color- prefix: use the suffix as role
  [/--color-(.+)/, (m) => m[1]],
  // MUI-style: --mui-palette-<role>-<variant>
  [/--mui-palette-(\w+)-/, (m) => m[1]],
  // Chakra-style: --chakra-colors-<role>-<scale>
  [/--chakra-colors-(\w+)-/, (m) => m[1]],
];

// Semantic keywords that appear in token names
const SEMANTIC_KEYWORDS: Record<string, string> = {
  primary: "primary",
  secondary: "secondary",
  accent: "accent",
  brand: "primary",
  destructive: "destructive",
  danger: "destructive",
  error: "destructive",
  warning: "warning",
  caution: "warning",
  success: "success",
  positive: "success",
  info: "info",
  muted: "muted",
  subtle: "muted",
  disabled: "muted",
  background: "surface",
  surface: "surface",
  foreground: "text",
  text: "text",
  border: "border",
  ring: "ring",
  focus: "ring",
};

/**
 * Infer the semantic role of a design token from its name and value.
 * Uses a layered approach: exact match → pattern match → keyword extraction → value heuristic.
 */
export function inferSemanticRole(
  tokenName: string,
  tokenValue?: string,
): RoleCandidate | null {
  // Layer 1: Exact match (confidence 1.0)
  const exact = EXACT_ROLES[tokenName];
  if (exact) return { role: exact, confidence: 1.0 };

  // Layer 2: Pattern match (confidence 0.9)
  for (const [pattern, derive] of PATTERN_RULES) {
    const match = tokenName.match(pattern);
    if (match) return { role: derive(match, tokenName), confidence: 0.9 };
  }

  // Layer 3: Keyword extraction (confidence 0.7)
  const parts = tokenName.replace(/^--/, "").split(/[-_]/);
  for (const part of parts) {
    const role = SEMANTIC_KEYWORDS[part.toLowerCase()];
    if (role) return { role, confidence: 0.7 };
  }

  // Layer 4: Value-based heuristic (confidence 0.6)
  if (tokenValue) {
    const oklch = parseColorToOklch(tokenValue);
    if (oklch) {
      const [L, C] = oklch;
      // Near-white → likely surface
      if (L > 0.9 && C < 0.02) return { role: "surface", confidence: 0.6 };
      // Near-black → likely text
      if (L < 0.15 && C < 0.02) return { role: "text", confidence: 0.6 };
      // High chroma → likely a dominant/brand color
      if (C > 0.15) return { role: "dominant", confidence: 0.6 };
    }
  }

  return null;
}
