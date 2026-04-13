import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Materialize a URL into a temporary directory.
 * Auto-detects content type:
 * - JSON (registry, tokens) → saved as .json
 * - CSS → saved as .css
 * - HTML → extracts <style> tags and linked stylesheets
 */
export async function materializeUrl(
  url: string,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "ghost-url-"));

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();

    if (contentType.includes("json") || looksLikeJSON(body)) {
      await writeFile(join(tempDir, "registry.json"), body, "utf-8");
    } else if (contentType.includes("css")) {
      await writeFile(join(tempDir, "styles.css"), body, "utf-8");
    } else if (contentType.includes("html")) {
      // Extract inline styles and link[rel=stylesheet] references
      const extracted = extractFromHTML(body);

      if (extracted.inlineCSS) {
        await writeFile(
          join(tempDir, "inline-styles.css"),
          extracted.inlineCSS,
          "utf-8",
        );
      }

      // Fetch linked stylesheets
      for (let i = 0; i < extracted.stylesheetUrls.length; i++) {
        const sheetUrl = resolveUrl(extracted.stylesheetUrls[i], url);
        try {
          const sheetResponse = await fetch(sheetUrl);
          if (sheetResponse.ok) {
            const css = await sheetResponse.text();
            await writeFile(
              join(tempDir, `stylesheet-${i}.css`),
              css,
              "utf-8",
            );
          }
        } catch {
          // Skip failed stylesheet fetches
        }
      }

      // Save the HTML for potential further analysis
      await writeFile(join(tempDir, "page.html"), body, "utf-8");
    } else {
      // Save as-is
      await writeFile(join(tempDir, "content.txt"), body, "utf-8");
    }

    return tempDir;
  } catch (err) {
    throw new Error(
      `Failed to materialize URL "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function looksLikeJSON(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function extractFromHTML(html: string): {
  inlineCSS: string;
  stylesheetUrls: string[];
} {
  const inlineStyles: string[] = [];
  const stylesheetUrls: string[] = [];

  // Extract <style> tag contents
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = styleRegex.exec(html)) !== null) {
    if (match[1].trim()) {
      inlineStyles.push(match[1]);
    }
  }

  // Extract stylesheet links
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;

  for (const regex of [linkRegex, linkRegex2]) {
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) {
        stylesheetUrls.push(match[1]);
      }
    }
  }

  return {
    inlineCSS: inlineStyles.join("\n\n"),
    stylesheetUrls: [...new Set(stylesheetUrls)],
  };
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}
