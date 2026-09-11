export const guidanceExamples = [
  {
    label: "visual decision",
    path: "pattern.crop-with-intent.md",
    body: `---
for: Photography. Gather when a composition uses a photo.
materials:
  - brand/photography/portrait.jpg
---

# Crop with intent

Crop around one clear subject. Let the subject meet at least one edge.

Reject cautious full-object framing and collages that avoid choosing a focal point.`,
    palette: [],
  },
  {
    label: "product pattern",
    path: "condition.blocked-progress.md",
    body: `---
for: Blocked progress. Gather when someone cannot continue a task.
materials:
  - src/components/error-state/index.tsx
---

# Keep a path forward

Keep the explanation and one next action together.

If the person cannot resolve the problem, state what happens next. Do not end on a disabled control.`,
    palette: [],
  },
  {
    label: "exact material",
    path: "asset.color-roles.md",
    body: `---
for: Exact color roles and values. Gather before assigning color.
materials:
  - src/styles/brand-tokens.css
---

# Color roles

Ink carries content. Signal marks selection. Correction marks review.

\`\`\`css
--ink: #171714;
--signal: #e8df55;
--correction: #c83e36;
\`\`\``,
    palette: [
      ["ink", "#171714"],
      ["signal", "#e8df55"],
      ["correction", "#c83e36"],
    ],
  },
] as const;
