---
for: Any AI thread, agent console, review assistant, or prompt composer.
materials:
  - materials/examples/composition.conversation.html
---

## Usage

Conversation UI is not chat cosplay. The assistant speaks on the page surface
as plain text: no bubble, no border, no fill.

Assistant hierarchy comes from prose, spacing, and type. Wrapping assistant
messages in cards makes the system look defensive and wastes density.

Tool calls are operational evidence. The prompt input is one bordered
surface; the textarea region stays empty of controls so writing remains the
focus.

Use the conversation reference when building any AI thread, agent console,
review assistant, or prompt composer. It carries the grammar that agents most
often get wrong.

## Rules

- The assistant speaks on the page surface as plain text: no bubble, no
  border, no fill.
- User turns are compact muted surfaces aligned right. They mark authorship
  without turning the thread into alternating balloons.
- Tool calls collapse to a labeled one-line summary with status. Expand only
  when the user asks for detail, then show mono content inside the disclosed
  area.
- The prompt input is one bordered surface, with the textarea region empty
  of controls. Attachments, model choices, secondary tools, and send live in
  a single row below it.
- There is one primary send action. Stop and send are mutually exclusive
  states of the same action area.

## Never

- Never wrap assistant messages in cards — it makes the system look
  defensive and wastes density; instead draw assistant hierarchy from prose,
  spacing, and type.
- Never turn the thread into alternating balloons — instead mark authorship
  with compact muted user surfaces aligned right and plain-text assistant
  turns.
- Never expand tool calls by default — instead collapse them to a labeled
  one-line summary with status, expanding only when the user asks for
  detail.
- Never put controls inside the textarea region — instead keep writing the
  focus and place attachments, model choices, secondary tools, and send in a
  single row below it.
- Never show stop and send as two competing primary buttons — instead treat
  them as mutually exclusive states of the same action area.
