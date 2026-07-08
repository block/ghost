import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function shootAll(config) {
  const help = spawnSync("agent-browser", ["--help"], { encoding: "utf8" });
  if (help.error?.code === "ENOENT") {
    console.error(
      "steering-eval: agent-browser is required for screenshots. Install agent-browser and ensure it is on PATH.",
    );
    process.exit(1);
  }

  for (const html of findHtml(config.out)) {
    const png = html.replace(/\.html$/u, ".png");
    if (existsSync(png)) continue;
    execFileSync("agent-browser", ["open", `file://${resolve(html)}`], {
      stdio: "inherit",
    });
    execFileSync("agent-browser", ["viewport", "1280", "900"], {
      stdio: "inherit",
    });
    execFileSync("agent-browser", ["screenshot", png, "--full"], {
      stdio: "inherit",
    });
  }
}

function findHtml(root) {
  const files = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = resolve(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/run-\d+\.html$/u.test(entry)) files.push(path);
    }
  }
  walk(root);
  return files.sort();
}
