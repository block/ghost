---
for: "Creating or reviewing HTML email across inboxes, email clients, appearance modes, and mobile."
requires: [baseline.fundamentals.core, baseline.fundamentals.typesetting, baseline.fundamentals.accessibility, baseline.fundamentals.craft, baseline.fundamentals.content-integrity]
---

## Usage

Email clients can strip stylesheets, ignore modern layout, invert colors, and block images. Design the degraded render first and treat capable clients as an enhancement; judge mobile before desktop.

## Rules

- Use presentation tables and inline styles for the email structure; keep flexbox, grid, and external stylesheets optional enhancements.
- Put the hidden preheader first in the body; coordinate subject, preheader, and in-email heading without repeating the same wording.
- Make the subject and first sentence name the recipient’s gain, action, or consequence.
- Use one CTA identity per email; in a long email, repeat that same action after the explanation.
- Keep the CTA operable across clients, using a padded table cell or link with an Outlook MSO/VML fallback where needed.
- Lead with the documented brand font, then a full web-safe fallback stack whose available weights preserve the heading/body hierarchy.
- Give hosted images explicit column widths and their table cells background-color fallbacks; combine product-on-photo composites into one image rather than depending on CSS background images in Outlook.
- Declare light and dark appearance modes with color-scheme and supported-color-schemes; use prefers-color-scheme styles to preserve documented surfaces and text instead of relying on client inversion.
- Preserve the email hierarchy and CTA when the content column reflows to mobile width.

## Never

- Never make the email depend on a stylesheet or modern web layout surviving the client — instead keep the message and action usable in the table-based, inline-styled render.
