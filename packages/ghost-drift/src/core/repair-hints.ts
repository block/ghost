import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GhostCheck, GhostCheckRepairHint } from "@ghost/core";
import type { GhostDriftChangedFile, GhostDriftChangedLine } from "./check.js";

export type GhostDriftRepairHint = GhostCheckRepairHint;

export interface GhostDriftSourceSnapshot {
  path: string;
  text: string;
}

interface ClassStringCandidate {
  line: number;
  tokens: string[];
}

export async function readSourceSnapshot(
  cwd: string,
  path: string,
): Promise<GhostDriftSourceSnapshot | undefined> {
  try {
    return {
      path,
      text: await readFile(join(cwd, path), "utf-8"),
    };
  } catch {
    return undefined;
  }
}

export function inferRepairHints(
  check: GhostCheck,
  file: GhostDriftChangedFile,
  line: GhostDriftChangedLine,
  match: string,
  source: GhostDriftSourceSnapshot | undefined,
): GhostDriftRepairHint[] {
  if (check.detector.type !== "forbidden-regex") return [];
  if (!source || !isReactPath(file.path)) return [];

  const lineTokens = extractClassTokens(line.text);
  const hasArbitraryColorMatch = lineTokens.some(
    (token) => token.includes(match) && isArbitraryColorClass(token),
  );
  if (!hasArbitraryColorMatch) return [];

  const desiredCategories = unique(
    lineTokens
      .map((token) => tailwindColorCategory(token))
      .filter((category): category is string => category !== undefined),
  );
  if (desiredCategories.length === 0) return [];

  const best = findBestClassReplacement(
    extractClassStringCandidates(source.text),
    desiredCategories,
    line.line,
  );
  if (!best) return [];

  return [
    {
      kind: "tailwind-class-replacement",
      replacement: best.replacement,
      reason: repairHintReason(file.path),
      inferred_from: "same-file-class-pattern",
      source: {
        path: source.path,
        line: best.line,
      },
      confidence: best.confidence,
    },
  ];
}

function findBestClassReplacement(
  candidates: ClassStringCandidate[],
  desiredCategories: string[],
  findingLine: number,
):
  | { replacement: string; line: number; confidence: "high" | "medium" }
  | undefined {
  const desired = new Set(desiredCategories);
  let best:
    | {
        replacement: string;
        line: number;
        score: number;
        confidence: "high" | "medium";
      }
    | undefined;

  for (const candidate of candidates) {
    if (candidate.tokens.some(hasRawOrArbitraryValue)) continue;

    const replacementTokens = candidate.tokens.filter((token) => {
      const category = tailwindColorCategory(token);
      return category !== undefined && desired.has(category);
    });
    const replacement = unique(replacementTokens).join(" ");
    if (!replacement) continue;
    if (!hasSemanticColorToken(replacementTokens)) continue;

    const covered = new Set(
      replacementTokens
        .map((token) => tailwindColorCategory(token))
        .filter((category): category is string => category !== undefined),
    );
    const coversAll = desiredCategories.every((category) =>
      covered.has(category),
    );
    if (!coversAll) continue;

    const distance = Math.abs(candidate.line - findingLine);
    const score =
      desiredCategories.length * 20 +
      semanticScore(replacementTokens) -
      Math.min(distance, 20);
    const confidence = desiredCategories.length >= 2 ? "high" : "medium";

    if (!best || score > best.score) {
      best = {
        replacement,
        line: candidate.line,
        score,
        confidence,
      };
    }
  }

  return best
    ? {
        replacement: best.replacement,
        line: best.line,
        confidence: best.confidence,
      }
    : undefined;
}

function extractClassStringCandidates(source: string): ClassStringCandidate[] {
  const candidates: ClassStringCandidate[] = [];
  const quotedString = /(['"`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g;
  let match = quotedString.exec(source);

  while (match !== null) {
    const tokens = extractClassTokens(match[2]);
    if (tokens.length > 0 && tokens.some(tailwindColorCategory)) {
      candidates.push({
        line: lineNumberAt(source, match.index),
        tokens,
      });
    }
    match = quotedString.exec(source);
  }

  return candidates;
}

function extractClassTokens(input: string): string[] {
  return input.match(/!?[A-Za-z0-9_:[\]#./-]+/g) ?? [];
}

function tailwindColorCategory(token: string): string | undefined {
  const normalized = token.replace(/^!/, "");
  const parts = normalized.split(":");
  const base = parts.at(-1);
  if (!base) return undefined;

  const utility = colorUtility(base);
  if (!utility) return undefined;

  const variants = parts.slice(0, -1).join(":");
  return variants ? `${variants}:${utility}` : utility;
}

function colorUtility(base: string): string | undefined {
  const match = /^(bg|text|border|ring|outline|fill|stroke)-(.+)$/.exec(base);
  if (!match) return undefined;

  const [, utility, value] = match;
  if (!isColorValue(utility, value)) return undefined;
  return utility;
}

function isColorValue(utility: string, value: string): boolean {
  if (value.startsWith("[#")) return true;
  if (utility === "text" && NON_COLOR_TEXT_VALUES.has(value)) return false;
  if (value.includes("foreground")) return true;
  if (SEMANTIC_COLOR_PARTS.some((part) => value.includes(part))) return true;
  return COLOR_VALUE_PATTERN.test(value);
}

function isArbitraryColorClass(token: string): boolean {
  return (
    tailwindColorCategory(token) !== undefined &&
    /\[#(?:[0-9a-fA-F]{3,8})\]/.test(token)
  );
}

function hasRawOrArbitraryValue(token: string): boolean {
  return /#[0-9a-fA-F]{3,8}|\[[^\]]+\]/.test(token);
}

function hasSemanticColorToken(tokens: string[]): boolean {
  return tokens.some((token) =>
    SEMANTIC_COLOR_PARTS.some((part) => token.includes(part)),
  );
}

function semanticScore(tokens: string[]): number {
  return tokens.reduce((score, token) => {
    if (token.includes("primary")) return score + 4;
    if (token.includes("foreground")) return score + 3;
    if (SEMANTIC_COLOR_PARTS.some((part) => token.includes(part))) {
      return score + 2;
    }
    return score;
  }, 0);
}

function repairHintReason(path: string): string {
  return /button/i.test(path)
    ? "Found an existing same-file semantic Button action pattern."
    : "Found an existing same-file semantic Tailwind class pattern.";
}

function lineNumberAt(input: string, index: number): number {
  return input.slice(0, index).split(/\r?\n/).length;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isReactPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".tsx") || lower.endsWith(".jsx");
}

const NON_COLOR_TEXT_VALUES = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
  "left",
  "center",
  "right",
  "justify",
  "start",
  "end",
  "ellipsis",
  "clip",
  "wrap",
  "nowrap",
  "balance",
  "pretty",
]);

const SEMANTIC_COLOR_PARTS = [
  "accent",
  "background",
  "card",
  "destructive",
  "foreground",
  "input",
  "muted",
  "popover",
  "primary",
  "secondary",
  "success",
  "warning",
];

const COLOR_VALUE_PATTERN =
  /^(?:white|black|transparent|current|inherit|neutral-\d{2,3}|slate-\d{2,3}|gray-\d{2,3}|zinc-\d{2,3}|stone-\d{2,3}|red-\d{2,3}|orange-\d{2,3}|amber-\d{2,3}|yellow-\d{2,3}|lime-\d{2,3}|green-\d{2,3}|emerald-\d{2,3}|teal-\d{2,3}|cyan-\d{2,3}|sky-\d{2,3}|blue-\d{2,3}|indigo-\d{2,3}|violet-\d{2,3}|purple-\d{2,3}|fuchsia-\d{2,3}|pink-\d{2,3}|rose-\d{2,3})(?:\/\d{1,3})?$/;
