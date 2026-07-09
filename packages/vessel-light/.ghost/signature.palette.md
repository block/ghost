---
description: "Gather whenever color beyond the base roles is in question, in any register. The palette dial: a monochrome spine plus a closed expression set whose volume rises with the register — this brand's current answer is gray plus five named hues."
materials:
  - materials/tokens.css
---

This is Vessel's answer to palette — it stands until you replace it.

The relationship is fixed: one brand at different volumes. A monochrome spine
is the default atmosphere in every medium — calm, legible, and resistant to
novelty — and a closed expression set supplies the atmosphere, with volume
set by register, never by taste.

Vessel's current answer: the base palette is monochrome gray, and the
expression palette is five named hues and only these — amber
(`--expression-1`), periwinkle (`--expression-2`), clay (`--expression-3`),
orchid (`--expression-4`), sage (`--expression-5`). Expressive color outside
this set is not expression; it is another brand. An invented hue is not a
bolder Vessel; it is a different brand.

The volume ladder, by register:

Product UI: expression lives only in data visualization. A chart may use the
hues; the interface around it stays monochrome.

Data-dense consoles: one hue family may mark status. Nothing atmospheric.
Charts inside a console keep the product carve-out — hues stay inside the
plot area and never leak into rows, badges, or headers.

Email: exactly one expressive moment per message — a header band or the
figure that matters. One hue, quiet everywhere else.

Editorial: expression is sanctioned atmosphere — a tinted dark section, a
colored pull-quote accent, a duotone moment. Never more than two hues per
page. Loudness comes from commitment to few colors at scale, not variety.

Two constants that outrank the ladder: expression never touches what you
click — buttons, inputs, and links stay monochrome in every register — and
the status roles are not expression; they keep their meanings everywhere and
never moonlight as atmosphere.

To adapt: edit the `--expression-*` values (and the gray ramp, if the spine
changes) in `materials/tokens.css` and restate this node's current answer.
The ladder — a quiet spine, a closed hue set, register-gated volume — is the
part worth keeping.
