import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";

/**
 * A single seed file an `init` template writes, relative to the package dir.
 */
export interface TemplateFile {
  /** Path relative to the package directory (e.g. "nodes/core-voice.md"). */
  relativePath: string;
  content: string;
}

/**
 * An `init` template: a pure description of the seed files a fresh node package
 * starts with. Templates are the extension seam — adding a `marketing` / `voice`
 * / `dashboard` starter later is just registering another entry here; `init`
 * needs no change.
 */
export interface GhostInitTemplate {
  name: string;
  description: string;
  files(): TemplateFile[];
}

function manifestFile(): TemplateFile {
  return {
    relativePath: "manifest.yml",
    content: `schema: ${GHOST_FINGERPRINT_PACKAGE_SCHEMA}\nid: local\n`,
  };
}

/**
 * The default starter: a manifest plus the package-root `index.md`, the `core`
 * node whose prose cascades to every surface. The directory tree is the graph:
 * add a surface by adding a directory, give it prose with its own `index.md`,
 * and place nodes as `<surface>/<node>.md`.
 */
const DEFAULT_TEMPLATE: GhostInitTemplate = {
  name: "default",
  description: "Minimal node package: manifest + a core index node.",
  files() {
    return [
      manifestFile(),
      {
        relativePath: "index.md",
        content: `---
description: The product-wide root; true everywhere.
---

Replace this with your product's voice — the \`core\` node. A node is prose
written through the intent / inventory / composition lenses; they guide what to
capture, they are not fields:

- intent — the why and the stance (e.g. "calm, direct, never breathless").
- inventory — the material you have (tokens, components, pointers to code).
- composition — how it is assembled (the patterns that make it feel intentional).

This file is the package-root \`index.md\`, so it cascades to every surface. Add
a surface by adding a directory: \`checkout/index.md\` is the \`checkout\` surface,
and \`checkout/payment.md\` is a node under it. Link related nodes with
\`relates\`, and tag medium-bound expressions with \`incarnation\` (e.g. email,
billboard, voice). Leave essence untagged.
`,
      },
    ];
  },
};

const TEMPLATES = new Map<string, GhostInitTemplate>([
  [DEFAULT_TEMPLATE.name, DEFAULT_TEMPLATE],
]);

export const DEFAULT_TEMPLATE_NAME = DEFAULT_TEMPLATE.name;

/** Look up a registered init template by name. */
export function getInitTemplate(name: string): GhostInitTemplate | undefined {
  return TEMPLATES.get(name);
}

/** All registered init template names, for help and validation. */
export function listInitTemplates(): string[] {
  return [...TEMPLATES.keys()];
}
