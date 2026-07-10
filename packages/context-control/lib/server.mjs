// Local bench server: a handful of JSON endpoints plus the static UI.
// Plain node:http, no dependencies — this never leaves the machine.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseAsks, runAsk } from "./bench.mjs";
import { gatherMenu, pullNode } from "./ghost.mjs";
import { availableModels, resolveModel } from "./model.mjs";
import { suiteCoverage } from "./score.mjs";
import { readTape, toSessions } from "./tape.mjs";

const UI_DIR = fileURLToPath(new URL("../ui/", import.meta.url));

export function startServer({ ghostBin, packageDir, asksPath, port = 4114 }) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/api/menu") {
        return json(res, await gatherMenu({ ghostBin, packageDir }));
      }
      if (url.pathname === "/api/pull") {
        const id = url.searchParams.get("id");
        if (!id) return json(res, { error: "missing id" }, 400);
        return json(res, await pullNode({ ghostBin, packageDir, id }));
      }
      if (url.pathname === "/api/models") {
        return json(res, { models: availableModels() });
      }
      if (url.pathname === "/api/asks") {
        return json(res, { asks: await loadAsks(asksPath) });
      }
      if (url.pathname === "/api/bench" && req.method === "POST") {
        const body = JSON.parse(await readBody(req));
        const menu = (await gatherMenu({ ghostBin, packageDir })).nodes;
        const model = resolveModel(body.model);
        const asks = Array.isArray(body.asks) ? body.asks : [body];
        const results = [];
        for (const item of asks) {
          results.push(
            await runAsk({
              model,
              ask: item.ask,
              menu,
              trials: body.trials ?? 5,
              expected: item.expected ?? null,
            }),
          );
        }
        return json(res, { results, coverage: suiteCoverage(results, menu) });
      }
      if (url.pathname === "/api/tape") {
        const events = await readTape(packageDir);
        return json(res, { events, sessions: toSessions(events) });
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await readFile(`${UI_DIR}index.html`, "utf-8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(html);
      }
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    } catch (err) {
      json(res, { error: err.message }, 500);
    }
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function loadAsks(asksPath) {
  if (!asksPath) return [];
  try {
    return parseAsks(await readFile(asksPath, "utf-8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

function json(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
