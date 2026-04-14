import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtractedFile, SampledMaterial, TargetType } from "../types.js";
import { walkDirectory } from "./walker.js";

const MAX_FILE_SIZE = 3000;
const MAX_FILE_SIZE_HIGH_PRIORITY = 20_000; // Theme/token files get more space
const MAX_TOTAL_CHARS = 120_000; // ~30K tokens
const MAX_COMPONENT_SAMPLES = 5;

interface ScoredFile {
  file: ExtractedFile;
  score: number;
  reason: string;
}

/**
 * Smart file sampler. Walks a directory, scores files by design-signal density,
 * and returns the most informative files for LLM interpretation.
 *
 * This replaces format-detector + normalizer — the LLM figures out what
 * the files contain. We just need to give it the right files.
 */
export async function sampleDirectory(
  dir: string,
  targetType: TargetType,
  options?: { maxFiles?: number; ignore?: string[] },
): Promise<SampledMaterial> {
  // Walk all files
  const allFiles = await walkDirectory(dir, {
    maxFiles: options?.maxFiles ?? 200,
    ignore: options?.ignore,
  });

  // Read package.json if present
  let packageJson: SampledMaterial["metadata"]["packageJson"];
  try {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const raw = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(raw);
      packageJson = {
        name: pkg.name,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
      };
    }
  } catch {
    // Skip if can't read
  }

  // Read Package.swift if present (Swift Package Manager)
  let packageSwift: SampledMaterial["metadata"]["packageSwift"];
  try {
    const swiftPkgPath = join(dir, "Package.swift");
    if (existsSync(swiftPkgPath)) {
      const raw = await readFile(swiftPkgPath, "utf-8");
      const nameMatch = raw.match(/name:\s*"([^"]+)"/);
      const depMatches = [...raw.matchAll(/\.package\(\s*url:\s*"([^"]+)"/g)];
      packageSwift = {
        name: nameMatch?.[1],
        dependencies: depMatches.map((m) => m[1]),
      };
    }
  } catch {
    // Skip if can't read
  }

  // Score each file
  const scored: ScoredFile[] = allFiles.map((file) => {
    const { score, reason } = scoreFile(file);
    return { file, score, reason };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select files within budget
  const selected: ScoredFile[] = [];
  let totalChars = 0;
  let componentCount = 0;

  for (const item of scored) {
    if (item.score <= 0) continue;

    // Cap component files
    if (item.file.type === "component") {
      if (componentCount >= MAX_COMPONENT_SAMPLES) continue;
      componentCount++;
    }

    // High-priority files (score >= 8: theme, token, config) get more space
    const fileLimit = item.score >= 8 ? MAX_FILE_SIZE_HIGH_PRIORITY : MAX_FILE_SIZE;
    const content = truncateFile(item.file.content, fileLimit);
    if (totalChars + content.length > MAX_TOTAL_CHARS) {
      // Try to fit with aggressive truncation
      const remaining = MAX_TOTAL_CHARS - totalChars;
      if (remaining < 500) break;
      selected.push({
        ...item,
        file: { ...item.file, content: item.file.content.slice(0, remaining) },
      });
      totalChars += remaining;
      break;
    }

    selected.push({ ...item, file: { ...item.file, content } });
    totalChars += content.length;
  }

  // Always include package.json summary if available
  if (packageJson) {
    const pkgSummary = {
      path: "package.json",
      content: JSON.stringify(
        {
          name: packageJson.name,
          dependencies: packageJson.dependencies,
          devDependencies: packageJson.devDependencies,
        },
        null,
        2,
      ),
      reason: "Package manifest — dependency detection",
    };

    // Prepend if not already selected
    if (!selected.some((s) => s.file.path === "package.json")) {
      selected.unshift({
        file: {
          path: pkgSummary.path,
          content: pkgSummary.content,
          type: "config",
        },
        score: 7,
        reason: pkgSummary.reason,
      });
    }
  }

  // Always include Package.swift summary if available
  if (packageSwift) {
    const swiftPkgPath = join(dir, "Package.swift");
    if (!selected.some((s) => s.file.path === "Package.swift")) {
      try {
        const raw = await readFile(swiftPkgPath, "utf-8");
        selected.unshift({
          file: {
            path: "Package.swift",
            content: truncateFile(raw),
            type: "config",
          },
          score: 7,
          reason: "Swift package manifest — dependency detection",
        });
      } catch {
        // Skip
      }
    }
  }

  return {
    files: selected.map((s) => ({
      path: s.file.path,
      content: s.file.content,
      reason: s.reason,
    })),
    metadata: {
      totalFiles: allFiles.length,
      sampledFiles: selected.length,
      targetType,
      packageJson,
      packageSwift,
    },
  };
}

/**
 * Score a file by how likely it is to contain design system signals.
 */
function scoreFile(file: ExtractedFile): { score: number; reason: string } {
  const name = file.path.toLowerCase();
  const baseName = name.split("/").pop() ?? "";

  // Theme/token files — highest priority (web + native naming conventions)
  if (/theme|tokens?|variables|design-tokens|primitives|colorscheme|designsystem|styleguide|styles-main/i.test(baseName)) {
    return { score: 10, reason: "Theme/token definition file" };
  }

  // shadcn registry style files — contain embedded CSS with full token definitions
  if (file.type === "config" && file.content.includes('"registry:style"')) {
    return { score: 10, reason: "Registry style file with embedded CSS tokens" };
  }

  // Asset catalog color definitions
  if (file.type === "xcassets") {
    if (/color-space|components/.test(file.content)) {
      return { score: 9, reason: "Asset catalog color definition" };
    }
    return { score: 5, reason: "Asset catalog file" };
  }

  // Swift files with theming infrastructure
  if (file.type === "swift") {
    if (/@Environment|ViewModifier|extension\s+Color/i.test(file.content)) {
      return { score: 8, reason: "Swift theming infrastructure (Environment/ViewModifier)" };
    }
    if (/colors?|palette|spacing|typography|theme|tokens?|font|style/i.test(baseName)) {
      return { score: 7, reason: "Swift file with design-related name" };
    }
    if (/static\s+(?:let|var)\s+\w+.*(?:Color|CGFloat|Font|UIFont)/i.test(file.content)) {
      return { score: 5, reason: "Swift file with design token definitions" };
    }
    return { score: 3, reason: "Swift component file" };
  }

  // xcconfig files
  if (file.type === "xcconfig") {
    return { score: 3, reason: "Xcode build configuration" };
  }

  // CSS/SCSS with custom properties
  if (file.type === "css" || file.type === "scss") {
    const hasCustomProps = /--[\w-]+\s*:/.test(file.content);
    const hasTailwind = /@tailwind|@theme|@apply/.test(file.content);

    if (hasCustomProps && hasTailwind) {
      return { score: 9, reason: "CSS with custom properties + Tailwind directives" };
    }
    if (hasCustomProps) {
      return { score: 8, reason: "CSS with custom properties" };
    }
    if (hasTailwind) {
      return { score: 8, reason: "CSS with Tailwind directives" };
    }
    // Plain CSS still has some signal
    return { score: 4, reason: "Style file" };
  }

  // Tailwind config
  if (file.type === "tailwind-config") {
    return { score: 8, reason: "Tailwind configuration" };
  }

  // Style Dictionary / W3C token files
  if (
    file.type === "style-dictionary" ||
    file.type === "w3c-tokens" ||
    file.type === "json-tokens"
  ) {
    if (/\$value|\$type|"value"|"type"/.test(file.content)) {
      return { score: 7, reason: "Design token file (JSON)" };
    }
  }

  // Files in styles/tokens directories
  if (/\/(styles?|tokens?|design|foundations?)\//i.test(name)) {
    return { score: 6, reason: "File in styles/tokens directory" };
  }

  // Config files that might have theme info
  if (file.type === "config") {
    if (/theme|style|design|color|palette/i.test(baseName)) {
      return { score: 6, reason: "Design-related config file" };
    }
    return { score: 2, reason: "Config file" };
  }

  // Component files — sample a few for style signal
  if (file.type === "component") {
    return { score: 3, reason: "Component file" };
  }

  // SCSS files (even without custom properties — may have $variables)
  if (baseName.endsWith(".scss") || baseName.endsWith(".less")) {
    return { score: 5, reason: "SCSS/Less file (may contain variables)" };
  }

  // TS/JS files that look like they contain design values
  if (baseName.endsWith(".ts") || baseName.endsWith(".js")) {
    if (
      /colors?|palette|spacing|typography|theme|tokens?|font/i.test(baseName)
    ) {
      return { score: 7, reason: "JS/TS file with design-related name" };
    }
    // Check content for theme-like objects
    if (
      /(?:colors|palette|spacing|typography|theme)\s*[:=]/.test(file.content)
    ) {
      return { score: 5, reason: "JS/TS file with design-like exports" };
    }
  }

  return { score: 0, reason: "Not relevant" };
}

/**
 * Truncate a file to fit within context budget.
 * For small files, return as-is. For large files, take the start + end.
 */
function truncateFile(content: string, limit: number = MAX_FILE_SIZE): string {
  if (content.length <= limit) return content;

  const headSize = Math.floor(limit * 0.8);
  const tailSize = limit - headSize - 20; // 20 chars for separator

  const head = content.slice(0, headSize);
  const tail = content.slice(-tailSize);

  return `${head}\n\n/* ... truncated ... */\n\n${tail}`;
}
