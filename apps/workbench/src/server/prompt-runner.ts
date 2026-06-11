import type { WorkbenchPromptRunnerState } from "../shared";

export interface PromptRunnerInput {
  promptText: string;
  handoffMarkdown: string;
}

export async function runPromptRunner(
  _input: PromptRunnerInput,
): Promise<WorkbenchPromptRunnerState> {
  return {
    mode: "none",
    state: "not_configured",
    message:
      "Prompt Lab v1 stops at deterministic handoff preview. Future provider-backed or host-agent-backed adapters should attach at this boundary.",
    generatedOutput: null,
  };
}
