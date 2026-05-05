---
name: market
description: Use this skill to generate UI in the market design language (Monochromatic by default: `core.emphasis-fill` ships as `#101010` light / `#FFFFFF` dark even though the source aliases it to `core.blue-fill` — chromatic identity is opt-in via theme overlays, not a base-system trait., A full chromatic palette is defined and reserved: green / forest / teal / blue / sky / purple / pink / burgundy / red / orange / gold / yellow / taupe / brown each ship as a 6-step set (fill, text, 10, 20, 30, 40) but the base system only consumes them through semantic aliases (`success`, `warning`, `critical`, `emphasis`)., A 17-step grayscale ramp from `#FFFFFF` to `#000000` (with a separate `core.constant.gray-*` track) carries most of the visual weight — surfaces, dividers, fills, and text are all neutrals first.). Contains the canonical expression and token reference.
user-invocable: true
---

This skill grounds UI generation in the **market** design language.

Read `expression.md` first — it is the source of truth. It has four layered sections:

1. **Character** — what this expression is (one-paragraph summary)
2. **Signature** — what makes it distinctive (bullet list of traits)
3. **Decisions** — specific design choices with evidence from the source
4. **Values** — hard Do / Don't rules

When generating UI in this language:

- Treat **Values** as non-negotiable gates — never violate a Don't.
- Use **Decisions** as the lookup for specific choices (spacing scale, type ramp, radii).
- Let **Character** and **Signature** shape overall feel, density, and voice.
- Prefer tokens from the YAML frontmatter (palette, spacing, typography, surfaces) over arbitrary values.

## Files

- `expression.md` — canonical design language (YAML tokens + Character/Signature/Decisions/Values)
- `tokens.css` — CSS custom properties derived from expression tokens
