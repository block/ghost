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
 * that explains them. Haunts (e.g. checks) are opt-in via `ghost haunt add`.
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
  should be mirrored by a review check (\`ghost haunt add checks\`) that
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

Mirror each refusal here with a check under \`haunts/checks/\` that lists this
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

/**
 * Steering starter: named truths for pre-generation steering. The extra kinds
 * are vocabulary only: no schema or selection behavior changes.
 */
const STEERING_TEMPLATE: GhostInitTemplate = {
  name: "steering",
  description: "Steering starter: stance, patterns, exemplars, materials.",
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
  - name: pattern
  - name: exemplar
  - name: anti-goal
  - name: asset
  - name: decision
  - name: concept
#  - { name: provocation, posture: wild, purpose: a deliberate provocation past the fingerprint — surfaced only on request }
---

# principle

Durable stance, tradeoff, or invariant. Patterns may narrow principles, never loosen them.

# condition

Situational truth. Use only when the stated situation holds.

# pattern

Reusable composition. State what is bound, what is open, and when it applies.

# exemplar

Concrete reference for form, rhythm, quality, code shape, voice, or behavior. Say what to copy and not copy.

# anti-goal

Rejected default, neighboring style, generic generated pattern, or plausible wrong answer.

# asset

Material truth about concrete assets, tokens, components, type, motion, imagery, code, or files. \`materials\` locates; prose explains.

# decision

Worked tradeoff trace: what was chosen, what was rejected, and why.

# concept

Scoped creative direction for a specific output; not permanent brand law.
`,
      },
      {
        relativePath: "index.md",
        content: `---
description: Always read first — the steering front door, non-negotiables, and silence posture.
---

This fingerprint steers agent-generated product and brand work. It is not a component API or complete archive.

## Before you trust this fingerprint

Everything in this starter package is demo content. It is intentionally opinionated so you can see the shape of useful steering: hard truths, refusal lines, material locators, patterns, exemplars, and tradeoff traces. Keep any structure that helps, but replace the claims, paths, examples, and decisions with real product truth before using this fingerprint to guide generation.

## Non-negotiables

The lines below are demo non-negotiables for inspiration and guidance. Replace them with your real hard truths:

- Use existing materials before inventing new visual language.
- Preserve the composition floor in \`principle.composition\`.
- Avoid the generic generated defaults named in \`anti-goal.*\`.
- Apply conditional truths only when their stated situation holds.
- Label provisional reasoning when this fingerprint is silent.

## How to read the corpus

\`principle.*\` gives stance and hard floor. \`pattern.*\` gives bound/open structure. \`exemplar.*\` shows form and quality. \`anti-goal.*\` names likely wrong outputs. \`asset.*\` points to materials. \`decision.*\` explains tradeoffs. \`concept.*\` is scoped direction, not law. The starter nodes are teaching examples, not defaults Ghost believes about your brand.

## Silence posture

When this fingerprint is silent, proceed provisionally from local conventions only when safe. Ask before brand-defining, irreversible, legal, privacy-sensitive, or high-risk choices.
`,
      },
      {
        relativePath: "principle.stance.md",
        content: `---
description: Core stance and tradeoffs — gather when a task needs brand decision-making beyond exact materials.
---

This is demo content for the stance shape. Replace it with the brand's real stance: what the work preserves, what it refuses, and what decision logic it carries when the task is ambiguous.

Write forced choices, not adjectives: when X conflicts with Y, X wins; this brand earns trust by...; we never become...

`,
      },
      {
        relativePath: "principle.composition.md",
        content: `---
description: Composition floor — hard layout invariants that hold whether or not a pattern matches the ask.
---

These demo invariants show the kind of floor that steers generation. Replace them with real hard lines that apply to every generated surface unless a narrower condition explicitly says otherwise. Patterns narrow them; nothing loosens them.

Use concrete limits, not vibes: one focal point, hierarchy before decoration, density with a limit.

`,
      },
      {
        relativePath: "anti-goal.generic-generated-output.md",
        content: `---
description: The generic generated output this fingerprint rejects.
---

This is demo anti-goal content. Replace it with the defaults this brand actually refuses: no rounded-card SaaS grid, no gradient hero text, no decorative blobs, no fake dashboard preview unless the product is dashboard-shaped, no “Oops!” failure copy.

A technically correct output can still be off-brand if any product could ship it. Use this node to name the generic outputs an agent is likely to produce unless you block them.
`,
      },
      {
        relativePath: "pattern.status-with-next-step.md",
        content: `---
description: Status of an ongoing thing plus the single next step — use when the task asks where something stands or what happens next.
---

This is a demo pattern for inspiration and guidance. Replace it with a real reusable pattern from your product.

Applies when the surface explains the state of something in flight. Bound: current status first and largest, one sentence of meaning, one primary next step last. Open: evidence form and tone.

`,
      },
      {
        relativePath: "exemplar.annotated-reference.md",
        content: `---
description: Annotated reference — replace with a sample that shows form, rhythm, quality, voice, or code shape.
materials:
  - path/to/reference
---

This is demo exemplar content. Replace \`path/to/reference\` with a real screenshot, file, URL, or implementation path.

This exemplar is normative for <what to match>, not for <what is incidental>. What makes it intentional: <feature>, <feature>, <feature>. Do not copy: <incidental detail>, <one-off constraint>.
`,
      },
      {
        relativePath: "asset.materials.md",
        content: `---
description: Concrete materials the agent should inspect before inventing visual language, components, type, motion, or assets.
materials:
  - src/styles/tokens.css
  - src/components/**
  - public/brand/**
---

This is demo material inventory. Replace the paths with real tokens, components, SVGs, motion specs, images, or implementations.

Use this node to locate real materials. \`materials\` points to concrete files; this prose explains what they mean. Do not duplicate API docs unless the API itself is the brand truth.
`,
      },
      {
        relativePath: "decision.tradeoff.md",
        content: `---
description: Worked tradeoff — replace with a decision where the brand chose between plausible options.
---

This is demo decision content. Replace it with a real tradeoff that helps an agent decide between plausible good answers.

Decision trace: We chose between <A> and <B>. <A> was good because... and wrong because... <B> was good because... and wrong because... We chose <winner> because <value/tradeoff>. This reverses when <condition>.
`,
      },
    ];
  },
};

const TEMPLATES = new Map<string, GhostInitTemplate>([
  [MINIMAL_TEMPLATE.name, MINIMAL_TEMPLATE],
  [COMPOSITION_TEMPLATE.name, COMPOSITION_TEMPLATE],
  [STEERING_TEMPLATE.name, STEERING_TEMPLATE],
]);

export const DEFAULT_TEMPLATE_NAME = STEERING_TEMPLATE.name;

/** Look up a registered init template by name. */
export function getInitTemplate(name: string): GhostInitTemplate | undefined {
  if (name === "default") return STEERING_TEMPLATE;
  return TEMPLATES.get(name);
}

export function listInitTemplates(): string[] {
  return [...TEMPLATES.keys()];
}
