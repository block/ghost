---
for: Building or changing AI conversation, prompt input, reasoning display, or tool output.
materials:
  - packages/vessel-react/src/components/ai-elements/conversation.tsx
  - packages/vessel-react/src/components/ai-elements/message.tsx
  - packages/vessel-react/src/components/ai-elements/prompt-input.tsx
  - packages/vessel-react/src/components/ai-elements/reasoning.tsx
  - packages/vessel-react/src/components/ai-elements/tool.tsx
  - packages/vessel-react/src/components/ai-elements/chain-of-thought.tsx
---

## Usage

A conversation is a document being written, not a chat skin. The assistant
is the document's author. The asymmetry between plain assistant prose and
contained user turns is the whole message-identity system. Machinery is
subordinate to prose. The composer is the one persistent control surface.
Streaming is choreography, not spectacle. The components encode this
grammar.

## Rules

- Assistant turns render as plain prose on the page surface: no bubble, no
  border, no initials-circle avatar.
- User turns get quiet containment: a muted secondary container,
  right-aligned, so the reader can scan whose words are whose.
- Reasoning, tool calls, chain-of-thought, and sources render as collapsed,
  muted affordances the reader can open.
- Status is text and subtle motion (shimmer), not colored badges per step.
- The composer owns the bottom edge, carries its own elevation, and holds
  the view's primary action.
- Streaming text appears in place, the scroll follows the newest content
  until the user takes the wheel, and layout never jumps as parts resolve.
- Empty conversation states say what this product does, in this product's
  words.

## Never

- Never contain the assistant in a balloon: that demotes the document's
  author to a participant; render assistant turns as plain prose on the
  page surface.
- Never "balance" the asymmetry by boxing both sides: keep user turns
  contained and assistant turns plain.
- Never render machinery as loud cards competing with the answer: collapse
  it into muted affordances the reader can open.
- Never let anything else in the conversation column compete with the
  composer for weight: the composer holds the view's primary action.
- Never ship a stream that reflows the page: text appears in place and
  layout stays put as parts resolve.
- Never ship "Start a conversation to see messages here" restyled: say
  what this product does, in this product's words.
