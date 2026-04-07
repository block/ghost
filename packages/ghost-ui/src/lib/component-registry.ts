import registryData from "../../registry.json";

// ── Category metadata ──
// Display order and names for the functional categories in registry.json.
// "ai" is a tag, not a navigation category — it's used as a badge instead.

const categoryMeta: Record<string, { name: string; description: string }> = {
  input: {
    name: "Inputs",
    description: "Form controls and interactive inputs",
  },
  display: {
    name: "Display",
    description: "Visual content and presentation",
  },
  feedback: {
    name: "Feedback",
    description: "Alerts, notifications, and status indicators",
  },
  navigation: {
    name: "Navigation",
    description: "Menus, tabs, and wayfinding",
  },
  layout: {
    name: "Layout",
    description: "Content organization and structure",
  },
  chat: { name: "Chat", description: "Conversational AI interfaces" },
  code: {
    name: "Code",
    description: "Code editing, display, and development tools",
  },
  media: { name: "Media", description: "Audio, video, and rich media" },
};

const categoryOrder = Object.keys(categoryMeta);

// ── Types ──

export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type ComponentEntry = {
  slug: string;
  name: string;
  categories: string[];
  primaryCategory: string;
  dependencies: string[];
  registryDependencies: string[];
  isAI: boolean;
  /** Where the demo file lives, if it exists */
  demoSource: "primitives" | "ai-elements";
};

// ── Helpers ──

function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((w) => {
      // Special casing
      if (w === "otp") return "OTP";
      if (w === "jsx") return "JSX";
      if (w === "api") return "API";
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function getPrimaryCategory(cats: string[]): string {
  const functional = cats.filter((c) => c !== "ai");
  if (functional.length === 0) return "display";
  // Pick the one that appears first in our defined order
  for (const cat of categoryOrder) {
    if (functional.includes(cat)) return cat;
  }
  return functional[0];
}

// ── Derived data ──

type RegistryItem = {
  name: string;
  type: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { type: string; target: string; path: string }[];
  categories?: string[];
};

const uiItems = (registryData.items as RegistryItem[]).filter(
  (item) => item.type === "registry:ui",
);

const componentMap = new Map<string, ComponentEntry>();

for (const item of uiItems) {
  const cats = item.categories ?? [];
  const isAI = cats.includes("ai");

  // Determine demo directory from the component's file path
  const filePath = item.files?.[0]?.path ?? "";
  const demoSource: "primitives" | "ai-elements" = filePath.includes(
    "ai-elements",
  )
    ? "ai-elements"
    : "primitives";

  const entry: ComponentEntry = {
    slug: item.name,
    name: slugToDisplayName(item.name),
    categories: cats,
    primaryCategory: getPrimaryCategory(cats),
    dependencies: item.dependencies ?? [],
    registryDependencies: (item.registryDependencies ?? []).filter(
      (d) => d !== "utils",
    ),
    isAI,
    demoSource,
  };

  componentMap.set(item.name, entry);
}

// Sort components alphabetically within each category
const allComponents = Array.from(componentMap.values()).sort((a, b) =>
  a.slug.localeCompare(b.slug),
);

// ── Public API ──

export const categories: Category[] = categoryOrder
  .filter((slug) => allComponents.some((c) => c.primaryCategory === slug))
  .map((slug) => ({
    slug,
    ...categoryMeta[slug],
  }));

export function getAllComponents(): ComponentEntry[] {
  return allComponents;
}

export function getComponent(slug: string): ComponentEntry | undefined {
  return componentMap.get(slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getComponentsByCategory(
  categorySlug: string,
): ComponentEntry[] {
  return allComponents.filter((c) => c.primaryCategory === categorySlug);
}
