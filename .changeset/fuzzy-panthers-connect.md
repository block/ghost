---
"@design-intelligence/ghost": minor
---

Accept `https:`, `mcp:`, `figma:`, and `github:` external material locators and annotated `{ locator, note }` declarations. This widens public material arrays from `string[]` to `GhostMaterial[]`; TypeScript consumers of `/core` and `/embed` can use `materialLocator()` or `normalizeMaterial()` to read either shape. Pull JSON now includes optional `note`, export audit JSON includes optional `access`, and external-material omission messages use the new locator terminology.
