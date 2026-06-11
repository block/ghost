import type { WorkbenchPromptRunnerState } from "../shared";
import { generateText, type WorkbenchAIProviderOptions } from "./ai-provider";
import { resolveAIConfig } from "./ai-settings";

export interface PromptRunnerInput {
  promptText: string;
  handoffMarkdown: string;
}

export async function runPromptRunner(
  input: PromptRunnerInput,
  options: WorkbenchAIProviderOptions & { root?: string } = {},
): Promise<WorkbenchPromptRunnerState> {
  const config = options.config ?? (await resolveAIConfig(options));
  const result = await generateText(
    {
      system:
        "You are running inside Ghost Workbench. Generate a concise virtual implementation proposal grounded only in the supplied Ghost handoff. Do not claim to edit real files.",
      user: [
        "# User Prompt",
        input.promptText,
        "",
        "# Ghost Handoff",
        input.handoffMarkdown,
      ].join("\n"),
    },
    { ...options, config },
  );
  return {
    mode: "ai",
    state: result.state,
    provider: result.provider,
    ...(result.model ? { model: result.model } : {}),
    message: result.message,
    generatedOutput: result.generatedOutput,
    ...(result.rawText ? { rawText: result.rawText } : {}),
    ...(result.latencyMs !== undefined ? { latencyMs: result.latencyMs } : {}),
    ...(result.usage ? { usage: result.usage } : {}),
  };
}

export function skippedPromptRunner(): WorkbenchPromptRunnerState {
  return {
    mode: "ai",
    state: "not_requested",
    provider: "none",
    message:
      "Prompt Lab produced a deterministic handoff preview. Use Run AI to call a configured provider.",
    generatedOutput: null,
  };
}
