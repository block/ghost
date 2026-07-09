import { SKELETON_GRAMMAR_FILES } from "./skeleton-grammar.js";
import type { GhostInitTemplate, TemplateFile } from "./templates.js";

interface SkeletonTemplateDeps {
  manifestFile(): TemplateFile;
  gitignoreFile(): TemplateFile;
}

/**
 * The skeleton starter: the default `ghost init` fingerprint. It carries the
 * rebrand-safe law tier (the median floor + six grammar nodes, in
 * `skeleton-grammar.ts`) and leaves the four signature dials explicitly
 * unanswered — each dial states its fixed relationship, asks its question,
 * and forbids freehanding a value as brand-backed. No brand values ship in
 * this template; the corpus validates clean with zero warnings as written.
 */
export function createSkeletonTemplate({
  manifestFile,
  gitignoreFile,
}: SkeletonTemplateDeps): GhostInitTemplate {
  return {
    name: "skeleton",
    description:
      "Naked skeleton: the median floor + grammar law, with the signature dials left unanswered.",
    files() {
      return [
        manifestFile(),
        gitignoreFile(),
        glossaryFile(),
        indexFile(),
        ...SKELETON_GRAMMAR_FILES,
        ...SIGNATURE_DIAL_FILES,
      ];
    },
  };
}

function glossaryFile(): TemplateFile {
  return {
    relativePath: "glossary.md",
    content: `---
kinds:
  - name: grammar
  - name: signature
  - name: register
  - name: anti-goal
    posture: guard
---

# grammar

The brand's decision logic: closed sets, role vocabularies, and assembly
rules, stated in token roles and never in literal values. Grammar survives a
rebrand unchanged — swap every value and these nodes still hold. Gather
grammar before inventing structure.

# signature

The dials: the choices that make a brand this brand. In this starter every
signature node is unanswered — it states the fixed relationship worth
keeping and asks the question only a human can answer. When the human
answers, restate the node as the brand's current answer. Gather signature
before setting any value a dial governs.

# register

A condition-scoped contract: a situation — data-dense consoles, editorial
pages, transactional email — where parts of the default rules invert. Each
register names its condition first. Truths from the wrong register are
poison, not context; gather a register only when its condition matches the
task. This starter declares the kind and ships no register nodes: registers
invert answered defaults, and the dials are not answered yet.

# anti-goal

What this package refuses, each reject paired with its replacement.
\`anti-goal.median\` is the model's floor, not the brand's taste. Gather
anti-goals before styling anything greenfield.

---

The ghost skill bundle teaches authoring: how to answer the dials, add
registers, and grow this skeleton into a real fingerprint.
`,
  };
}

function indexFile(): TemplateFile {
  return {
    relativePath: "index.md",
    content: `---
description: "Always read first — the trust tiers of this starter fingerprint, the unanswered dials, and how to work before they are answered."
---

This is a skeleton fingerprint: the rebrand-safe law of good interface work,
with every brand decision left explicitly open. It steers an agent away from
the model's median from the first generation, without pretending to be a
brand it is not.

The corpus carries two trust tiers. Grammar and the median floor are law:
safe to consume verbatim, unchanged by any future rebrand — they speak in
token roles and closed sets, never in literal values. Signature nodes are
dials, and in this starter every dial is unanswered: each states the fixed
relationship worth keeping and the question only a human can answer. Do not
freehand a dial's value and present it as brand-backed — ask the human or
flag the gap.

The reset raises the floor; only the fingerprint escapes the median.

Unanswered dials do not block work; they mark what your report must flag.
When generating before the dials are answered, define the grammar's token
roles in your own stylesheet with provisional values — the role names are
the contract; the values are placeholders until the dials say otherwise.

When a requested UI is not covered by a node, compose from the grammar. Do
not invent a new styling system. If the result needs a new pattern, the new
pattern should come from observed drift, not anticipation.
`,
  };
}

/**
 * The four signature dials, each in the three-part unanswered shape:
 * (1) the unanswered declaration, (2) the fixed relationship carried from
 * the source corpus, (3) the open question + answer instruction +
 * provisional-generation clause. No brand values appear anywhere.
 */
const SIGNATURE_DIAL_FILES: TemplateFile[] = [
  {
    relativePath: "signature.shape.md",
    content: `---
description: "Gather before setting any radius or corner treatment. The shape dial: controls take --radius-control, surfaces take --radius-surface — this dial is unanswered; ask the human or flag the gap, don't freehand it."
---

This dial is unanswered — ask the human or flag the gap. Do not freehand a
value and present it as brand-backed.

The relationship is fixed: controls and surfaces carry different radius
roles, and the two never swap. Buttons and text inputs use
\`--radius-control\`; cards and other surfaces use \`--radius-surface\`. One
radius for what you click, one for what contains — that split is the part
worth keeping, whatever the values turn out to be.

The open question: what are this brand's two radii — how round is a control,
and how round is a surface? When the human answers, restate this node as
"this brand's current answer is …" and record the values where your
materials live. If the task can't wait for an answer, proceed with a quiet
provisional choice, honor the fixed relationship, label the choice
provisional in your report — and never restate this node as answered.
`,
  },
  {
    relativePath: "signature.palette.md",
    content: `---
description: "Gather whenever color beyond the base roles is in question. The palette dial: a quiet base spine plus a closed expression set at situation-gated volume — this dial is unanswered; ask the human or flag the gap, don't freehand it."
---

This dial is unanswered — ask the human or flag the gap. Do not freehand a
value and present it as brand-backed.

The relationship is fixed: one brand at different volumes. A quiet base
spine is the default atmosphere in every medium — calm, legible, and
resistant to novelty — and a closed expression set supplies the atmosphere,
with volume set by situation, never by taste. Two constants outrank any
volume decision: expression never touches what you click — buttons, inputs,
and links stay on the base roles everywhere — and the status roles are not
expression; they keep their meanings everywhere and never moonlight as
atmosphere. The ladder — a quiet spine, a closed hue set, situation-gated
volume — is the part worth keeping.

The open question: what is this brand's base spine, and what are the named
hues of its closed expression set — how many, and which? When the human
answers, restate this node as "this brand's current answer is …" and record
the values where your materials live. If the task can't wait for an answer,
proceed with a quiet provisional choice, honor the fixed relationship, label
the choice provisional in your report — and never restate this node as
answered.
`,
  },
  {
    relativePath: "signature.type.md",
    content: `---
description: "Gather for any text, and for heroes, landing pages, and editorial moments. The type dial: one voice typeface plus a mono for machine detail, editorial scale kept separate from product text — this dial is unanswered; ask the human or flag the gap, don't freehand it."
---

This dial is unanswered — ask the human or flag the gap. Do not freehand a
value and present it as brand-backed.

The relationship is fixed: one typeface is the voice of the interface,
everywhere, with a mono variant only for code, tool detail, and machine
output. The heading scale is editorial — it exists for pages composed
outside the text variants, heroes and editorial moments — and product UI
never mixes the two vocabularies in one view. A modal title is not a poster.
The one-voice rule and the editorial/product split are the parts worth
keeping.

The open question: what typeface is this brand's voice, what mono partners
it, and what rhythm does the editorial heading scale carry? When the human
answers, restate this node as "this brand's current answer is …" and record
the values where your materials live. If the task can't wait for an answer,
proceed with a quiet provisional choice, honor the fixed relationship, label
the choice provisional in your report — and never restate this node as
answered.
`,
  },
  {
    relativePath: "signature.temperature.md",
    content: `---
description: "Gather for any copy and for motion character. The temperature dial: how the brand sounds and how it moves, one shared temperature — this dial is unanswered; ask the human or flag the gap, don't freehand it."
---

This dial is unanswered — ask the human or flag the gap. Do not freehand a
value and present it as brand-backed.

The relationship is fixed: voice and motion carry the same temperature. Copy
states what happened, what is possible, or what the user must decide — it
does not perform personality — and motion confirms rather than entertains.
The coupling — words and motion sharing one temperature — is the part worth
keeping.

The open question: where does this brand sit — how warm or cool is its copy,
what does its motion feel like, and what character does its one ease carry?
When the human answers, restate this node as "this brand's current answer
is …" and record the values where your materials live. If the task can't
wait for an answer, proceed with a quiet provisional choice, honor the fixed
relationship, label the choice provisional in your report — and never
restate this node as answered.
`,
  },
];
