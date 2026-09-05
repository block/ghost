import { UsageError } from "#ghost-core";

export function parseEnumOption<const T extends readonly string[]>(
  value: unknown,
  option: string,
  allowed: T,
): T[number] {
  if (typeof value === "string" && allowed.includes(value)) {
    return value as T[number];
  }
  throw new UsageError(`${option} must be one of: ${allowed.join(", ")}`);
}
