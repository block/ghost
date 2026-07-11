import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Closure contract for the vessel-light fingerprint materials:
// 1. Every token declared in tokens.css is consumed somewhere (or allowlisted).
// 2. Every class defined in primitives.css renders in at least one ref.
// 3. Ref <style> blocks bind tokens, never raw colors, shadows, or timing.
// 4. email.html's hex-transcription map stays in sync with tokens.css.

const MATERIALS_DIR = "packages/vessel-light/.ghost/materials";
const REF_DIR = join(MATERIALS_DIR, "ref");

// Declared inventory: the closed five-hue expression set is the brand answer;
// no register renders all five at once (see signature.palette).
const TOKEN_ALLOWLIST = new Set([
  "--expression-3",
  "--expression-4",
  "--expression-5",
  // Policy tokens are consumed by prose and checks rather than CSS var().
  "--primary-budget",
  "--expression-budget-product",
  "--expression-budget-email",
  "--expression-budget-editorial",
  "--numeric-tabular",
]);

const tokensCss = readFileSync(join(MATERIALS_DIR, "tokens.css"), "utf8");
const primitivesCss = readFileSync(
  join(MATERIALS_DIR, "primitives.css"),
  "utf8",
);
const refFiles = readdirSync(REF_DIR)
  .filter((name) => name.endsWith(".html"))
  .map((name) => ({
    name,
    content: readFileSync(join(REF_DIR, name), "utf8"),
  }));

const failures = [];

// 1. Token closure.
const declared = new Set(
  [...tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
);
const consumed = new Set();
for (const source of [
  tokensCss,
  primitivesCss,
  ...refFiles.map((f) => f.content),
]) {
  for (const match of source.matchAll(/var\((--[a-z0-9-]+)/g)) {
    consumed.add(match[1]);
  }
}
for (const token of declared) {
  if (!consumed.has(token) && !TOKEN_ALLOWLIST.has(token)) {
    failures.push(
      `orphaned token: ${token} is declared in tokens.css but consumed nowhere`,
    );
  }
}
for (const token of consumed) {
  if (!declared.has(token)) {
    failures.push(
      `undeclared token: var(${token}) is consumed but not declared in tokens.css`,
    );
  }
}

// 2. Class closure: every primitive class appears in a ref's class attribute.
const primitiveClasses = new Set(
  [...primitivesCss.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]),
);
const refClasses = new Set();
for (const { content } of refFiles) {
  for (const match of content.matchAll(/class="([^"]*)"/g)) {
    for (const cls of match[1].split(/\s+/)) {
      if (cls) refClasses.add(cls);
    }
  }
}
for (const cls of primitiveClasses) {
  if (!refClasses.has(cls)) {
    failures.push(
      `undemonstrated class: .${cls} is defined in primitives.css but used in no ref`,
    );
  }
}

// 3. Ref purity: no raw colors, shadows, or timing in ref <style> blocks.
// Layout lengths (widths, paddings, insets) are incidental scaffolding and exempt.
// email.html is exempt (inline table-layout medium); its transcription map is
// validated in check 4 instead.
const RAW_VALUE_PATTERNS = [
  { pattern: /#[0-9a-fA-F]{3,8}\b/, label: "raw hex color" },
  { pattern: /\brgba?\(/, label: "raw rgb() color" },
  { pattern: /\bhsla?\(/, label: "raw hsl() color" },
  {
    pattern: /\bbox-shadow\s*:\s*(?!var\()[^;n]/,
    label: "non-token box-shadow",
  },
  { pattern: /\bcubic-bezier\(/, label: "raw easing curve" },
  { pattern: /\b\d+(\.\d+)?m?s\b/, label: "raw duration" },
];
for (const { name, content } of refFiles) {
  if (name === "email.html") continue;
  const styleBlocks = [...content.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(
    (m) => m[1],
  );
  for (const block of styleBlocks) {
    for (const { pattern, label } of RAW_VALUE_PATTERNS) {
      const match = block.match(pattern);
      if (match) {
        failures.push(
          `ref purity: ${name} <style> contains ${label} (${match[0].trim()})`,
        );
      }
    }
  }
}

// 4. email.html transcription map: every "<value> = --token" comment pair must
// still match the token's declared value in tokens.css.
const email = refFiles.find((f) => f.name === "email.html");
if (email) {
  for (const match of email.content.matchAll(
    /(#[0-9a-fA-F]{3,8}|\d+px)\s*=\s*(--[a-z0-9-]+)/g,
  )) {
    const [, value, token] = match;
    const declaration = tokensCss.match(
      new RegExp(`^\\s*${token}\\s*:\\s*([^;]+);`, "m"),
    );
    if (!declaration) {
      failures.push(
        `email transcription: ${token} is mapped in email.html but not declared`,
      );
    } else if (declaration[1].trim().toLowerCase() !== value.toLowerCase()) {
      failures.push(
        `email transcription: email.html maps ${value} to ${token}, but tokens.css declares ${declaration[1].trim()}`,
      );
    }
  }
} else {
  failures.push("missing ref: email.html not found");
}

if (failures.length > 0) {
  console.error("vessel-light closure check failed:\n");
  for (const failure of failures) {
    console.error(`  ✗ ${failure}`);
  }
  process.exit(1);
}

console.log(
  `vessel-light closure check passed: ${declared.size} tokens, ${primitiveClasses.size} primitive classes, ${refFiles.length} refs.`,
);
