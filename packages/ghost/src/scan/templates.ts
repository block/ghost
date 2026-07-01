import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";

/**
 * A single seed file an `init` template writes, relative to the package dir.
 */
export interface TemplateFile {
  /** Path relative to the package directory (e.g. "principle.voice.md"). */
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
 * The default starter: a manifest, a package-level glossary declaring the
 * starter category vocabulary, and the package-root `index.md` core node.
 * Additional truths are plain markdown nodes; an optional kind comes from a
 * dotted filename prefix such as `principle.density.md`.
 */
const DEFAULT_TEMPLATE: GhostInitTemplate = {
  name: "default",
  description: "Minimal node package: manifest + glossary + a core index node.",
  files() {
    return [
      manifestFile(),
      {
        relativePath: "glossary.md",
        content: `---
categories:
  - name: principle
  - name: condition
  - name: exemplar
---

# principle

Durable stance: true across media unless a narrower condition explicitly limits it.

# condition

Situational truth: fires only when the stated situation holds.

# exemplar

Illustrative reference: useful evidence, but not normative on its own.
`,
      },
      {
        relativePath: "index.md",
        content: `---
description: The product-wide core truth.
---

Replace this prose with your product's core truth — the stance an agent should
read before interpreting the rest of the fingerprint. Everything below the
\`---\` is the node's body; the frontmatter above is the retrieval description.

Nodes are prose truths. Use them to capture intent, materials, and composition in
language an agent can apply across code, copy, and UI decisions. Keep each node
focused enough to be useful on its own.

The glossary declares the category vocabulary. A node's kind comes from its
filename prefix: \`principle.density.md\` has kind \`principle\` and slug
\`density\`. A bare filename like \`voice.md\` is uncategorized, which is fine.

When a truth is narrower, state the condition in the prose: the situation where
it applies, the evidence that activates it, and what changes when it does. Do not
use filename categories as destinations or filing buckets; the model reads the
prose to understand applicability.
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
