import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

export function shootAll(config) {
  requireTool("agent-browser", "screenshots");
  requireTool("cwebp", "screenshot optimization");

  for (const html of findHtml(config.out)) {
    const webp = html.replace(/\.html$/u, ".webp");
    if (existsSync(webp)) continue;
    // agent-browser only emits PNG; shoot, convert to WebP, drop the PNG.
    const png = html.replace(/\.html$/u, ".png");
    execFileSync("agent-browser", ["open", `file://${resolve(html)}`], {
      stdio: "inherit",
    });
    execFileSync("agent-browser", ["set", "viewport", "1280", "900"], {
      stdio: "inherit",
    });
    execFileSync("agent-browser", ["screenshot", png, "--full"], {
      stdio: "inherit",
    });
    execFileSync("cwebp", ["-quiet", "-q", "80", png, "-o", webp], {
      stdio: "inherit",
    });
    unlinkSync(png);
  }
}

function requireTool(name, purpose) {
  const probe = spawnSync(name, ["-version"], { encoding: "utf8" });
  if (probe.error?.code === "ENOENT") {
    console.error(
      `steering-control: ${name} is required for ${purpose}. Install ${name} and ensure it is on PATH.`,
    );
    process.exit(1);
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
