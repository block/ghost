import { parseCSS } from "../../resolvers/css.js";
import type { CSSToken, SampledMaterial } from "../../types.js";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

/**
 * run_extractor — run a deterministic signal extractor on a specific file.
 *
 * The LLM uses this when it wants structured token data from a file,
 * rather than interpreting the raw source.
 */
export const runExtractorTool: AgentTool = {
  name: "run_extractor",
  description:
    "Run a deterministic extractor on a sampled file to get structured token data. Use when you want parsed CSS custom properties, JSON tokens, or Swift token definitions rather than interpreting raw source.",
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path of the file to extract from (relative, as shown in the sample)",
      },
      extractor: {
        type: "string",
        description: "Which extractor to run",
        enum: ["css", "json"],
      },
    },
    required: ["file_path", "extractor"],
  },

  async execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const filePath = String(args.file_path ?? "");
    const extractor = String(args.extractor ?? "");

    // Find the file in sampled material
    const file = ctx.material.files.find((f) => f.path === filePath);
    if (!file) {
      return {
        content: `File "${filePath}" not found in sampled material. Available files: ${ctx.material.files.map((f) => f.path).join(", ")}`,
      };
    }

    try {
      let tokens: CSSToken[] = [];

      switch (extractor) {
        case "css":
          tokens = parseCSS(file.content);
          break;
        case "json":
          tokens = extractJSONTokens(file.content);
          break;
        default:
          return { content: `Unknown extractor: ${extractor}. Use "css" or "json".` };
      }

      if (tokens.length === 0) {
        return { content: `No tokens extracted from ${filePath} using ${extractor} extractor.` };
      }

      const summary = tokens
        .slice(0, 50)
        .map((t) => `${t.name}: ${t.resolvedValue ?? t.value} [${t.category}]`)
        .join("\n");

      return {
        content: `Extracted ${tokens.length} tokens from ${filePath}:\n${summary}${tokens.length > 50 ? `\n... and ${tokens.length - 50} more` : ""}`,
        metadata: { tokenCount: tokens.length },
      };
    } catch (err) {
      return {
        content: `Extraction error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

function extractJSONTokens(content: string): CSSToken[] {
  try {
    const json = JSON.parse(content);
    return flattenTokenJSON(json, "");
  } catch {
    return [];
  }
}

function flattenTokenJSON(
  obj: Record<string, unknown>,
  prefix: string,
): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}-${key}` : key;

    if (typeof val === "object" && val !== null) {
      const record = val as Record<string, unknown>;
      if ("$value" in record || "value" in record) {
        const value = String(record.$value ?? record.value);
        tokens.push({
          name: `--${path}`,
          value,
          selector: ":root",
          category: "other",
          resolvedValue: value,
        });
      } else {
        tokens.push(...flattenTokenJSON(record, path));
      }
    }
  }

  return tokens;
}
