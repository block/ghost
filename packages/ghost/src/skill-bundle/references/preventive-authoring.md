---
name: preventive-authoring
description: Prepare approved brand decisions for first generation by finding consequential ambiguity, small examples, and material-backed repairs.
---

# Recipe: Preventive Authoring

**Goal:** turn approved intake conclusions into guidance an agent can use before
its first build. Use this after the human has approved the intake direction and
before final package edits. This recipe teaches authoring moves, not brand
answers.

## Preventive authoring loop

1. Pull the relevant existing guidance and inspect the named materials or
   implementation evidence before proposing more prose.
2. Compare the approved direction with accessibility, accuracy, usability,
   trust, and other approved decisions. Assess the design: explain any
   concern, recommend the smallest correction, and ask before changing the brand
   direction.
3. Inspect five needs before recommending the package for first generation:
   consistent decisions, composition, conditional changes, plausible wrong
   choices and their replacements, and material access.
4. Mark each need as supported, not relevant within scope, or an unresolved gap.
5. Rank unresolved gaps by consequence. Address risks to recognition,
   accessibility, accuracy, trust, and central design choices first. Then address
   repeated hierarchy or usability problems. Defer minor differences that do not
   justify more guidance.
6. Draft the smallest useful repair: no change, material locator, existing-node
   edit, small example, or new node. One node or example can satisfy several
   needs.
7. Ask for approval only when the repair introduces or changes a brand decision.
   Routine drafting under approved decisions does not need per-file approval.

Resolve a risk before generation when existing evidence is sufficient. A failed
output is not required. If evidence cannot establish the brand answer, prepare a
clearly provisional proposal for human review.

## Shared knowledge versus brand decision

The skill may know common failure shapes: copied component APIs, token lists
without emphasis rules, examples that accidentally become templates, and legacy
implementation that conflicts with approved intent. The skill must not supply the
brand's answer to those failures.

Keep shared methods here. Put approved answers in the package. Do not encode a
task-specific answer as durable brand guidance.

## Additions must earn space

Every added node, paragraph, locator, example, or check must earn its space by
one of these tests:

- It distinguishes this brand from a plausible generic default.
- It resolves an important choice the agent will otherwise have to guess.
- It prevents a likely harmful default.

Check existing guidance and implementation first. If the risk is already
resolved, report that no package addition is needed. Absence can be correct when
the package intentionally leaves room or when local implementation already gives
the agent the needed contract.

## Important ambiguity triage

Use this triage when approved direction is real but still under-specified:

| Need | Inspect | Possible repair |
| --- | --- | --- |
| Consistent decisions | pulled guidance, accepted intake conclusions, contradictions | condition, replace, or remove the conflicting claim |
| Composition | examples, stories, screenshots, component usage, Skeletons | bound/open pattern or a tiny example |
| Conditional changes | reversal situations, responsive constraints, states | condition in prose near the rule it affects |
| Plausible wrong choices | likely model default, legacy habit, neighboring component | reject-and-replace sentence; near miss where useful |
| Material access | exact paths, external locators, source availability | explicit material locator or note that access is blocked |

Do not require a node or example for every need. A supported need is done. A
not-relevant need is done. Only unresolved consequential gaps need repair.

## Small example pattern

Add examples only when they change likely output. Keep them as small as the
ambiguity allows. Before or after the example, name what is normative, what is
incidental, and when it applies.

```markdown
This example is normative for spacing rhythm and action order.
The copy is incidental.
Use the compact variant only when the surface has less than 320px width.
```

Name what future work must preserve and what may vary. Where useful, show a
plausible nearby wrong choice and explain why it violates the decision in that
situation. Do not require a counterexample for every example.

## Existing component and material first

Prefer existing components, tokens, examples, stories, tests, and shipped
surfaces before inventing structure. Use `materials` locators to point at
concrete sources. Keep component APIs, props, states, and registry manifests in
their owning docs or source files.

A material locator is access, not authority. The node body still has to say why
and when the material matters. If the component already encodes the answer and
approved prose explains the purpose, no addition may be needed.

## Worked authoring patterns

Use these patterns before generation as well as after a failure. A warning sign
can be a gap in the supplied guidance, not an observed bad output. These
examples teach investigation; their design answers are not brand defaults.

### Correct components with wrong composition

- **Warning sign:** approved components exist without composition guidance, or the output order,
  density, or emphasis makes the moment feel generic or misleading.
- **Inspection:** compare accepted examples, stories, screenshots, and current
  node prose. Identify which relationship fails: what appears first, what
  competes, what repeats, or what disappears.
- **Possible causes:** the package names components but not their composition;
  the component docs teach API, not hierarchy; a broad example accidentally
  invites a copied layout.
- **Small repair:** add a bound/open composition sentence or a tiny example that
  preserves order and emphasis while leaving content open.
- **Limits:** do not invent spacing values or a new layout system unless the
  approved material establishes them.

### Exact tokens without emphasis rules

- **Warning sign:** tokens have exact values but no usage rules, or the result gives the wrong
  priority, mood, or contrast between actions.
- **Inspection:** inspect the emitted token syntax, accepted surfaces, and any
  rules about hierarchy, risk, or action order.
- **Possible causes:** values are available but roles are not explained; token
  names are treated as intent; the agent applies every approved value with equal
  weight.
- **Small repair:** add prose that says which role carries emphasis in the named
  situation and which approved token remains secondary.
- **Limits:** do not infer purpose from a token name alone. Ask when the human
  has not approved the emphasis decision.

### Voice adjectives without a usable decision

- **Warning sign:** guidance says the brand is warm, clear, premium, calm, or
  confident without concrete choices, or drafts still need the same rewrites.
- **Inspection:** compare before and after copy, rejected phrases, and the user
  action at stake. Find the concrete move: what is said first, what is omitted,
  what uncertainty is named, or what replacement phrase appears.
- **Possible causes:** adjectives describe an impression but not a decision;
  examples lack keep/vary notes; the rejected default is not paired with a
  replacement.
- **Small repair:** replace the adjective with an observable choice and, where
  useful, a near miss that shows the wrong neighboring move.
- **Limits:** do not turn one line of copy into a universal voice rule. Mark the
  situation where it applies.

### Conflicting legacy implementation

- **Warning sign:** code or shipped surfaces repeat a pattern that conflicts
  with approved intake conclusions or current guidance.
- **Inspection:** show the approved decision and legacy evidence side by side.
  Check whether the legacy material is still maintained, intentionally
  grandfathered, or already scheduled to change.
- **Possible causes:** old implementation survived a rebrand; a component was
  reused outside its purpose; a screenshot is historical rather than canonical.
- **Small repair:** condition the guidance, mark the legacy pattern as not a
  source of authority, or remove its material locator after approval.
- **Limits:** do not silently override the human's intent. Ask whether to keep,
  narrow, replace, or mark the legacy pattern as out of scope.

## What not to encode

- Do not encode task facts, one-off campaign answers, or local debugging notes as
  brand guidance.
- Do not copy component manuals, prop tables, or registry manifests into nodes.
- Do not add examples whose only benefit is aesthetic preference without a
  consequential decision.
- Do not include checks as generation context. Checks remain review-only.
- Do not make starter payload gaps into universal required questions.

## Handoff to validation and review

After preventive edits, run `ghost validate`. For future making, preventive
examples are generation context only when selected through normal `ghost gather`
and `ghost pull`. If checks exist, keep them out of generation context and use
`ghost review` after a diff exists.

Report the final state as: supported needs, not-relevant needs, unresolved gaps
ranked by consequence, package edits made, decisions that still need approval,
and material that was not inspected.
