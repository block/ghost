import { extname } from "node:path";
import { parse as parseYaml } from "yaml";

export const GHOST_RELAY_REQUEST_SCHEMA = "ghost.relay-request/v1" as const;

export type GhostRelayRequestSelectorValue = string | string[];

export interface GhostRelayRequest {
  schema: typeof GHOST_RELAY_REQUEST_SCHEMA;
  task: string;
  prompt?: string;
  target_paths?: string[];
  selectors?: Record<string, GhostRelayRequestSelectorValue>;
  constraints?: Record<string, unknown>;
}

export interface GhostRelayRequestSummary {
  schema: typeof GHOST_RELAY_REQUEST_SCHEMA;
  task: string;
  target_paths: string[];
  selectors: Record<string, GhostRelayRequestSelectorValue>;
  constraints?: Record<string, unknown>;
  prompt?: string;
}

export function parseGhostRelayRequestRaw(
  raw: string,
  label: string,
): GhostRelayRequest {
  let parsed: unknown;
  try {
    parsed = isJsonLabel(label) ? JSON.parse(raw) : parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not a valid Relay request: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  return parseGhostRelayRequest(parsed, label);
}

export function parseGhostRelayRequest(
  input: unknown,
  label = "Relay request",
): GhostRelayRequest {
  const errors = validateGhostRelayRequest(input);
  if (errors.length > 0) {
    throw new Error(
      `Invalid Ghost Relay request ${label}:\n${errors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }
  return input as GhostRelayRequest;
}

export function summarizeGhostRelayRequest(
  request: GhostRelayRequest,
): GhostRelayRequestSummary {
  return {
    schema: request.schema,
    task: request.task,
    target_paths: request.target_paths ?? [],
    selectors: request.selectors ?? {},
    ...(request.constraints ? { constraints: request.constraints } : {}),
    ...(request.prompt ? { prompt: request.prompt } : {}),
  };
}

export function validateGhostRelayRequest(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["request must be an object."];
  }
  const request = input as Record<string, unknown>;
  if (request.schema !== GHOST_RELAY_REQUEST_SCHEMA) {
    errors.push(`schema must be ${GHOST_RELAY_REQUEST_SCHEMA}.`);
  }
  if (!isNonEmptyString(request.task)) {
    errors.push("task is required.");
  }
  if (request.prompt !== undefined && typeof request.prompt !== "string") {
    errors.push("prompt must be a string.");
  }
  if (request.target_paths !== undefined) {
    if (!Array.isArray(request.target_paths)) {
      errors.push("target_paths must be an array.");
    } else {
      request.target_paths.forEach((path, index) => {
        if (!isNonEmptyString(path)) {
          errors.push(`target_paths[${index}] must be a non-empty string.`);
        }
      });
    }
  }
  if (request.selectors !== undefined) {
    if (!isPlainRecord(request.selectors)) {
      errors.push("selectors must be an object.");
    } else {
      for (const [key, value] of Object.entries(request.selectors)) {
        if (!isNonEmptyString(key)) {
          errors.push("selectors keys must be non-empty strings.");
        }
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (!isNonEmptyString(item)) {
              errors.push(
                `selectors.${key}[${index}] must be a non-empty string.`,
              );
            }
          });
        } else if (!isNonEmptyString(value)) {
          errors.push(`selectors.${key} must be a string or string array.`);
        }
      }
    }
  }
  if (
    request.constraints !== undefined &&
    !isPlainRecord(request.constraints)
  ) {
    errors.push("constraints must be an object.");
  }
  return errors;
}

function isJsonLabel(label: string): boolean {
  return extname(label).toLowerCase() === ".json";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
