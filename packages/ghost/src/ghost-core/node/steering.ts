const FENCED_BLOCK_PATTERN =
  /(^|\n)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\2[ \t]*(?=\n|$)/g;
const SKELETON_HEADING_PATTERN = /^##[ \t]+Skeleton[ \t]*$/gim;

export interface FencedBlock {
  fence: string;
  info?: string;
  content: string;
}

export interface SkeletonSection {
  body: string;
  fences: FencedBlock[];
}

export function carriesConcreteMaterial(input: {
  materials?: string[];
  body: string;
}): boolean {
  return (
    (input.materials?.length ?? 0) > 0 ||
    hasSubstantialFencedExample(input.body) ||
    extractSkeletonSections(input.body).length > 0
  );
}

export function hasSubstantialFencedExample(body: string): boolean {
  return hasThreeLineFence(stripSkeletonSections(body));
}

export function hasThreeLineFence(body: string): boolean {
  for (const block of extractFencedBlocks(body)) {
    if (block.content.split(/\r?\n/).length >= 3) return true;
  }
  return false;
}

export function extractSkeletonSections(body: string): SkeletonSection[] {
  const headings = [...body.matchAll(SKELETON_HEADING_PATTERN)];
  return headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const next = headings[index + 1];
    const end = next?.index ?? findNextHeading(body, start);
    const sectionBody = body.slice(start, end).trim();
    return { body: sectionBody, fences: extractFencedBlocks(sectionBody) };
  });
}

export function extractSkeletonFences(body: string): FencedBlock[] {
  return extractSkeletonSections(body).flatMap((section) => section.fences);
}

export function stripSkeletonSections(body: string): string {
  const headings = [...body.matchAll(SKELETON_HEADING_PATTERN)];
  if (headings.length === 0) return body;

  let stripped = "";
  let cursor = 0;
  for (const heading of headings) {
    const start = heading.index ?? 0;
    const end = findNextHeading(body, start + heading[0].length);
    stripped += body.slice(cursor, start);
    cursor = end;
  }
  stripped += body.slice(cursor);
  return stripped.replace(/\n{3,}/g, "\n\n").trim();
}

function extractFencedBlocks(body: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  for (const match of body.matchAll(FENCED_BLOCK_PATTERN)) {
    const openingLine = body
      .slice((match.index ?? 0) + (match[1]?.length ?? 0))
      .split(/\r?\n/, 1)[0];
    const open = /^(?<fence>`{3,}|~{3,})(?<info>.*)$/.exec(openingLine);
    const fence = open?.groups?.fence ?? match[2] ?? "```";
    const info = open?.groups?.info?.trim();
    blocks.push({
      fence,
      ...(info ? { info } : {}),
      content: match[3] ?? "",
    });
  }
  return blocks;
}

function findNextHeading(body: string, start: number): number {
  const rest = body.slice(start);
  const match = /^#{1,6}[ \t]+.+$/m.exec(rest);
  return match?.index === undefined ? body.length : start + match.index;
}
