---
description: Build AI conversations with plain assistant text, compact user surfaces, collapsed tool calls, and one structured prompt input.
materials:
  - materials/ref/composition.conversation.html
  - "**/*.html"
---

Conversation UI is not chat cosplay. The assistant speaks on the page surface as plain text: no bubble, no border, no fill.

User turns are compact muted surfaces aligned right. They mark authorship without turning the thread into alternating balloons.

Assistant hierarchy comes from prose, spacing, and type. Wrapping assistant messages in cards makes the system look defensive and wastes density.

Tool calls are operational evidence. Collapse them to a labeled one-line summary with status. Expand only when the user asks for detail, then show mono content inside the disclosed area.

The prompt input is one bordered surface. The textarea region stays empty of controls so writing remains the focus. Attachments, model choices, secondary tools, and send live in a single row below it.

There is one primary send action. Stop and send are mutually exclusive states of the same action area, not two competing primary buttons.

Use the conversation reference when building any AI thread, agent console, review assistant, or prompt composer. It carries the grammar that agents most often get wrong.
