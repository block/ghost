import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// @ts-expect-error plain ESM module without type declarations
import { renderReport } from "../lib/report.mjs";

const FIXTURE = join(__dirname, "..", "fixtures", "metrics.sample.json");

const cleanups: string[] = [];

async function freshOutDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "steering-control-report-"));
  cleanups.push(dir);
  return dir;
}

function stripGeneratedAt(html: string): string {
  return html
    .split("\n")
    .filter((line) => !line.includes("generated:"))
    .join("\n");
}

afterAll(async () => {
  await Promise.all(
    cleanups.map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("renderReport", () => {
  it("writes a self-contained report covering all arms", async () => {
    const outDir = await freshOutDir();
    const reportPath = await renderReport(FIXTURE, outDir);
    expect(reportPath).toBe(join(outDir, "report.html"));

    const html = await readFile(reportPath, "utf8");
    for (const arm of ["naked", "dump", "gather", "dump-growth"]) {
      expect(html).toContain(arm);
    }
  });

  it("renders the SVG headline chart", async () => {
    const outDir = await freshOutDir();
    const html = await readFile(await renderReport(FIXTURE, outDir), "utf8");
    expect(html).toContain('<svg class="headline"');
    expect(html).toContain("brand-context tokens");
  });

  it("marks poison pulls in red", async () => {
    const outDir = await freshOutDir();
    const html = await readFile(await renderReport(FIXTURE, outDir), "utf8");
    expect(html).toContain('class="poison"');
    expect(html).toContain("#b91c1c");
  });

  it("renders placeholders when no screenshots exist", async () => {
    const outDir = await freshOutDir();
    const html = await readFile(await renderReport(FIXTURE, outDir), "utf8");
    expect(html).toContain("placeholder");
    expect(html).toContain("no screenshot");
    expect(html).not.toContain("data:image/webp;base64");
  });

  it("is deterministic modulo the generatedAt line", async () => {
    const dirA = await freshOutDir();
    const dirB = await freshOutDir();
    const htmlA = await readFile(await renderReport(FIXTURE, dirA), "utf8");
    const htmlB = await readFile(await renderReport(FIXTURE, dirB), "utf8");
    expect(stripGeneratedAt(htmlA)).toBe(stripGeneratedAt(htmlB));
  });
});
