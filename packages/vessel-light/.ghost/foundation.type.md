---
description: HK Grotesk type scale — gather for any text, and for heroes, landing pages, and editorial moments where the display and section tiers apply.
materials:
  - materials/tokens.css
  - materials/fonts/*.woff2
---

HK Grotesk is the voice of the interface. Use it everywhere unless a mono variant is required for code, tool detail, or machine output. vessel-light ships HK Grotesk as its embedded voice; the React package currently falls back to system-ui. This fingerprint is the intended future — here, `tokens.css` is canonical.

The heading scale is editorial: display, section, sub, and card each carry their own rhythm. Display sizes use tight tracking and sub-1 line heights because the words behave like composition, not paragraph text.

The heading tokens (`--heading-section-*`, `--heading-sub-*`, `--heading-card-*`) exist for editorial pages composed outside the text primitive. Product UI uses only the six text variants: display, headline, title, body, label, mono. Do not mix the two vocabularies in one view.

Do not fake hierarchy with arbitrary font sizes. Choose the tier that matches the job, then use tone, weight, and spacing for the rest.

Labels are small, semibold, and tracked wide. They mark structure: category tags, field labels, bylines, metadata, and compact status. They should feel precise, never loud.

Body text is for reading and interface explanation. Keep it in the established reading sizes with relaxed line height; do not shrink important prose until it becomes legal copy.

Condition: display and section scale are for editorial or hero moments. Product UI lives in headline, title, body, label, and mono. A modal title is not a poster.

When in doubt, make type quieter and layout clearer.
