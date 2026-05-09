---
extends: ../profile.md
id: cash-web-accounts
palette:
  dominant:
    - { role: primary, value: "#00b894" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#1a1a1a"]
    count: 3
  semantic: []
  saturationProfile: vibrant
  contrast: high
decisions:
  - dimension: color-strategy
---

# Decisions

### color-strategy

Account management softens the inherited green into a calmer teal accent for
settings and profile surfaces.

**Evidence:**
- `#00b894` appears as the local account accent in `src/accounts`.
