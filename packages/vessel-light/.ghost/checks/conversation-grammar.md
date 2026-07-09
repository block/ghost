---
name: Conversation grammar
description: Flags conversation UI that breaks plain assistant text, prompt-input structure, primary-action discipline, or collapsed tool output.
severity: high
references:
  - grammar.conversation
  - grammar.surfaces
---

Apply this check to diffs that touch AI threads, agent consoles, prompt composers, chat messages, or tool-call rendering.

Flag assistant messages wrapped in bordered, filled, elevated, or card-like surfaces. Assistant turns should sit as plain text on the page surface.

Flag user messages that are not compact muted surfaces aligned to the right when the layout has a conversational thread.

Flag controls placed inside the prompt-input textarea region. The textarea is for writing only; controls belong in the single row below it.

Flag more than one primary button in the input row. Send, stop, retry, attach, model select, and tools must not compete as primary actions.

Flag tool output shown expanded by default. The default state is a one-line labeled summary with status; mono detail appears after expansion.
