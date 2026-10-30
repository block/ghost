---
for: "Making visual, interactive, motion, data, media, or document content accessible."
requires: [baseline.fundamentals.core]
---

## Usage

Accessibility follows the medium and the task. Automated checks are evidence, not proof; review keyboard operation, screen-reader output, magnification, reduced motion, and content where applicable. Real rendering can weaken information that appears clear in a source file.

## Rules

- Required: Meet every applicable Level A and Level AA success criterion in WCAG 2.2. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Native and document work meets the equivalent platform accessibility requirements. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Use native semantics before ARIA.
- Required: Regions, headings, lists, tables, and controls expose the same structure, relationships, and reading order that sighted people receive. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Controls expose their role, value, and state programmatically, including changes to state. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Provide a way to bypass repeated content. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Pages have descriptive titles, links have meaningful purposes, and headings and labels state clear topics. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Instructions do not rely only on position, shape, sound, or other sensory characteristics to explain what to do. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Text and its background reach at least 4.5:1 contrast, or 3:1 for large text under WCAG's definition. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Meaningful interface components, states, and graphical objects reach at least 3:1 against adjacent colors. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Test the lowest-contrast region behind text on gradients, imagery, and changing states.
- Required: Status, instruction, selection, and data meaning include a second cue alongside color, such as text, an icon with an accessible name, a pattern, or an equivalent table or summary. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Allow zoom; keep content and controls available when text is resized to 200% and when text spacing is overridden to WCAG values. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: A responsive view reflows to 320 CSS pixels wide without two-dimensional scrolling except where that scrolling is essential. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Content is not locked to one display orientation unless that orientation is essential. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: At narrow widths and with an on-screen keyboard open, fixed regions and overlays do not obscure content, focus, instructions, or essential actions. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Every action is reachable and operable by keyboard, without a trap and without a timing-dependent keystroke. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Focus follows a logical order. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Focus remains visible and is not fully hidden by author-created content. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Focus stays inside an active modal task. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Focus moves to newly opened interactive content where that is appropriate, and returns sensibly when the task closes. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: A single-character shortcut that can fire without a modifier can be turned off, remapped, or limited to focused controls. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Multipoint, path-based, dragging, and device-motion input are not required where a simpler control can produce the same result. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Actions do not fire on pointer-down where cancellation or reversal is needed. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: The accessible name of a control contains its visible label. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Targets meet WCAG 2.2's 24 by 24 CSS pixel minimum or an allowed spacing or essential-use exception. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Custom primary touch controls use at least a 44 by 44 CSS pixel hit area when no documented platform component supplies its own sizing.
- Required: Every control has a programmatic name. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Visible labels and instructions remain meaningful without visual context. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Critical information is not carried only in placeholder text. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Meaningful images and other non-text content have an equivalent alternative that communicates their purpose. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Purely decorative media has an empty alternative so assistive technology skips it. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: The page language is identified, as is any passage whose language changes. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Each input is associated with its label and with any format, requirement, or error guidance. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Errors are identified in text, a correction is suggested where it is known, and entered values are preserved. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Before a legal, financial, or data-changing commitment, people can review, correct, and confirm the submission. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: The same information is not requested twice in one process when it can be reused, unless the repetition is essential. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Authentication offers a method that does not depend on a cognitive test such as memorizing or transcribing a password. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Nonessential animation and transitions respect `prefers-reduced-motion: reduce` and offer a reduced alternative. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Motion triggered by device movement can be disabled. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Nothing flashes more than three times in one second above WCAG thresholds. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Moving, blinking, scrolling, auto-updating, and time-limited content is under the person's control unless the timing is essential, and a session warns before it expires where the standard requires it. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Media includes the captions, transcripts, audio descriptions, or media alternatives required for its type and for whether it is live or prerecorded. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Content that appears on hover or focus is dismissible, hoverable, and persistent as WCAG requires. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Important status changes are announced to assistive technology without moving focus. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.
- Required: Navigation, repeated components, identification, and help stay consistent across a process unless the person initiates a change. Reason: WCAG/platform accessibility; scope: the described medium, content, and task.

- Required: Essential text, glyphs, accents, punctuation, thin strokes, controls, and graphical information remain perceivable at actual output size and viewing distance. Preserve language-appropriate reading direction, distinguish adjacent text columns through adequate gutters, avoid destructive collisions, and keep translated content readable through reflow rather than shrinking it to preserve line breaks. Reason: access to essential information; scope: essential content in every applicable medium, including responsive and localized variants.
- Do not round a failing contrast ratio upward; repeat contrast testing after responsive cropping, image edits, and color conversion. Under WCAG, large text means at least 18 pt regular or 14 pt bold, or the equivalent rendered size.
- Check that hierarchy and essential categories, states, and actions remain understandable in grayscale; use color-vision simulations as additional evidence. A numeric contrast pass alone does not prove legibility of thin, condensed, reverse, or small type, or essential chart boundaries.

## Never

- Required: Never block password managers or paste in an authentication field — instead allow both and offer an accessible method that does not depend on recalling or transcribing a password. Reason: accessible authentication; scope: authentication fields.
