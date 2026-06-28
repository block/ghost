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
 * The default starter: the surfaces spine (the implicit `core` root needs no
 * declaration, so the file starts empty) plus one `core`-placed intent node
 * that demonstrates the shape — frontmatter handles + prose body written
 * through the intent/inventory/composition lenses.
 */
const DEFAULT_TEMPLATE: GhostInitTemplate = {
  name: "default",
  description: "Minimal node package: surfaces spine + one core intent node.",
  files() {
    return [
      manifestFile(),
      {
        relativePath: "surfaces.yml",
        content: `schema: ghost.surfaces/v1
# The implicit \`core\` root needs no declaration. Add surfaces as you author,
# e.g.:
#   surfaces:
#     - id: checkout
#       parent: core
surfaces: []
`,
      },
      {
        relativePath: "nodes/core-voice.md",
        content: `---
id: core-voice
under: core
---

Replace this with your product's voice. A node is prose written through the
intent / inventory / composition lenses — they guide what to capture, they are
not fields:

- intent — the why and the stance (e.g. "calm, direct, never breathless").
- inventory — the material you have (tokens, components, pointers to code).
- composition — how it is assembled (the patterns that make it feel intentional).

This node sits at \`core\`, so it cascades to every surface. Place
surface-specific nodes with \`under: <surface>\`, link related nodes with
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
