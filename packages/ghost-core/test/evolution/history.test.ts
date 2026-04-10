import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendHistory,
  readHistory,
  readRecentHistory,
} from "../../src/evolution/history.js";
import { makeFingerprint, makeHistoryEntry } from "../helpers/fingerprint-factory.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ghost-test-history-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("appendHistory", () => {
  it("creates .ghost/ directory if missing", async () => {
    const fp = makeFingerprint();
    const entry = makeHistoryEntry(fp);

    await appendHistory(entry, tempDir);

    expect(existsSync(join(tempDir, ".ghost"))).toBe(true);
    expect(existsSync(join(tempDir, ".ghost", "history.jsonl"))).toBe(true);
  });

  it("appends JSONL line to history.jsonl", async () => {
    const fp = makeFingerprint();
    const entry = makeHistoryEntry(fp);

    await appendHistory(entry, tempDir);

    const content = await readFile(join(tempDir, ".ghost", "history.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.fingerprint.id).toBe(fp.id);
  });

  it("appends multiple entries as separate lines", async () => {
    const fp1 = makeFingerprint({ id: "first" });
    const fp2 = makeFingerprint({ id: "second" });

    await appendHistory(makeHistoryEntry(fp1), tempDir);
    await appendHistory(makeHistoryEntry(fp2), tempDir);

    const content = await readFile(join(tempDir, ".ghost", "history.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).fingerprint.id).toBe("first");
    expect(JSON.parse(lines[1]).fingerprint.id).toBe("second");
  });
});

describe("readHistory", () => {
  it("returns empty array when no history exists", async () => {
    const result = await readHistory(tempDir);
    expect(result).toEqual([]);
  });

  it("reads all entries from JSONL", async () => {
    const fp1 = makeFingerprint({ id: "a" });
    const fp2 = makeFingerprint({ id: "b" });

    await appendHistory(makeHistoryEntry(fp1), tempDir);
    await appendHistory(makeHistoryEntry(fp2), tempDir);

    const result = await readHistory(tempDir);
    expect(result).toHaveLength(2);
    expect(result[0].fingerprint.id).toBe("a");
    expect(result[1].fingerprint.id).toBe("b");
  });
});

describe("readRecentHistory", () => {
  it("returns last N entries", async () => {
    for (let i = 0; i < 5; i++) {
      await appendHistory(
        makeHistoryEntry(makeFingerprint({ id: `entry-${i}` })),
        tempDir,
      );
    }

    const result = await readRecentHistory(2, tempDir);
    expect(result).toHaveLength(2);
    expect(result[0].fingerprint.id).toBe("entry-3");
    expect(result[1].fingerprint.id).toBe("entry-4");
  });

  it("returns all entries if fewer than N exist", async () => {
    await appendHistory(
      makeHistoryEntry(makeFingerprint({ id: "only" })),
      tempDir,
    );

    const result = await readRecentHistory(10, tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].fingerprint.id).toBe("only");
  });
});
