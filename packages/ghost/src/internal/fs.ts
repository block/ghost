import { readFile } from "node:fs/promises";

export async function readOptionalUtf8(
  path: string,
): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    if (isMissingPathError(err)) return undefined;
    throw err;
  }
}

export function isMissingPathError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}
