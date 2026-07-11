---
description: "Gather for any text, and for heroes, landing pages, and editorial moments. The type dial: one voice typeface plus a mono for machine detail, with an editorial heading scale kept separate from product text — this brand's current answer is HK Grotesk."
materials:
  - materials/tokens.css
  - materials/fonts/*.woff2
---

This is Vessel's answer to type — it stands until you replace it.

The relationship is fixed: one typeface is the voice of the interface,
everywhere, with a mono variant only for code, tool detail, and machine
output. The heading scale is editorial — its tokens exist for pages composed
outside the text variants — and product UI never mixes the two vocabularies
in one view.

Vessel's current answer: HK Grotesk. vessel-light ships it as its embedded
voice — here, `tokens.css` is canonical.

The heading scale is editorial: display, section, and sub each carry their
own rhythm (`--heading-display-*`, `--heading-section-*`, `--heading-sub-*`).
Display sizes use tight tracking and sub-1 line heights because the words
behave like composition, not paragraph text. Card-level headings inside
editorial features use the product `title` variant — the scale does not reach
below sub.

Labels are small, semibold, and tracked wide. They should feel precise, never
loud. Body text keeps the established reading sizes with relaxed line height;
do not shrink important prose until it becomes legal copy.

Condition: display and section scale are for editorial or hero moments.
Product UI lives in headline, title, body, label, and mono. A modal title is
not a poster. When in doubt, make type quieter and layout clearer.

To adapt: swap the font files, edit `--font-sans`, `--font-mono`, and the
heading tokens in `materials/tokens.css`, and restate this node's current
answer. The one-voice rule and the editorial/product vocabulary split are the
parts worth keeping.
