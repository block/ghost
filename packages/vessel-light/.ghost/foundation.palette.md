---
for: Color beyond the base roles, in any register.
materials:
  - materials/tokens.css
---

## Usage

This is Vessel's answer to palette — it stands until you replace it.

The relationship is fixed: one brand at different volumes. A monochrome spine
is the default atmosphere in every medium — calm, legible, and resistant to
novelty — and a closed expression set supplies the atmosphere, with volume
set by context, never by taste.

Expressive color outside the closed set is not expression; it is another
brand. An invented hue is not a bolder Vessel; it is a different brand.

Loudness comes from commitment to few colors at scale, not variety.

To adapt: edit the `--expression-*` values (and the gray ramp, if the spine
changes) in `materials/tokens.css` and restate this node's current answer.
The ladder — a quiet spine, a closed hue set, context-gated volume — is the
part worth keeping.

## Rules

- The base palette is monochrome gray.
- The expression palette is five named hues and only these — amber
  (`--expression-1`), periwinkle (`--expression-2`), clay
  (`--expression-3`), orchid (`--expression-4`), sage (`--expression-5`).
- Product UI: expression lives only in data visualization. A chart may use
  the hues; the interface around it stays monochrome.
- Data-dense consoles: one hue family may mark status. Nothing atmospheric.
  Charts inside a console keep the product carve-out — hues stay inside the
  plot area and never leak into rows, badges, or headers.
- Email: exactly one expressive moment per message — a header band or the
  figure that matters. One hue, quiet everywhere else.
- Editorial: expression is sanctioned atmosphere — a tinted dark section, a
  colored pull-quote accent, a duotone moment. Never more than two hues per
  page.
- Two constants that outrank the ladder: expression never touches what you
  click — buttons, inputs, and links stay monochrome in every context — and
  the status roles are not expression; they keep their meanings everywhere.

## Never

- Never use expressive color outside the five named hues — an invented hue
  is not a bolder Vessel; it is a different brand; instead stay inside the
  `--expression-*` set at the context's sanctioned volume.
- Never put expression on what you click — instead keep buttons, inputs, and
  links monochrome in every context.
- Never let the status roles moonlight as atmosphere — they are not
  expression; instead keep their meanings everywhere and draw atmosphere
  from the expression set.
- Never set expression volume by taste — instead set it by context, per the
  ladder above.
