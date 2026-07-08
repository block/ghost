---
description: Conversation grammar for AI surfaces — assistant prose on the page surface, quiet user containment, tools and reasoning as collapsed affordances.
materials:
  - "**/components/ai-elements/conversation.tsx"
  - "**/components/ai-elements/message.tsx"
  - "**/components/ai-elements/prompt-input.tsx"
  - "**/components/ai-elements/reasoning.tsx"
  - "**/components/ai-elements/tool.tsx"
  - "**/components/ai-elements/chain-of-thought.tsx"
---

A conversation is a document being written, not a chat skin. The grammar the
components encode:

Assistant turns render as plain prose on the page surface — no bubble, no
border, no initials-circle avatar. The assistant is the document's author;
containing it in a balloon demotes it to a participant.

User turns get quiet containment: a muted secondary container, right-aligned,
so the reader can scan whose words are whose. That asymmetry is the whole
message-identity system. Do not "balance" it by boxing both sides.

Machinery is subordinate to prose. Reasoning, tool calls, chain-of-thought,
and sources render as collapsed, muted affordances the reader can open — never
as loud cards competing with the answer. Status is text and subtle motion
(shimmer), not colored badges per step.

The composer is the one persistent control surface. It owns the bottom edge,
carries its own elevation, and holds the view's primary action. Nothing else
in the conversation column should compete with it for weight.

Streaming is choreography, not spectacle: text appears in place, the scroll
follows the newest content until the user takes the wheel, and layout never
jumps as parts resolve. A stream that reflows the page is a broken stream.

Empty conversation states say what this product does, in this product's
words — not "Start a conversation to see messages here" restyled.
