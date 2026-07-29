---
"@design-intelligence/ghost": minor
---

Accept `https:`, `mcp:`, `figma:`, and `github:` external material locators and annotated `{ locator, note }` declarations. This widens public material arrays from `string[]` to `GhostMaterial[]`; TypeScript consumers of `/core` and `/embed` can use `materialLocator()` or `normalizeMaterial()` to read either shape, and `externalLocatorScheme()` to read an external locator's scheme. Pull JSON now includes optional `note`, export audit JSON includes optional `access`, the export audit names the external provider (for example `mcp`, `figma`, or `github`), and external-material omission messages use the new locator terminology.
