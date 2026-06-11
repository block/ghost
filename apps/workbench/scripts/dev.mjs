import { spawn } from "node:child_process";

let shuttingDown = false;

const commands = [
  {
    name: "api",
    args: ["exec", "tsx", "src/server/index.ts"],
  },
  {
    name: "vite",
    args: ["exec", "vite", "--host", "127.0.0.1", "--port", "5176"],
  },
];

const children = commands.map(({ name, args }) => {
  const child = spawn("pnpm", args, {
    env: process.env,
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[${name}] exited ${signal ? `with signal ${signal}` : `with code ${code}`}`,
    );
    shutdown(code ?? 1);
  });
  return child;
});

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
