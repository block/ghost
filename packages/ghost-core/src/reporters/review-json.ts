import type { ReviewReport } from "../types.js";

export function formatReviewJSON(report: ReviewReport): string {
  return JSON.stringify(report, null, 2);
}
