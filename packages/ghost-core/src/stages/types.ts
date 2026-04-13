/**
 * Result type for pipeline stages (plain async functions).
 *
 * Like AgentResult but without `iterations` — stages don't loop.
 */
export interface StageResult<T> {
  data: T;
  confidence: number;
  warnings: string[];
  reasoning: string[];
  duration: number;
}

/**
 * Minimal context for stage functions.
 * Subset of AgentContext relevant to non-agentic pipeline stages.
 */
export interface StageContext {
  verbose?: boolean;
  onMessage?: (message: { role: string; content: string; metadata?: Record<string, unknown> }) => void;
}
