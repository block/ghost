---
description: "AI conversation threads — assistant text on the page surface, compact user turns, collapsed tool calls, one structured prompt input. Read only for chat threads, agent consoles, and prompt composers."
---

In this context: AI conversation threads, agent consoles, review assistants,
and prompt composers. Elsewhere, the defaults hold.

Conversation UI is not chat cosplay. The assistant speaks on the page
surface as plain text: no bubble, no border, no fill. Wrapping assistant
messages in cards makes the system look defensive and wastes density —
hierarchy comes from prose, spacing, and type.

User turns are compact muted surfaces aligned right. They mark authorship
without turning the thread into alternating balloons.

Tool calls are operational evidence. Collapse them to a labeled one-line
summary with status; expand only when the user asks, then show mono content
inside the disclosed area.

The prompt input is one bordered surface. The textarea stays empty of
controls so writing remains the focus; attachments, model choice, and send
live in a single row below it. There is one primary send action — stop and
send are mutually exclusive states of the same action area, never two
competing primaries.
