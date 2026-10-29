---
for: "Making visual, interactive, motion, data, media, or document content accessible."
requires: [baseline.fundamentals.core]
---

## Usage

Accessibility requirements follow the medium and the task. **Required.** rules are applicable accessibility obligations under WCAG 2.2 or the platform's equivalents; they apply within the medium and task the rule names, they exist so people with disabilities can perceive, operate, and understand the work, and brand preference cannot waive them — it controls only how the work meets them. **Default.** Treat automated checks as evidence, not proof, and review keyboard operation, screen-reader output, magnification, reduced motion, and content where applicable.

## Rules

- **Required.** Meet every applicable Level A and Level AA success criterion in WCAG 2.2.
- **Required.** Native and document work meets the equivalent platform accessibility requirements.
- **Default.** Use native semantics before ARIA.
- **Required.** Regions, headings, lists, tables, and controls expose the same structure, relationships, and reading order that sighted people receive.
- **Required.** Controls expose their role, value, and state programmatically, including changes to state.
- **Required.** Provide a way to bypass repeated content.
- **Required.** Pages have descriptive titles, links have meaningful purposes, and headings and labels state clear topics.
- **Required.** Instructions do not rely only on position, shape, sound, or other sensory characteristics to explain what to do.
- **Required.** Text and its background reach at least 4.5:1 contrast, or 3:1 for large text under WCAG's definition.
- **Required.** Meaningful interface components, states, and graphical objects reach at least 3:1 against adjacent colors.
- **Default.** Test the lowest-contrast region behind text on gradients, imagery, and changing states.
- **Required.** Status, instruction, selection, and data meaning include a second cue alongside color, such as text, an icon with an accessible name, a pattern, or an equivalent table or summary.
- **Required.** Allow zoom; keep content and controls available when text is resized to 200% and when text spacing is overridden to WCAG values.
- **Required.** A responsive view reflows to 320 CSS pixels wide without two-dimensional scrolling except where that scrolling is essential.
- **Required.** Content is not locked to one display orientation unless that orientation is essential.
- **Required.** At narrow widths and with an on-screen keyboard open, fixed regions and overlays do not obscure content, focus, instructions, or essential actions.
- **Required.** Every action is reachable and operable by keyboard, without a trap and without a timing-dependent keystroke.
- **Required.** Focus follows a logical order.
- **Required.** Focus remains visible and is not fully hidden by author-created content.
- **Required.** Focus stays inside an active modal task.
- **Required.** Focus moves to newly opened interactive content where that is appropriate, and returns sensibly when the task closes.
- **Required.** A single-character shortcut that can fire without a modifier can be turned off, remapped, or limited to focused controls.
- **Required.** Multipoint, path-based, dragging, and device-motion input are not required where a simpler control can produce the same result.
- **Required.** Actions do not fire on pointer-down where cancellation or reversal is needed.
- **Required.** The accessible name of a control contains its visible label.
- **Required.** Targets meet WCAG 2.2's 24 by 24 CSS pixel minimum or an allowed spacing or essential-use exception.
- **Default.** Custom primary touch controls use at least a 44 by 44 CSS pixel hit area when no documented platform component supplies its own sizing.
- **Required.** Every control has a programmatic name.
- **Required.** Visible labels and instructions remain meaningful without visual context.
- **Required.** Critical information is not carried only in placeholder text.
- **Required.** Meaningful images and other non-text content have an equivalent alternative that communicates their purpose.
- **Required.** Purely decorative media has an empty alternative so assistive technology skips it.
- **Required.** The page language is identified, as is any passage whose language changes.
- **Required.** Each input is associated with its label and with any format, requirement, or error guidance.
- **Required.** Errors are identified in text, a correction is suggested where it is known, and entered values are preserved.
- **Required.** Before a legal, financial, or data-changing commitment, people can review, correct, and confirm the submission.
- **Required.** The same information is not requested twice in one process when it can be reused, unless the repetition is essential.
- **Required.** Authentication offers a method that does not depend on a cognitive test such as memorizing or transcribing a password.
- **Required.** Nonessential animation and transitions respect `prefers-reduced-motion: reduce` and offer a reduced alternative.
- **Required.** Motion triggered by device movement can be disabled.
- **Required.** Nothing flashes more than three times in one second above WCAG thresholds.
- **Required.** Moving, blinking, scrolling, auto-updating, and time-limited content is under the person's control unless the timing is essential, and a session warns before it expires where the standard requires it.
- **Required.** Media includes the captions, transcripts, audio descriptions, or media alternatives required for its type and for whether it is live or prerecorded.
- **Required.** Content that appears on hover or focus is dismissible, hoverable, and persistent as WCAG requires.
- **Required.** Important status changes are announced to assistive technology without moving focus.
- **Required.** Navigation, repeated components, identification, and help stay consistent across a process unless the person initiates a change.

## Never

- Never block password managers or paste in an authentication field — instead allow both and offer an accessible method that does not depend on recalling or transcribing a password.
