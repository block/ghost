import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BUNDLED_SUITE } from "./bundled-suite.js";

export type SuiteDimension = "palette" | "spacing" | "typography" | "surfaces";

export interface SuitePrompt {
  id: string;
  prompt: string;
  dimensions: SuiteDimension[];
  tier: "core" | "stress";
}

export interface PromptSuite {
  version: string;
  description?: string;
  prompts: SuitePrompt[];
}

/**
 * Load a prompt suite. If `path` is omitted, returns the bundled v0.1 suite.
 */
export async function loadPromptSuite(path?: string): Promise<PromptSuite> {
  if (!path) return validateSuite(BUNDLED_SUITE);
  const raw = await readFile(resolve(process.cwd(), path), "utf-8");
  return validateSuite(JSON.parse(raw) as unknown);
}

function validateSuite(raw: unknown): PromptSuite {
  if (!raw || typeof raw !== "object") {
    throw new Error("Prompt suite: not an object");
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string") {
    throw new Error("Prompt suite: missing 'version' string");
  }
  if (!Array.isArray(r.prompts)) {
    throw new Error("Prompt suite: 'prompts' must be an array");
  }

  const prompts: SuitePrompt[] = [];
  for (const [i, rawPrompt] of r.prompts.entries()) {
    if (!rawPrompt || typeof rawPrompt !== "object") {
      throw new Error(`Prompt suite: prompts[${i}] is not an object`);
    }
    const p = rawPrompt as Record<string, unknown>;
    if (typeof p.id !== "string" || !p.id) {
      throw new Error(`Prompt suite: prompts[${i}].id missing`);
    }
    if (typeof p.prompt !== "string" || !p.prompt) {
      throw new Error(`Prompt suite: prompts[${i}].prompt missing`);
    }
    if (!Array.isArray(p.dimensions)) {
      throw new Error(
        `Prompt suite: prompts[${i}].dimensions must be an array`,
      );
    }
    const dimensions: SuiteDimension[] = [];
    for (const d of p.dimensions) {
      if (
        d === "palette" ||
        d === "spacing" ||
        d === "typography" ||
        d === "surfaces"
      ) {
        dimensions.push(d);
      } else {
        throw new Error(
          `Prompt suite: prompts[${i}] has invalid dimension '${String(d)}'`,
        );
      }
    }
    const tier = p.tier === "stress" ? "stress" : "core";
    prompts.push({ id: p.id, prompt: p.prompt, dimensions, tier });
  }

  return {
    version: r.version,
    description: typeof r.description === "string" ? r.description : undefined,
    prompts,
  };
}
