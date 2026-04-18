/**
 * Extract the first HTML artifact from an LLM response.
 *
 * Accepts either:
 *   - a fenced code block (```html ... ```)
 *   - a raw response that starts with `<!DOCTYPE` or `<html` or `<`
 *
 * Returns the extracted HTML verbatim. Throws if nothing plausible is found.
 */
export function extractHtml(text: string): string {
  const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenced) return fenced[1].trim();

  const trimmed = text.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<")
  ) {
    return trimmed;
  }

  throw new Error(
    "Could not extract HTML from LLM response. Expected a fenced code block or raw HTML.",
  );
}
