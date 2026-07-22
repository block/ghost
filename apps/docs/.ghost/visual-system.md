---
description: Global visual foundation for color, typography, spacing, shape, elevation, interaction, and accessibility.
materials:
  - apps/docs/src/styles/marked-doc.css
  - apps/docs/src/styles/docs.css
  - apps/docs/src/components/docs/docs-page-layout.tsx
  - apps/docs/src/components/docs/gather-demo.tsx
---

The docs site is the living source for these values. Preserve their roles when translating the expression to another medium. The docs-local roles override Vessel's type, color, radius, and shadow defaults; do not inherit those underlying defaults back into this expression.

## Color

| Role | Token | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| field | `--doc-bg` | `#FFFFFF` | `#121210` | primary background |
| ink | `--doc-text` | `#16150F` | `#E8E6DD` | text, strong borders, and active controls |
| annotation | `--doc-middle` | `#6F6D64` | `#A4A196` | captions, numbers, and secondary explanation |
| rule | `--doc-line` | `#D9D7CF` | `#3A3932` | hairlines, frames, and inactive control borders |
| mark | `--doc-mark` | `#F4E97B` | `#D8CC4F` | committed selection or active choice |
| soft mark | `--doc-mark-soft` | `#FAF5C8` | `#3A3722` | hover preview or selected field background |
| on mark | `--doc-on-mark` | `#16150F` | `#16150F` | text on the full mark |

Ink on the field is `18.29:1` in light mode and `15.00:1` in dark. Annotation on the field is `5.19:1` and `7.25:1`. On-mark text against the full mark is `14.62:1` in light mode and `11.03:1` in dark. Preserve at least WCAG AA contrast when adapting the roles.

Do not promote unused inherited semantic values into the brand palette. A token becomes part of this system when a rendered expression gives it an intentional role.

## Typography

Use `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace` for every role. Tracking remains normal unless literal material requires otherwise.

| Role | Size / line height | Weight | Treatment |
| --- | --- | --- | --- |
| product sign or page title | `24px / 32px` | `400` | lowercase, isolated at the opening, never a billboard |
| section title | `13px / 20px` | `700` | lowercase, paired with a muted number or annotation in the margin |
| body | `13px / 20px` | `400` | one narrow reading column, normally no wider than `54ch` |
| subhead | `13px / 20px` | `700` | lowercase, within the reading column with space above |
| annotation or caption | `13px / 20px` | `400` | muted and attached closely to what it explains |
| row key | `13px / 20px` | `700` | names the evidence in the adjacent value column |
| code, path, or literal value | `13px / 20px` | role-dependent | remains in the mono register rather than becoming a separate visual genre |

The body does not become secondary through low contrast. Annotation is muted but readable. Bold is structural punctuation, not general emphasis. When stronger hierarchy is needed, first change position, measure, whitespace, weight, or rule placement. Increase type scale only after those moves fail.

## Composition and spacing

| Role | Reference value | Behavior |
| --- | --- | --- |
| minimum viewport | `320px` | preserve legibility and horizontal containment at and above this width |
| page opening | `4rem` | space from the viewport top to the product sign |
| horizontal inset | `2ch`; `4ch` from `40rem` | follows the monospace rhythm |
| prose measure | `54ch` maximum | keeps the main argument narrow even when more width exists |
| label column | `9rem`; `12rem` from `64rem` | becomes the left marginal column on wide screens |
| section content column | `27rem`; `36rem` from `64rem` | carries prose and ordinary figures |
| label/content gap | `2rem` | separates marginal orientation from the reading path |
| major section padding | `3rem` vertical | gives each numbered step its own field |
| paragraph stack | `1rem` | maintains a compact but readable prose rhythm |
| ordinary figure margin | `2rem` vertical | separates evidence from the surrounding argument |

At `64rem` and above, labels occupy the left column and may remain sticky while the adjacent content scrolls. Below that point, labels return to normal flow above the content. Rich material may exceed the content column only when the additional width improves inspection; responsive collapse should happen when the content no longer sustains simultaneous columns, not to satisfy a generic device taxonomy.

Use character units where spacing should follow the mono rhythm and rem units where spacing describes the larger composition.

## Shape and elevation

Page structure and internal divisions remain square. Cards and self-contained controls use a `12px` radius, or `14px` with `corner-shape: squircle` where supported. All inherited radius roles outside this explicit squircle are reset to `0` and all shadows to `none`. Rules are `1px`.

The squircle is the card silhouette. Do not mix it with pill cards, floating tiles, tonal lift, nested shells, or competing radius families.

## Control states

The prompt control is the reference state model for selectable controls.

| State | Border | Text | Background |
| --- | --- | --- | --- |
| default | rule | ink | transparent |
| hover or choice preview | ink | ink | soft mark |
| pressed or selected | ink | on mark | full mark |
| focus-visible | retain current state, then add a `1px` current-color outline with `2px` offset | unchanged | unchanged |
| disabled, error, destructive | `TBD` | `TBD` | `TBD` |

Do not invent unspecified states from Vessel defaults. When a new state is needed, design and ratify it before adding it to the closed set.

## Accessibility

- Selection uses on-mark text against the full mark.
- State is never communicated by color alone. Selected and skipped rows also carry explicit text.
- Toggle-like choices expose pressed state semantically; changing result regions announce updates without interrupting the reader.
- Focus remains visible on every background and stacks over hover or selected state rather than replacing it.
- Under reduced-motion preference, CSS transitions collapse and sequential reveals present their final state immediately.

**Do:** distinguish title, section, state, and evidence through composition and semantic roles.

**Don't:** introduce a display serif, giant headline, uppercase kicker, gradient text, shadow hierarchy, or undocumented state color to manufacture distinction.
