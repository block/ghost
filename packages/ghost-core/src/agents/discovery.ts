import type { AgentContext } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

export interface DiscoveredSystem {
  name: string;
  url: string;
  description: string;
  source: "npm" | "github" | "web" | "catalog";
  similarity?: number;
  downloads?: number;
  stars?: number;
}

export interface DiscoveryInput {
  query?: string;
  similarTo?: import("../types.js").DesignFingerprint;
  maxResults?: number;
}

/**
 * Discovery Agent — "What design systems exist?"
 *
 * Multi-turn search across npm registry, GitHub, and a curated catalog.
 * Iteration 1: search the curated catalog (fast, offline)
 * Iteration 2: search npm registry (if query provided)
 * Iteration 3: search GitHub (if query provided and LLM available)
 */
export class DiscoveryAgent extends BaseAgent<
  DiscoveryInput,
  DiscoveredSystem[]
> {
  name = "discovery";
  maxIterations = 3;
  systemPrompt = `You are a design system discovery agent. Your job is to find
public design systems matching given criteria. Search npm, GitHub, and the web.
Combine results from multiple sources, deduplicate, and rank by relevance.`;

  protected async step(
    state: AgentState<DiscoveredSystem[]>,
    input: DiscoveryInput,
    ctx: AgentContext,
  ): Promise<AgentState<DiscoveredSystem[]>> {
    const maxResults = input.maxResults ?? 20;

    if (state.iterations === 0) {
      // First iteration: curated catalog (always available)
      const catalogResults = searchCatalog(input.query);
      state.result = catalogResults;
      state.confidence = catalogResults.length > 0 ? 0.6 : 0.2;
      state.reasoning.push(
        `Found ${catalogResults.length} systems in curated catalog`,
      );

      if (!input.query || !ctx.llm) {
        state.status = "completed";
      }

      return state;
    }

    if (state.iterations === 1 && input.query) {
      // Second iteration: npm registry search
      try {
        const npmResults = await searchNpm(input.query, maxResults);
        const merged = mergeResults(state.result ?? [], npmResults);
        state.result = merged.slice(0, maxResults);
        state.confidence = Math.min(state.confidence + 0.2, 1.0);
        state.reasoning.push(
          `Found ${npmResults.length} packages on npm, ${merged.length} total after dedup`,
        );
      } catch (err) {
        state.warnings.push(
          `npm search failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!ctx.llm) {
        state.status = "completed";
      }

      return state;
    }

    if (state.iterations === 2 && input.query) {
      // Third iteration: GitHub search
      try {
        const ghResults = await searchGitHub(input.query, maxResults);
        const merged = mergeResults(state.result ?? [], ghResults);
        state.result = merged.slice(0, maxResults);
        state.confidence = Math.min(state.confidence + 0.15, 1.0);
        state.reasoning.push(
          `Found ${ghResults.length} repos on GitHub, ${merged.length} total after dedup`,
        );
      } catch (err) {
        state.warnings.push(
          `GitHub search failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      state.status = "completed";
      return state;
    }

    state.status = "completed";
    return state;
  }
}

// --- npm registry search ---

async function searchNpm(
  query: string,
  maxResults: number,
): Promise<DiscoveredSystem[]> {
  const searchTerms = `${query} design system component ui`;
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchTerms)}&size=${maxResults}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`npm search HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    objects: Array<{
      package: {
        name: string;
        description?: string;
        links?: { homepage?: string; repository?: string; npm?: string };
      };
      score?: { detail?: { popularity?: number } };
      searchScore?: number;
    }>;
  };

  return data.objects
    .filter((obj) => {
      const name = obj.package.name.toLowerCase();
      const desc = (obj.package.description ?? "").toLowerCase();
      // Filter for design-system-like packages
      return (
        name.includes("ui") ||
        name.includes("design") ||
        name.includes("component") ||
        name.includes("theme") ||
        desc.includes("design system") ||
        desc.includes("component library") ||
        desc.includes("ui kit")
      );
    })
    .map((obj) => ({
      name: obj.package.name,
      url:
        obj.package.links?.homepage ??
        obj.package.links?.repository ??
        `https://www.npmjs.com/package/${obj.package.name}`,
      description: obj.package.description ?? "",
      source: "npm" as const,
      downloads: undefined,
    }));
}

// --- GitHub search ---

async function searchGitHub(
  query: string,
  maxResults: number,
): Promise<DiscoveredSystem[]> {
  const searchTerms = `${query} design system component library`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerms)}&sort=stars&per_page=${Math.min(maxResults, 30)}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ghost-cli",
  };

  // Use GitHub token if available
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.",
      );
    }
    throw new Error(`GitHub search HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    items: Array<{
      full_name: string;
      html_url: string;
      description?: string;
      stargazers_count: number;
    }>;
  };

  return data.items.map((repo) => ({
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? "",
    source: "github" as const,
    stars: repo.stargazers_count,
  }));
}

// --- Curated catalog ---

function searchCatalog(query?: string): DiscoveredSystem[] {
  const systems: DiscoveredSystem[] = [
    {
      name: "shadcn/ui",
      url: "https://github.com/shadcn-ui/ui",
      description:
        "Beautifully designed components built with Radix UI and Tailwind CSS",
      source: "catalog",
      stars: 75000,
    },
    {
      name: "Radix Themes",
      url: "https://github.com/radix-ui/themes",
      description: "A component library optimized for fast development",
      source: "catalog",
      stars: 5000,
    },
    {
      name: "Material UI",
      url: "https://github.com/mui/material-ui",
      description: "Ready-to-use React components implementing Material Design",
      source: "catalog",
      stars: 94000,
    },
    {
      name: "Chakra UI",
      url: "https://github.com/chakra-ui/chakra-ui",
      description: "Simple, modular and accessible React component library",
      source: "catalog",
      stars: 38000,
    },
    {
      name: "Ant Design",
      url: "https://github.com/ant-design/ant-design",
      description:
        "An enterprise-class UI design language and React UI library",
      source: "catalog",
      stars: 93000,
    },
    {
      name: "Carbon Design System",
      url: "https://github.com/carbon-design-system/carbon",
      description: "IBM's open source design system",
      source: "catalog",
      stars: 7800,
    },
    {
      name: "Adobe Spectrum",
      url: "https://github.com/adobe/react-spectrum",
      description:
        "A collection of libraries for building adaptive, accessible UIs",
      source: "catalog",
      stars: 13000,
    },
    {
      name: "Mantine",
      url: "https://github.com/mantinedev/mantine",
      description:
        "A fully featured React components library with dark theme support",
      source: "catalog",
      stars: 27000,
    },
    {
      name: "NextUI",
      url: "https://github.com/nextui-org/nextui",
      description: "Beautiful, fast and modern React UI library",
      source: "catalog",
      stars: 22000,
    },
    {
      name: "Flowbite",
      url: "https://github.com/themesberg/flowbite",
      description: "Open-source UI component library based on Tailwind CSS",
      source: "catalog",
      stars: 8000,
    },
    {
      name: "Park UI",
      url: "https://github.com/cschroeter/park-ui",
      description:
        "Beautifully designed components built on Ark UI and Panda CSS",
      source: "catalog",
      stars: 2000,
    },
    {
      name: "Tremor",
      url: "https://github.com/tremorlabs/tremor",
      description: "React components to build charts and dashboards",
      source: "catalog",
      stars: 16000,
    },
    {
      name: "daisyUI",
      url: "https://github.com/saadeghi/daisyui",
      description: "The most popular component library for Tailwind CSS",
      source: "catalog",
      stars: 34000,
    },
    {
      name: "Headless UI",
      url: "https://github.com/tailwindlabs/headlessui",
      description:
        "Completely unstyled, fully accessible UI components by Tailwind Labs",
      source: "catalog",
      stars: 26000,
    },
    {
      name: "Primer",
      url: "https://github.com/primer/react",
      description: "GitHub's design system implemented in React",
      source: "catalog",
      stars: 3200,
    },
    {
      name: "Arco Design",
      url: "https://github.com/arco-design/arco-design",
      description: "A comprehensive React UI components library by ByteDance",
      source: "catalog",
      stars: 4800,
    },
    {
      name: "Semi Design",
      url: "https://github.com/DouyinFE/semi-design",
      description: "Modern, comprehensive, flexible design system by TikTok",
      source: "catalog",
      stars: 8500,
    },
  ];

  if (!query) return systems;

  const q = query.toLowerCase();
  return systems.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );
}

// --- Merge and dedup ---

function mergeResults(
  existing: DiscoveredSystem[],
  incoming: DiscoveredSystem[],
): DiscoveredSystem[] {
  const seen = new Set(existing.map((s) => normalizeUrl(s.url)));
  const merged = [...existing];

  for (const system of incoming) {
    const normalized = normalizeUrl(system.url);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      merged.push(system);
    }
  }

  // Sort: catalog first (curated), then by stars, then by name
  return merged.sort((a, b) => {
    if (a.source === "catalog" && b.source !== "catalog") return -1;
    if (b.source === "catalog" && a.source !== "catalog") return 1;
    if ((b.stars ?? 0) !== (a.stars ?? 0))
      return (b.stars ?? 0) - (a.stars ?? 0);
    return a.name.localeCompare(b.name);
  });
}

function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
