import type { CSSToken, DesignFingerprint } from "../types.js";

/**
 * Structured signals extracted deterministically from source files
 * before sending to the LLM. These give the LLM guardrails and reduce
 * the amount of parsing it needs to do.
 */
export interface DeterministicSignals {
  /** All tokens extracted from CSS, Tailwind, JSON, and Swift files */
  tokens: CSSToken[];

  /** Pre-computed partial fingerprint from deterministic analysis */
  partial: Partial<DesignFingerprint>;

  /** Which dimensions had enough data for deterministic extraction */
  coverage: SignalCoverage;

  /** Dimensions where the LLM should focus its analysis */
  llmFocusAreas: string[];

  /** Architecture methodology signals detected from code patterns */
  methodologySignals: string[];

  /** Component names detected for architecture analysis */
  componentNames: string[];
}

export interface SignalCoverage {
  colors: number;
  spacing: number;
  typography: number;
  surfaces: number;
  architecture: number;
}
