import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";
import {
  GHOST_EVENTS_FILENAME,
  LEGACY_PULL_HISTORY_FILENAME,
} from "./constants.js";

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
 * Keep local observability tapes out of version control: they are disposable
 * per-machine scratch for authors iterating on the fingerprint, never canonical
 * state.
 */
function gitignoreFile(): TemplateFile {
  return {
    relativePath: ".gitignore",
    content: `${GHOST_EVENTS_FILENAME}\n${LEGACY_PULL_HISTORY_FILENAME}\n`,
  };
}

/**
 * The default starter: a manifest, a package-level glossary declaring the
 * starter category vocabulary, and a package-root `index.md` node. Additional
 * truths are plain markdown nodes; optional material locators live on the node
 * that explains them. Haunts (e.g. checks) are opt-in via `ghost haunt add`.
 */
const DEFAULT_TEMPLATE: GhostInitTemplate = {
  name: "default",
  description:
    "Minimal node package: manifest + glossary + a starter index node.",
  files() {
    return [
      manifestFile(),
      gitignoreFile(),
      {
        relativePath: "glossary.md",
        content: `---
categories:
  - name: principle
  - name: condition
  - name: exemplar
  - name: asset
  - name: pattern
---

# principle

Durable stance: true across media unless a narrower condition explicitly limits it.

# condition

Situational truth: fires only when the stated situation holds.

# exemplar

Illustrative reference: useful evidence, but not normative on its own.

# asset

Material truth about concrete brand assets such as logos, illustrations, motion, imagery, or files.

# pattern

Reusable composition or product pattern whose purpose is distinguishable from neighboring patterns.
`,
      },
      {
        relativePath: "index.md",
        content: `---
description: Start here — what this fingerprint is and how to read it.
---

Replace this prose with your fingerprint's front door: what this fingerprint
covers, how its kinds organize the corpus, and what to read first. \`index\` is
an ordinary node — it appears in the menu like any other — but by convention it
orients a reader before they interpret the rest. Everything below the \`---\` is
the node's body; the frontmatter above is the retrieval description.

Nodes are prose truths. Use them to capture intent, materials, and composition in
language an agent can apply across code, copy, and UI decisions. Keep each node
focused enough to be useful on its own. When a node points at concrete materials,
add a \`materials\` list in frontmatter with repo-relative paths/globs or https URLs.

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
