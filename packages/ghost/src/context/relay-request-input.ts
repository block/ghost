import { readFile } from "node:fs/promises";
import type { GhostRelayRequest } from "./relay-request.js";
import { parseGhostRelayRequestRaw } from "./relay-request.js";

export async function readRelayRequestOption(opts: {
  request?: unknown;
  requestStdin?: unknown;
}): Promise<GhostRelayRequest | undefined> {
  if (typeof opts.request === "string") {
    const raw = await readFile(opts.request, "utf-8");
    return parseGhostRelayRequestRaw(raw, opts.request);
  }
  if (opts.requestStdin) {
    return parseGhostRelayRequestRaw(await readStdin(), "stdin");
  }
  return undefined;
}

export function requestWithPositionalTarget(
  request: GhostRelayRequest,
  target: string,
): GhostRelayRequest {
  if (request.target_paths?.length || target === ".") return request;
  return { ...request, target_paths: [target] };
}

async function readStdin(): Promise<string> {
  let raw = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return raw;
}
