---
for: Chat threads, agent consoles, and prompt composers.
---

In this context: AI conversation threads, agent consoles, review assistants,
and prompt composers. Elsewhere, the defaults hold.

## Usage

Conversation UI is not chat cosplay. The assistant speaks on the page
surface as plain text — hierarchy comes from prose, spacing, and type.
Wrapping assistant messages in cards makes the system look defensive and
wastes density. Tool calls are operational evidence, not conversation.

## Rules

- Assistant turns render as plain text on the page surface: no bubble, no
  border, no fill.
- User turns are compact muted surfaces aligned right — authorship marked
  without turning the thread into alternating balloons.
- Tool calls collapse to a labeled one-line summary with status; expand only
  when the user asks, then show mono content inside the disclosed area.
- The prompt input is one bordered surface. The textarea stays empty of
  controls; attachments, model choice, and send live in a single row below
  it.
- Stop and send are mutually exclusive states of the same action area.

## Never

- Never wrap assistant messages in cards or bubbles — plain text on the
  page surface.
- Never render two competing primary actions in the composer — stop and
  send share one action area.
