import { GHOST_FINGERPRINT_PACKAGE_SCHEMA } from "#ghost-core";
import {
  GHOST_EVENTS_FILENAME,
  LEGACY_PULL_HISTORY_FILENAME,
} from "./constants.js";
import { createSkeletonTemplate } from "./skeleton-template.js";
/**
 * A single seed file an `init` template writes, relative to the package dir.
 */
export interface TemplateFile {
  /** Path relative to the package directory (e.g. "principle.voice.md"). */
  relativePath: string;
  content: string | Uint8Array;
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
  files(): TemplateFile[] | Promise<TemplateFile[]>;
}
function manifestFile(): TemplateFile {
  return {
    relativePath: "manifest.yml",
    content: `schema: ${GHOST_FINGERPRINT_PACKAGE_SCHEMA}\nid: local\n`,
  };
}

/**
 * Keep events tapes out of version control: they are disposable
 * per-machine signals for authors iterating on the fingerprint, never canonical
 * state.
 */
function gitignoreFile(): TemplateFile {
  return {
    relativePath: ".gitignore",
    content: `${GHOST_EVENTS_FILENAME}\n${LEGACY_PULL_HISTORY_FILENAME}\n`,
  };
}

/**
 * The minimal starter: a manifest, a package-level glossary declaring the
 * starter kind vocabulary, and a package-root `index.md` node. Additional
 * truths are plain markdown nodes; optional material locators live on the node
 * that explains them. Checks are opt-in via `ghost checks init`.
 */
const MINIMAL_TEMPLATE: GhostInitTemplate = {
  name: "minimal",
  description:
    "Minimal node package: manifest + glossary + a starter index node.",
  files() {
    return [
      manifestFile(),
      gitignoreFile(),
      {
        relativePath: "glossary.md",
        content: `---
kinds:
  - name: principle
  - name: condition
  - name: exemplar
  - name: anti-goal
  - name: asset
  - name: pattern
#  - { name: provocation, posture: wild, purpose: a deliberate provocation past the fingerprint — surfaced only on request }
---

# principle

Durable stance: true across media unless a narrower condition explicitly limits it.

# condition

Situational truth: fires only when the stated situation holds.

# exemplar

Illustrative reference. Match its form and quality; treat its specifics as
evidence unless the node says the sample itself is normative.

# anti-goal

What this brand must never look, sound, or feel like — named generic patterns
and rejected neighbors. Always-on, like a principle, but stated as the thing
to steer away from.

# asset

Material truth about concrete brand assets such as logos, illustrations, motion, imagery, or files.

# pattern

Reusable composition or product pattern whose purpose is distinguishable from neighboring patterns.
`,
      },
      {
        relativePath: "index.md",
        content: `---
description: Always read first — the non-negotiables and how to read this fingerprint.
---

Replace this placeholder prose with two things:

**The non-negotiables.** The handful of truths that apply to every task, every
medium, no matter what else is gathered — hard invariants, the anti-goals, the
one-sentence stance. This node is the only one an agent is told to always pull,
so anything that must never be missed belongs here (stated briefly; link out to
the full node by id for depth).

**How to read the rest.** What this fingerprint covers, how its kinds organize
the corpus, and where the fingerprint deliberately stays silent — including, if
you want one, a stricter silence posture ("when this fingerprint is silent on X,
ask a human") that overrides the default proceed-provisionally behavior.

\`index\` is an ordinary node in every mechanical sense — everything below the
\`---\` is its body; the frontmatter above is the retrieval description. Its
privilege is pure convention: the recipes tell agents to pull it first.

The glossary declares the kind vocabulary. A node's kind comes from its
filename prefix: \`principle.density.md\` has kind \`principle\` and slug
\`density\`. A bare filename like \`voice.md\` has no kind, which is fine.
When a truth is narrower, state the condition in the prose — the situation where
it applies — never a filing destination.
`,
      },
    ];
  },
};

/**
 * The composition starter: everything in `minimal`, plus a worked composition
 * ladder — an invariants floor (`principle.composition`), one bound/open
 * pattern, and an index that teaches the convention. For teams whose
 * fingerprint must steer *what agents build*, not only what they say.
 *
 * The ladder is an authoring convention, not a schema: patterns state what is
 * bound (do not redecide) and what is open (the generator's call), and every
 * pattern names the principles it refines. Nothing here adds frontmatter,
 * edges, or routing — the corpus stays flat.
 */
const COMPOSITION_TEMPLATE: GhostInitTemplate = {
  name: "composition",
  description:
    "Composition starter: minimal files + an invariants floor and a worked bound/open pattern.",
  files() {
    return [
      manifestFile(),
      gitignoreFile(),
      {
        relativePath: "glossary.md",
        content: `---
kinds:
  - name: principle
  - name: condition
  - name: exemplar
  - name: anti-goal
  - name: asset
  - name: pattern
#  - { name: provocation, posture: wild, purpose: a deliberate provocation past the fingerprint — surfaced only on request }
---

# principle

Durable stance: true across media unless a narrower condition explicitly limits it.
Composition principles are the floor — when no pattern matches an ask, they are
what the agent composes against.

# condition

Situational truth: fires only when the stated situation holds.

# exemplar

Illustrative reference. Match its form and quality; treat its specifics as
evidence unless the node says the sample itself is normative. Pair an
exemplar with a screenshot or implementation path in \`materials\` so the blessed
render travels with the prose.

# anti-goal

What this brand must never look, sound, or feel like — named generic patterns
and rejected neighbors. Always-on, like a principle, but stated as the thing
to steer away from.

# asset

Material truth about concrete brand assets such as logos, illustrations, motion,
imagery, or files. For components, state the slot contract in prose: what the
asset admits, how many, and where.

# pattern

Reusable composition whose purpose is distinguishable from neighboring patterns.
A pattern states what is **bound** (decided — do not redecide) and what is
**open** (the generator's call, within named limits), and names the principles
it refines. A pattern may only narrow what its principles allow — never loosen
them.
`,
      },
      {
        relativePath: "index.md",
        content: `---
description: Start here — how this fingerprint steers composition, from patterns down to principles.
---

This fingerprint steers what gets built, not only what gets said. It is
organized as a ladder of binding depth:

1. **Patterns** (\`pattern.*\`) are mostly-decided compositions. When an ask
   matches a pattern's stated purpose, use it: apply what it binds, decide only
   what it leaves open.
2. **Principles** (\`principle.*\`) are the floor. When no pattern matches, do
   not fall back to your own taste — compose freely *inside* the invariants in
   \`principle.composition\` and its siblings.
3. **Exemplars and assets** carry the concrete vocabulary: blessed renders,
   real components, real tokens, located via \`materials\`.

Two laws keep the ladder honest:

- **Narrowing only.** A pattern may bind or narrow what a principle leaves
  open; it may never contradict one. If a pattern conflicts with a principle,
  the principle wins and the pattern file is wrong.
- **Every "never" casts a shadow.** Each refusal-grade line in a principle
  should be mirrored by a review check (\`ghost checks init\`) that
  references the node it enforces, so the same opinion steers before building
  and grades after.

Replace this prose with your own front door once the corpus has shape. The
starter nodes below are teaching placeholders — edit them into your real
opinions before trusting them.
`,
      },
      {
        relativePath: "principle.composition.md",
        content: `---
description: The composition floor — hard layout invariants that hold for every screen, whether or not a pattern matches the ask.
---

These invariants apply to everything built against this fingerprint. Patterns
narrow them; nothing loosens them. Each is written as a refusal or a limit with
a number, because a stance an agent can check is a stance that steers.

**The starter opinions below are placeholders. Keep the voice — refusals and
numbers, not vibes — and replace the values with yours.**

- **One focal point.** Every screen has exactly one element at the largest
  scale. If two elements compete for primacy, the second one is wrong — demote
  or delete it. Never resolve the tie by making both big.
- **Hierarchy descends.** Type scale strictly decreases with nesting depth.
  Never give a child element a larger scale than its parent context.
- **Density has a budget.** State the budget per surface (for example: at most
  N data points per viewport on consumer surfaces; a higher N on operational
  ones). When content exceeds the budget, cut or collapse — never shrink type
  below the ramp to make room.
- **Actions land last.** Calls to action render at the end of reading order.
  At most one primary action per screen; never two.
- **Separation escalates.** To separate content, reach for whitespace first,
  then a divider, then a container — in that order, never skipping a step.

Mirror each refusal here with a check under \`checks/\` that lists this
node in its \`references\`, so review enforces the same floor this prose sets.
`,
      },
      {
        relativePath: "pattern.status-with-next-step.md",
        content: `---
description: Status of an ongoing thing plus the single next step — reach for this when the ask is "where is X / how is X going."
---

**This is a worked example of the pattern convention — bound, open, refines.
Replace its content with a real pattern from your product, keep the structure.**

**When this applies:** the ask is about the state of something in flight — an
order, a transfer, a build, a goal.

**Bound (decided — do not redecide):**

- The current status renders first and largest; it is the focal point.
- A short line of meaning follows the status: why it matters or what changed,
  never a restatement of it.
- Exactly one primary action, rendered last: the single next step.

**Open (your call, within these limits):**

- Supporting evidence may be a timeline or a compact stat list — whichever
  fits the data. Never a full chart in this pattern.
- Density may flex one step tighter on operational surfaces.

**Refines:** \`principle.composition\`. If anything above conflicts with the
floor, the floor wins and this file is wrong.

When a blessed render of this pattern exists, add an \`exemplar.*\` node with
\`materials\` pointing at the screenshot and the implementation path.
`,
      },
    ];
  },
};

const SKELETON_TEMPLATE = createSkeletonTemplate({
  manifestFile,
  gitignoreFile,
});

const TEMPLATES = new Map<string, GhostInitTemplate>([
  [MINIMAL_TEMPLATE.name, MINIMAL_TEMPLATE],
  [COMPOSITION_TEMPLATE.name, COMPOSITION_TEMPLATE],
  [SKELETON_TEMPLATE.name, SKELETON_TEMPLATE],
]);

export const DEFAULT_TEMPLATE_NAME = SKELETON_TEMPLATE.name;

/** Look up a registered init template by name. */
export function getInitTemplate(name: string): GhostInitTemplate | undefined {
  // `default` and `steering` are silent aliases for the skeleton starter:
  // `default` for callers that never named a template, `steering` for
  // callers pinned to the pre-skeleton default's name.
  if (name === "default" || name === "steering") return SKELETON_TEMPLATE;
  return TEMPLATES.get(name);
}

export function listInitTemplates(): string[] {
  return [...TEMPLATES.keys()];
}
