#!/usr/bin/env node
import { existsSync } from "node:fs";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const distInitPayloadsDir = join(
  ROOT,
  "packages",
  "ghost",
  "dist",
  "init-payloads",
);

await rm(distInitPayloadsDir, { recursive: true, force: true });

const sourceInitPayloadsDir = join(
  ROOT,
  "packages",
  "ghost",
  "src",
  "init-payloads",
);
if (existsSync(sourceInitPayloadsDir)) {
  await cp(sourceInitPayloadsDir, distInitPayloadsDir, { recursive: true });
}

await cp(
  join(ROOT, "packages", "vessel-light", ".ghost"),
  join(distInitPayloadsDir, "vessel-light"),
  {
    recursive: true,
    filter(source) {
      const name = source.split(/[\\/]/).at(-1);
      return name !== ".events" && name !== ".gitignore";
    },
  },
);

const ghostDir = join(ROOT, "packages", "ghost");
const baselineDir = join(ghostDir, "dist", "baseline");
await rm(baselineDir, { recursive: true, force: true });
await cp(join(ghostDir, "src", "baseline"), baselineDir, { recursive: true });
const release = JSON.parse(
  await readFile(join(ghostDir, "package.json"), "utf8"),
);
const manifestPath = join(baselineDir, "manifest.yml");
const manifest = (await readFile(manifestPath, "utf8")).replace(
  /^version:.*\n?/m,
  "",
);
await writeFile(
  manifestPath,
  `${manifest.trimEnd()}\nversion: "${release.version}"\n`,
);
