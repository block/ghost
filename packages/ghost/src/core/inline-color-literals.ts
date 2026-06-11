import type { GhostCheck } from "#ghost-core";

const CSS_NAMED_COLOR_NAMES = [
  "white",
  "black",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "gray",
  "grey",
  "navy",
  "teal",
  "coral",
  "salmon",
  "tomato",
  "gold",
  "silver",
  "maroon",
  "aqua",
  "cyan",
  "lime",
  "indigo",
  "violet",
  "crimson",
  "magenta",
  "turquoise",
  "ivory",
  "beige",
  "khaki",
];

const CSS_NAMED_COLOR_PATTERN = CSS_NAMED_COLOR_NAMES.join("|");

export const INLINE_COLOR_LITERAL_PATTERN = [
  "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])",
  `\\b(?:Color|UIColor|NSColor)\\.(?:${CSS_NAMED_COLOR_PATTERN})\\b`,
  `\\b(?:${CSS_NAMED_COLOR_PATTERN})\\b`,
].join("|");

export function isInlineColorDetector(
  check: Pick<GhostCheck, "id" | "title" | "repair" | "detector">,
  source: string,
): boolean {
  if (check.detector.type !== "forbidden-regex") return false;
  const description = [
    check.id,
    check.title,
    check.repair,
    check.detector.value,
    check.detector.pattern,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    /\bcolou?r\b|\bhex\b/i.test(description) ||
    /#[0-9a-fA-F]{3,8}\b/.test(source) ||
    /#(?:[0-9a-fA-F]|\[[^\]]*(?:a-f|0-9)[^\]]*\]|\(\?:)/i.test(source)
  );
}
