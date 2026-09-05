const SECTION_HEADING = /^##\s+Available guidance\s*$/mu;
const GROUP_HEADING = /^###\s+(.+?)\s*$/u;
const ENTRY = /^-\s+`([^`]+)`\s*$/u;
const APPLIES = /^\s+-\s+Applies when:\s*(.+?)\s*$/u;

/** Parse the exact agent-facing gather Markdown without reconstructing it. */
export function parseGatherMarkdown(markdown) {
  const match = SECTION_HEADING.exec(markdown);
  if (!match || match.index === undefined) {
    throw new Error("gather Markdown has no Available guidance section");
  }

  const guidance = markdown.slice(0, match.index).trim();
  const available = markdown.slice(match.index).trim();
  const nodes = [];
  let kind;
  let current;

  for (const line of available.split(/\r?\n/u).slice(1)) {
    const group = GROUP_HEADING.exec(line);
    if (group) {
      kind = group[1] === "Other guidance" ? undefined : group[1];
      current = undefined;
      continue;
    }

    const entry = ENTRY.exec(line);
    if (entry) {
      current = {
        id: entry[1],
        ...(kind ? { kind } : {}),
      };
      nodes.push(current);
      continue;
    }

    const applies = APPLIES.exec(line);
    if (applies && current) {
      current.for = applies[1] === "not stated." ? undefined : applies[1];
    }
  }

  return { guidance, markdown, nodes };
}
