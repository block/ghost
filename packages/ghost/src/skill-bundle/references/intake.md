---
name: intake
description: Lead package intake from loose evidence by inspecting first, separating facts from inference, and asking for grouped approval before package edits.
---

# Recipe: Intake Loose Evidence

**Goal:** turn supplied material and intended use into grouped conclusions the
human can review before any new brand guidance is written.

Use this reference when the user wants to create or revise a `.ghost/` package
from loose evidence: files, screenshots, links, product surfaces, code, notes,
brand documents, examples, or rejected work. If the user already approved the
brand decision and only needs package edits, go to [authoring.md](authoring.md).

## Intake loop

1. **Name the intended use.** Capture what the package is being prepared to help
   agents make or review. If the use is broad, start with the visible scope and
   state the limit.
2. **Inventory accessible evidence.** List what the human supplied or pointed at
   and what you can open. If access fails, say what failed and ask for a copy,
   transcript, screenshot, or authoritative source only when that evidence would
   change guidance.
3. **Inspect before asking.** Open available material before broad questions.
   Prefer direct inspection over asking the human to summarize material you can
   read yourself.
4. **Sort conclusions.** Keep facts, machine inferences, proposed brand
   decisions, excluded evidence, and open questions separate.
5. **Group related choices.** Present conclusions by decision area, not by file.
   Ask for approval, correction, narrowing, rejection, or deferral of each group.
6. **Ask only for decisions.** Ask when the machine cannot settle a choice that
   affects guidance. Do not ask for background that would not change a node,
   material locator, check, or package boundary.
7. **Hand off approved decisions.** After approval, use
   [authoring.md](authoring.md) and [nodes.md](nodes.md) to make the smallest
   package change that preserves the approved decision. If no package exists,
   run `ghost init` and inspect the complete starter after intake approval,
   before authoring. Do not hand-create a reduced package.

Missing information is not always a blocker. Start with the useful approved
scope, name what is out of scope, and leave open questions outside `.ghost/`
until the human decides them.

## Evidence classes

| Class | What belongs there | Boundary |
| --- | --- | --- |
| Facts checked by the agent | Things directly visible in opened evidence: text, paths, component names, visible hierarchy, constraints, contradictions, examples, and access failures. | Do not add intent or purpose unless the evidence states it. |
| Machine inferences | Provisional explanations of why the facts may matter. | Label as inference and keep it out of node prose until approved. |
| Proposed brand decisions | Choices that would change guidance: stance, scope, condition, replacement, material binding, or package boundary. | Ask for grouped approval before writing them. |
| Approved brand decisions | Proposed decisions the human accepted or corrected. | These may be written without re-asking for each file operation. |
| Excluded or weak evidence | Repetition, legacy code, generic claims, inaccessible material, stale examples, or artifacts that do not affect guidance. | State why it is excluded or weak; do not let it silently steer. |
| Open questions | Decisions the machine cannot settle from accessible evidence. | Ask only when the answer changes guidance. |

Repeated implementation patterns are evidence for a question. They are not brand
authority by themselves. Code can show where a thing lives and how it behaves;
it does not establish why the brand wants it.

## Approval rule

Approval is for grouped conclusions and new or changed brand decisions, not for
every file operation. After the human approves a decision, routine placement,
wording, locator edits, and validation fixes may proceed when they preserve that
decision. If drafting reveals a new brand decision, contradiction, widened
scope, or changed meaning, stop and ask again.

Do not write approved guidance into `.ghost/` until the human has approved the
decision. Do not create a sidecar or run-state file automatically.

## Optional handoff

A session may keep a plain Markdown handoff at `.ghost-workbench/intake.md` when
local durable state is useful. This file is optional consumer state. It is not a
`.ghost/` package file, has no schema guarantee, and must not be treated as
canonical guidance. The same content may stay in conversation instead.

Use this shape when a handoff is useful:

```markdown
# ghost Intake Handoff

## Intended use

## Accessible evidence

## Facts checked by the agent

## Machine inferences

## Proposed brand decisions for approval

## Approved brand decisions

## Excluded or weak evidence

## Open questions

## Scope limits
```

Keep the handoff outside `.ghost/`. Never create it without a session need or
user request.

## Never

- Never start with a broad questionnaire when supplied evidence can be inspected.
- Never treat repeated code, component use, or token names as brand authority by
  themselves.
- Never mix facts, inference, proposed decisions, and approved decisions.
- Never write observations, scratch notes, or unapproved decisions into
  `.ghost/`.
- Never ask the human to approve every file operation after the decision is
  approved.
- Never create `.ghost-workbench/intake.md` automatically as package state.
