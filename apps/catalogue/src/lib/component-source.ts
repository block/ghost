import registryData from "@ghost/ui/registry.json";

// ── Types ──

export type VariantDef = {
  name: string;
  values: string[];
  defaultValue?: string;
};

export type ComponentSpec = {
  /** All exported component/function names */
  exports: string[];
  /** CVA variant definitions, if any */
  variants: VariantDef[];
  /** data-slot values used in this component */
  dataSlots: string[];
  /** The raw source code */
  source: string;
  /** File path relative to project root */
  filePath: string;
};

type RegistryItem = {
  name: string;
  type: string;
  files?: { path: string }[];
};

// ── Raw source imports via Vite glob ──

const rawSources: Record<string, string> = {};

const uiModules = import.meta.glob("/src/components/ui/**/*.tsx", {
  query: "?raw",
  eager: true,
}) as Record<string, { default: string }>;

const aiModules = import.meta.glob("/src/components/ai-elements/**/*.tsx", {
  query: "?raw",
  eager: true,
}) as Record<string, { default: string }>;

for (const [key, mod] of Object.entries({ ...uiModules, ...aiModules })) {
  // Glob keys are like "/src/components/ui/button.tsx"
  // Registry paths are like "src/components/ui/button.tsx"
  const normalized = key.startsWith("/") ? key.slice(1) : key;
  rawSources[normalized] = mod.default;
}

// ── Extraction helpers ──

function extractExports(source: string): string[] {
  // Match named exports at the end of file: export { Foo, Bar, baz }
  const exportBlockRe = /export\s*\{([^}]+)\}/g;
  const exports: string[] = [];

  let match;
  while ((match = exportBlockRe.exec(source)) !== null) {
    const names = match[1].split(",").map((s) =>
      s
        .trim()
        .split(/\s+as\s+/)
        .pop()!
        .trim(),
    );
    exports.push(...names.filter(Boolean));
  }

  // Match: export function Foo / export const Foo
  const exportDeclRe =
    /export\s+(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/g;
  while ((match = exportDeclRe.exec(source)) !== null) {
    if (!exports.includes(match[1])) {
      exports.push(match[1]);
    }
  }

  return exports;
}

function extractVariants(source: string): VariantDef[] {
  // Find the CVA variants block
  const variantsBlockRe =
    /variants:\s*\{([\s\S]*?)\},\s*(?:compoundVariants|defaultVariants)/;
  const variantsMatch = variantsBlockRe.exec(source);
  if (!variantsMatch) return [];

  const variantsBlock = variantsMatch[1];

  // Find default variants
  const defaultsRe = /defaultVariants:\s*\{([^}]*)\}/;
  const defaultsMatch = defaultsRe.exec(source);
  const defaults: Record<string, string> = {};

  if (defaultsMatch) {
    const defaultEntries = defaultsMatch[1].matchAll(
      /(\w[\w-]*)\s*:\s*"([^"]*)"/g,
    );
    for (const entry of defaultEntries) {
      defaults[entry[1]] = entry[2];
    }
  }

  // Parse each variant group: variantName: { value1: "...", value2: "..." }
  const variantDefs: VariantDef[] = [];
  const variantGroupRe = /(\w[\w-]*)\s*:\s*\{/g;
  let groupMatch;

  while ((groupMatch = variantGroupRe.exec(variantsBlock)) !== null) {
    const variantName = groupMatch[1];
    // Find the matching closing brace
    let depth = 1;
    let i = groupMatch.index + groupMatch[0].length;
    while (i < variantsBlock.length && depth > 0) {
      if (variantsBlock[i] === "{") depth++;
      if (variantsBlock[i] === "}") depth--;
      i++;
    }
    const groupContent = variantsBlock.slice(
      groupMatch.index + groupMatch[0].length,
      i - 1,
    );

    // Extract value names (keys of the object, anchored to line start to skip Tailwind prefixes like hover:)
    const valueRe = /^\s*["']?([\w-]+)["']?\s*:/gm;
    const values: string[] = [];
    let valueMatch;
    while ((valueMatch = valueRe.exec(groupContent)) !== null) {
      if (!values.includes(valueMatch[1])) {
        values.push(valueMatch[1]);
      }
    }

    if (values.length > 0) {
      variantDefs.push({
        name: variantName,
        values,
        defaultValue: defaults[variantName],
      });
    }
  }

  return variantDefs;
}

function extractDataSlots(source: string): string[] {
  const slotRe = /data-slot="([^"]+)"/g;
  const slots: string[] = [];
  let match;
  while ((match = slotRe.exec(source)) !== null) {
    if (!slots.includes(match[1])) {
      slots.push(match[1]);
    }
  }
  return slots;
}

// ── Public API ──

export function getComponentSpec(slug: string): ComponentSpec | null {
  const items = registryData.items as RegistryItem[];
  const item = items.find((i) => i.name === slug && i.type === "registry:ui");
  if (!item?.files?.[0]?.path) return null;

  const filePath = item.files[0].path;
  const source = rawSources[filePath];
  if (!source) return null;

  return {
    exports: extractExports(source),
    variants: extractVariants(source),
    dataSlots: extractDataSlots(source),
    source,
    filePath,
  };
}
