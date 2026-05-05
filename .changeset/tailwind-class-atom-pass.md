---
"ghost-expression": minor
---

survey.md now requires a Tailwind class-atom pass for Tailwind targets — class atoms (`p-2`, `bg-orange-500`) get resolved to literals and recorded as survey rows alongside declared `@theme` tokens. Without it, surveys undercount the rendered spacing/typography/color scale because Tailwind synthesizes most of it from `--spacing` / `--text-*` / `--color-*` rather than declaring each step.
