---
name: arcade
description: Use this skill to generate UI in the arcade design language (Cash Green (`#00D64F` / `#00BD46`) is reserved as accent and surface, never as the default fill of a primary button — `prominent.background = semantic.background.inverse`, so heroes are pure black/white., A "mono" appearance is a parallel reality: every brand reference has a `lightMono` / `darkMono` override that strips green to grey, generated as separate output (`colors-mono.ts`, `ArcadeColorMapping+LightMono.swift`) — accessibility/preference is a build target, not a runtime fork., Single typeface (`CashSans`, plus `CashSansMono` for micro-labels), carried by Square's CDN; every typography token also declares its `dynamic-type-style-uikit` and `dynamic-type-style-swiftui` mapping — type is bonded to platform a11y rails.). Contains the canonical expression and token reference.
user-invocable: true
---

This skill grounds UI generation in the **arcade** design language.

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
