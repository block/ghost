import type { DriftReport } from "../types.js";

export function formatReport(report: DriftReport): string {
  return JSON.stringify(report, null, 2);
}
