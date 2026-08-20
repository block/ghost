---
name: nodes
description: Write durable ghost guidance with discriminating context, purposeful prose, conditions, replacements, and useful examples.
---

# Recipe: Write Guidance Nodes

**Goal:** write the smallest node that forces a real brand decision. Package
shape belongs in [schema.md](schema.md); this recipe owns the guidance itself.

## One node, one purpose

A node is one coherent decision with one applicability. Split only when a body
contains another decision that should be gathered in a different situation.
Do not split by destination or component name.

Use `for` as retrieval payload, not summary. State the situation or activity
the guidance is for, never an audience. Read it alone: if it fits every brand
or almost every task, it will not help selection. Put what to do and why in
the body.

## The default body shape

Unless the package's glossary declares another vocabulary, structure a node
body with three semantic sections, each a home for one type of claim, plus an
optional `## Skeleton` (always last):

- `## Usage` — the worldview and decision logic that help the model handle
  decisions the author did not anticipate.
- `## Rules` — observable requirements a reviewer can assess in the finished
  artifact, one per bullet. Exact values where useful. Put a known gap inside
  the rule it affects: name the gap and state that the model must not invent
  a value.
- `## Never` — selective, high-value failure modes, each paired with its
  replacement: "never X — instead Y."

Route each claim to one home. Can a reviewer observe it in the artifact?
Rules. Does it reject a plausible move and name the replacement? Never. Does
it shape decisions not covered by either? Usage. None of these? Cut it.
A claim gets one home; do not repeat it as worldview, rationale, and rule.
Include only the sections the node needs; a short node may be plain prose.

Altitude lives in prose:

- State universal guidance plainly.
- Give narrower guidance a condition that names when it holds.
- Name the reversal condition when a decision can legitimately flip.
- Do not encode scope through folders, hierarchy, inheritance, or edges.

While drafting, ask three questions. They are prompts, not fields:

1. **Why:** what stance or tradeoff forces the choice?
2. **With what:** which concrete materials let the agent act on it?
3. **How assembled:** which relationships or opening structure must hold?

A node may answer one or all three. Put locators in `materials`; keep
interpretation in prose.

## Write decisions, not brand-deck language

A useful sentence rejects a plausible alternative. "We value clarity and
trust" does not steer. "State what remains safe before asking the person to try
again" does.

Keep real absolutes. `Never` and `always` are correct for human-confirmed hard
lines. Elsewhere, remove filler and unchosen hedges: "elevate," "delight,"
"seamless," "best-in-class," "generally," "where possible," and "consider."
If the human has not picked a side, return to authoring rather than laundering
uncertainty into prose.

## Patterns bind and open

A pattern fixes part of a reusable structure and leaves the rest available:

- **Bound:** what must not be redecided, such as what appears first, exactly
  once, or never competes for attention.
- **Open:** where the agent may choose within limits, such as evidence form,
  secondary content, or tone within a range.

Everything bound is a template. Nothing bound is vibes. Use a Skeleton only
when the opening structure itself must arrive verbatim; see
[materials.md](materials.md).

## Never sections replace

A strong `Never` entry says **not X; instead Y; recognize the switch by Z**.
Negation alone makes the rejected default more salient without committing the
replacement. Put shared, measured model behavior in `standard.model-defaults`;
put a brand-specific rejection in the applicable foundation, context, or
pattern node.

```markdown
---
for: Building or reviewing a performance dashboard.
---

Not rounded cards, celebratory gradients, and a wall of equal metrics.
Instead use one accountable fact, its evidence, and one priced next action on a
flat surface. Recognize the switch: removing the logo should not leave a generic
SaaS dashboard behind.
```

Purge the rejected pattern from examples and starter structures. Use checks to
catch the hard regression; do not make `Never` prose carry review alone.

## Explain examples

If a node includes or points to an example, say what the agent should keep and
what should change with the task. Name the situation it fits when needed. If
you cannot give those instructions, leave the example out.

## Reusable blocks earn prose by purpose

Generic primitives need no node merely because they exist. A primitive earns
prose only for its brand-specific divergence. A reusable block earns a node when
it encodes a distinguishable user moment or arrangement.

For a reusable block, write a short body in this rhythm:

- **For:** the user need, not the widget.
- **Reach when:** the user's first question.
- **Not when:** the neighboring purpose to choose instead.
- **Never:** the misuse that stretches it beyond its job.

Two blocks that answer the same first question are one purpose, not two nodes.
Keep props and API reference out of the body. The implementation is swappable;
the purpose is durable.

## Drafting gate

Before curation, ask:

| Dimension | Question |
| --- | --- |
| Testimony | Can you name the human words or evidence behind this? |
| Discrimination | Does the `for` payload select a real situation rather than a topic? |
| Force | Does the body decide something and reject a plausible alternative? |
| Altitude | Is it universal on purpose, or conditioned? |
| Residue | Is it free of starter prose, API mirroring, and brand-deck filler? |

A weak answer returns to the human or evidence. Scores do not make guidance
canonical; human curation does.

## Match the form to the failure

| If the agent keeps... | Author... |
| --- | --- |
| missing guidance | sharper `for` payload; universal guidance may belong on the cover |
| inventing values | a material-backed node with exact vocabulary |
| producing generic output | a reject-and-replace `Never` entry plus a well-explained example |
| choosing the wrong structure | bound/open pattern and, when needed, a Skeleton |
| crossing a hard line | invariant prose plus a review check |
| applying guidance too broadly | a condition or reversal condition |
| making the wrong tradeoff | a decision trace with the losing alternative |

## Never

- Never write a node the human neither said, showed, nor accepted.
- Never make a node a container for observations or implementation inventory.
- Never duplicate API documentation unless the API itself is the guidance.
- Never use a broad `for` payload to compensate for unrelated decisions in one body.
- Never ship a blacklist-only `Never` section; name the replacement.
