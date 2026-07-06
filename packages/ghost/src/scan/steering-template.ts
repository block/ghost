import type { GhostInitTemplate, TemplateFile } from "./templates.js";

interface SteeringTemplateDeps {
  manifestFile(): TemplateFile;
  gitignoreFile(): TemplateFile;
}

export function createSteeringTemplate({
  manifestFile,
  gitignoreFile,
}: SteeringTemplateDeps): GhostInitTemplate {
  return STEERING_TEMPLATE_FACTORY(manifestFile, gitignoreFile);
}

/**
 * Steering starter: named truths for pre-generation steering. The extra kinds
 * are vocabulary only: no schema or selection behavior changes.
 */
function STEERING_TEMPLATE_FACTORY(
  manifestFile: () => TemplateFile,
  gitignoreFile: () => TemplateFile,
): GhostInitTemplate {
  return {
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
    posture: guard
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

Review-critical guard posture. State not-X-instead-Y: the rejected default, the positive replacement, and how to recognize the switch.

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

This fingerprint is demo content for **Morrow Ledger**, a small bookkeeping product for independent studios. It steers agent-generated product and brand work; it is not a component API or complete archive.

## Before you trust this fingerprint

Everything in this starter package is demo content. It is intentionally opinionated so you can see the shape of useful steering: hard truths, refusal lines, material locators, patterns, exemplars, and tradeoff traces. Keep any structure that helps, but replace the claims, paths, examples, and decisions with real product truth before using this fingerprint to guide generation.

## Non-negotiables

The lines below are demo non-negotiables for inspiration and guidance. Replace them with your real hard truths:

- Morrow Ledger sounds like a careful bookkeeper, not a growth coach.
- Use slate ink, ledger green, and quiet amber before inventing new color.
- Preserve the composition floor in \`principle.composition\`.
- Avoid the generic generated defaults named in \`anti-goal.*\`.
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

Morrow Ledger helps independent studios know what changed in their money without making finance feel like a performance dashboard.

Forced choices:

- **Clarity beats momentum.** When a line could sound exciting or precise, choose precise. Write "3 invoices are 14+ days late" instead of "Cash flow needs attention."
- **Evidence beats reassurance.** Pair every claim with the number, date, file, or account behind it. Never say "all set" unless the surface shows what was checked.
- **Calm beats clever.** Use plain verbs: sent, due, matched, missing, paid. Avoid pep-talk verbs: crush, unlock, supercharge.
- **Small business time is scarce.** Lead with the next accountable action and its cost: "Review 2 unmatched deposits — about 4 minutes."

The brand earns trust by making the boring truth easy to act on. If the work feels motivational, it is drifting.

`,
        },
        {
          relativePath: "principle.composition.md",
          content: `---
description: Composition floor — hard layout invariants that hold whether or not a pattern matches the ask.
---

These demo invariants show the kind of floor that steers generation. Replace them with real hard lines that apply to every generated surface unless a narrower condition explicitly says otherwise. Patterns narrow them; nothing loosens them.

For Morrow Ledger:

- **One ledger fact leads.** Every surface opens with one factual sentence or number. If two facts compete, choose the one that changes what the user does next.
- **Maximum three figures above the fold.** A figure is any amount, count, date, or percentage. If there are four, demote one into details instead of shrinking type.
- **Actions are accountable verbs.** Primary actions begin with Review, Match, Send, Export, or Mark. Never use generic "Continue" when the action can be named.
- **Whitespace before boxes.** Separate sections with 24px vertical space first, a 1px #D8DED8 rule second, and a card only when the content has its own state.

Token sketch for demos:

\`\`\`css
:root {
  --morrow-ink: #17201b;
  --morrow-ledger: #2f6f4f;
  --morrow-amber: #b7791f;
  --morrow-paper: #f7f5ef;
}
\`\`\`

`,
        },
        {
          relativePath: "anti-goal.generic-generated-output.md",
          content: `---
description: The generic generated output this fingerprint rejects.
---

This is demo anti-goal content. Replace it with the defaults this brand actually refuses.

Not: a rounded-card SaaS dashboard full of gradients, celebratory deltas, and "You're crushing it" copy.

Instead: a ledger-first surface with one leading fact, muted paper background, accountable next action, and evidence close to the claim.

Concrete replacements:

- Not "Revenue is up 24% 🎉" — instead "July receipts are $4,820 higher than June; 2 invoices explain most of the change."
- Not a decorative blob or fake chart preview — instead a compact list of the source transactions or invoices.
- Not "Oops, something went wrong" — instead "We could not match deposit 1042. Choose the invoice or mark it as owner contribution."

A technically correct output can still be off-brand if any product could ship it. This guard is review-critical because generic finance optimism is the most likely model default.
`,
        },
        {
          relativePath: "pattern.status-with-next-step.md",
          content: `---
description: Status of an ongoing thing plus the single next step — use when the task asks where something stands or what happens next.
---

This is a demo pattern for inspiration and guidance. Replace it with a real reusable pattern from your product.

Applies when the surface explains the state of something in flight: invoice payment, bank sync, export, tax packet, or reconciliation.

**Bound (do not redecide):**

- Status line first, exactly one sentence, no more than 11 words.
- One evidence row with amount, date, and source.
- One primary next step last, beginning with an accountable verb.

**Open (within limits):**

- Evidence may be a table row or two-item list.
- Use amber only for a user action needed within 7 days.

## Skeleton

\`\`\`tsx
<section className="morrow-status">
  <p className="eyebrow">{scope}</p>
  <h1>{statusSentence}</h1>
  <p>{meaningSentence}</p>
  <dl>{amountDateSource}</dl>
  <button>{accountableNextStep}</button>
</section>
\`\`\`

`,
        },
        {
          relativePath: "exemplar.annotated-reference.md",
          content: `---
description: Annotated reference — replace with a sample that shows form, rhythm, quality, voice, or code shape.
materials:
  - src/components/status-card.tsx
---

This is demo exemplar content. Replace \`src/components/status-card.tsx\` with a real screenshot, file, URL, or implementation path.

Normative for: density, evidence placement, accountable action language.

Annotated reference:

\`\`\`tsx
<aside className="rounded-none border-l border-[#D8DED8] bg-[#F7F5EF] p-6 text-[#17201B]">
  <p className="text-xs uppercase tracking-[0.14em] text-[#2F6F4F]">Bank sync</p>
  <h2 className="mt-3 text-2xl font-semibold">3 deposits need matching</h2>
  <p className="mt-2 max-w-prose text-sm">They total $8,410 and arrived between Jul 12 and Jul 15.</p>
  <button className="mt-6 border border-[#17201B] px-4 py-2 text-sm">Match deposits — about 4 minutes</button>
</aside>
\`\`\`

Copy the square edge, measured evidence, and action cost. Do not copy the exact amounts or dates.
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

Morrow Ledger's starter materials should resolve to real files in your repo before use:

- \`src/styles/tokens.css\` should define the ink, ledger, amber, paper, and rule colors.
- \`src/components/**\` should include the production Button, InlineAlert, and DataRow components.
- \`public/brand/**\` should include the wordmark and any blessed product screenshots.

Use this node to locate real materials. \`materials\` points to concrete files; this prose explains what they mean. Do not duplicate API docs unless the API itself is the brand truth.
`,
        },
        {
          relativePath: "decision.tradeoff.md",
          content: `---
description: Worked tradeoff — replace with a decision where the brand chose between plausible options.
---

This is demo decision content. Replace it with a real tradeoff that helps an agent decide between plausible good answers.

Morrow Ledger tradeoff: we chose visible evidence over shorter surfaces.

- Option A: a compact success banner, "Bank sync complete." It was calm and fast, but it hid what changed.
- Option B: a slightly taller status block, "Bank sync complete; 14 transactions imported since Jul 12." It costs one extra line but gives the user a fact to trust.
- Decision: choose Option B whenever the action touches money, taxes, invoices, exports, or bank data.
- Reverses when: the evidence would expose sensitive third-party details in a shared view. Then show the count only and link to details.
`,
        },
      ];
    },
  };
}
