import { describe, expect, it } from "vitest";

// @ts-expect-error plain ESM module without type declarations
import { cellSameness, structuralFingerprint } from "../lib/sameness.mjs";

const CARD_PAGE = `<!doctype html>
<html>
<head>
<style>
:root { --accent: #2563eb; --radius: 8px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.card { display: flex; flex-direction: column; }
</style>
</head>
<body>
<header><h1>Billing</h1></header>
<main>
<section class="grid">
<div class="card"><h2>Plan</h2><p>Pro plan, billed monthly.</p></div>
<div class="card"><h2>Usage</h2><p>All quiet this cycle.</p></div>
<div class="card"><h2>Invoices</h2><p>Nothing due.</p></div>
</section>
</main>
<footer><p>Fine print.</p></footer>
</body>
</html>`;

const CARD_PAGE_OTHER_TEXT = CARD_PAGE.replace("Billing", "Receipts")
  .replace("Pro plan, billed monthly.", "Starter plan, billed yearly.")
  .replace("All quiet this cycle.", "Heavy usage this cycle.")
  .replace("Nothing due.", "Two invoices due.")
  .replace("Fine print.", "Different fine print entirely.");

const LIST_PAGE = `<!doctype html>
<html>
<head>
<style>
.stack { --spacing: 4px; display: flex; flex-direction: row; }
</style>
</head>
<body>
<nav><a href="/">Home</a></nav>
<article>
<h3>A totally different shape</h3>
<ul class="stack"><li>one</li><li>two</li><li>three</li><li>four</li></ul>
<table><tr><td>cell</td></tr></table>
<form><input type="text"/><button>Go</button></form>
</article>
</body>
</html>`;

describe("structuralFingerprint", () => {
  it("captures structure, layout, and custom properties, not text", () => {
    const print = structuralFingerprint(CARD_PAGE);
    expect(print.sequence).toContain(
      "section|display:grid;gap:1rem;grid-template-columns:repeat(3, 1fr)",
    );
    expect(print.headings).toEqual([1, 2, 2, 2]);
    expect(print.customProps).toEqual(new Set(["--accent", "--radius"]));
    expect(print.sequence.join(" ")).not.toContain("Billing");
  });
});

describe("cellSameness", () => {
  it("returns mean 1 for identical HTML strings", () => {
    const { mean, pairs } = cellSameness([CARD_PAGE, CARD_PAGE, CARD_PAGE]);
    expect(mean).toBe(1);
    expect(pairs).toHaveLength(3);
  });

  it("returns a low mean for completely different structures", () => {
    const { mean } = cellSameness([CARD_PAGE, LIST_PAGE]);
    expect(mean).toBeLessThan(0.4);
  });

  it("returns a high mean when only text content differs", () => {
    const { mean } = cellSameness([CARD_PAGE, CARD_PAGE_OTHER_TEXT]);
    expect(mean).toBeGreaterThan(0.95);
  });

  it("returns null mean when there are fewer than two runs", () => {
    expect(cellSameness([CARD_PAGE]).mean).toBeNull();
    expect(cellSameness([]).mean).toBeNull();
  });
});
