import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendHistory, readHistory } from "../../src/core/evolution/index.js";

const ENV = "GHOST_PACKAGE_DIR";

describe("history honors GHOST_PACKAGE_DIR", () => {
  let cwd: string;
  let prev: string | undefined;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "ghost-history-"));
    prev = process.env[ENV];
  });

  afterEach(async () => {
    if (prev === undefined) delete process.env[ENV];
    else process.env[ENV] = prev;
    await rm(cwd, { recursive: true, force: true });
  });

  const entry = {
    schema: "ghost.fingerprint.history/v1" as const,
    timestamp: "2026-01-01T00:00:00.000Z",
    target: "self",
  } as unknown as Parameters<typeof appendHistory>[0];

  it("defaults to .ghost/history.jsonl", async () => {
    delete process.env[ENV];
    await appendHistory(entry, cwd);
    expect(existsSync(join(cwd, ".ghost", "history.jsonl"))).toBe(true);
    expect(await readHistory(cwd)).toHaveLength(1);
  });

  it("writes under the configured package dir (.agents/ghost)", async () => {
    process.env[ENV] = ".agents/ghost";
    await appendHistory(entry, cwd);
    expect(existsSync(join(cwd, ".agents", "ghost", "history.jsonl"))).toBe(
      true,
    );
    expect(existsSync(join(cwd, ".ghost", "history.jsonl"))).toBe(false);
    expect(await readHistory(cwd)).toHaveLength(1);
  });
});
