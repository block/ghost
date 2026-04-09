import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../dist/assets");

fs.mkdirSync(assetsDir, { recursive: true });

fs.copyFileSync(
  path.resolve(__dirname, "../../ghost-ui/registry.json"),
  path.join(assetsDir, "registry.json"),
);

fs.copyFileSync(
  path.resolve(__dirname, "../../ghost-ui/.shadcn/skills.md"),
  path.join(assetsDir, "skills.md"),
);
