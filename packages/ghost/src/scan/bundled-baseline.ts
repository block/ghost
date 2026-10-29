import { fileURLToPath } from "node:url";

export function bundledBaselineDir(): string {
  return fileURLToPath(new URL("../baseline/", import.meta.url));
}
