---
name: nodes
description: Write durable ghost guidance with discriminating context, purposeful prose, conditions, replacements, and annotated examples.
---

# Recipe: Write Guidance Nodes

**Goal:** write the smallest node that forces a real brand decision. Package
shape belongs in [schema.md](schema.md); this recipe owns the guidance itself.

## One node, one purpose

A node is one coherent decision with one applicability. Split only when a body
contains another decision that should be gathered in a different situation.
Do not split by destination or component name.

Use `context` as retrieval payload, not summary. State the observable situation
in which the node applies. Read it alone: if it fits every brand or almost every
task, it will not help selection. Put what to do and why in the body.

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

Keep real absolutes. `Never` and `always` are correct for human-ratified hard
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
[concrete.md](concrete.md).

## Anti-goals replace

A strong anti-goal says **not X; instead Y; recognize the switch by Z**.
Negation alone makes the rejected default more salient without committing the
replacement.

```markdown
---
context: Building or reviewing a performance dashboard.
---

Not rounded cards, celebratory gradients, and a wall of equal metrics.
Instead use one accountable fact, its evidence, and one priced next action on a
flat surface. Recognize the switch: removing the logo should not leave a generic
SaaS dashboard behind.
```

Purge the rejected pattern from exemplars and starter structures. Use checks to
catch the hard regression; do not make anti-goal prose carry review alone.

## Exemplars separate intent from accident

A complete artifact often steers more strongly than abstract rules. Every
exemplar must say:

- the situation and surface shape it represents;
- what is intentional and should be preserved;
- what is incidental and must change with task facts;
- the implementation, fixture, or source that produced it;
- the conditions that challenge or break it;
- ownership or freshness when stale guidance would be dangerous.

One exemplar proves one solution under stated conditions. It is not a universal
visual target. If unrelated tasks converge on its section order or decoration,
tighten its context, add a shape-appropriate exemplar, or remove it.

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
| Discrimination | Does the context select a real situation rather than a topic? |
| Force | Does the body decide something and reject a plausible alternative? |
| Altitude | Is it universal on purpose, or conditioned? |
| Residue | Is it free of starter prose, API mirroring, and brand-deck filler? |

A weak answer returns to the human or evidence. Scores do not make guidance
canonical; human curation does.

## Match the form to the failure

| If the agent keeps... | Author... |
| --- | --- |
| missing guidance | sharper `context`; universal guidance may belong on the cover |
| inventing values | a material-backed node with exact vocabulary |
| producing generic output | replacement anti-goal plus annotated exemplar |
| choosing the wrong structure | bound/open pattern and, when needed, a Skeleton |
| crossing a hard line | invariant prose plus a review check |
| applying guidance too broadly | a condition or reversal condition |
| making the wrong tradeoff | a decision trace with the losing alternative |

## Never

- Never write a node the human neither said, showed, nor accepted.
- Never make a node a container for observations or implementation inventory.
- Never duplicate API documentation unless the API itself is the guidance.
- Never use a broad context to compensate for unrelated decisions in one body.
- Never ship an unannotated exemplar or a blacklist-only anti-goal.
