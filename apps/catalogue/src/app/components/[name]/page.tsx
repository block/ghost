import { Navigate, useParams } from "react-router";
import { ComponentPageShell } from "@/components/docs/component-page-shell";
import { getComponentDoc } from "@/lib/component-docs";
import {
  getCategory,
  getComponent,
  getComponentsByCategory,
} from "@/lib/component-registry";
import { getComponentSpec } from "@/lib/component-source";

// ── Import demo source files as raw strings at build time ──

const demoSourceModules = import.meta.glob(
  [
    "/src/components/docs/primitives/*-demo.tsx",
    "/src/components/docs/ai-elements/*-demo.tsx",
  ],
  { query: "?raw", eager: true },
) as Record<string, { default: string }>;

function getDemoSource(
  slug: string,
  source: "primitives" | "ai-elements",
): string | null {
  const key = `/src/components/docs/${source}/${slug}-demo.tsx`;
  return demoSourceModules[key]?.default ?? null;
}

export default function ComponentPage() {
  const { name } = useParams<{ name: string }>();

  if (!name) return <Navigate to="/ui/components" replace />;

  const component = getComponent(name);
  if (!component) return <Navigate to="/ui/components" replace />;

  const category = getCategory(component.primaryCategory);
  const siblings = getComponentsByCategory(component.primaryCategory);
  const currentIndex = siblings.findIndex((c) => c.slug === name);
  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next =
    currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  const demoSource = getDemoSource(component.slug, component.demoSource);
  const spec = getComponentSpec(component.slug);
  const docs = getComponentDoc(name);

  return (
    <ComponentPageShell
      component={component}
      categoryName={category?.name ?? component.primaryCategory}
      demoSource={demoSource}
      spec={spec}
      prev={prev ? { slug: prev.slug, name: prev.name } : null}
      next={next ? { slug: next.slug, name: next.name } : null}
      docs={docs}
    />
  );
}
