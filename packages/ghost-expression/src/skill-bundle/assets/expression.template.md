---
# identity
id: PROJECT_ID
source: llm
timestamp: TIMESTAMP_ISO

# narrative tags (prose lives in the body)
observation:
  personality:
    - adjective-1
    - adjective-2
  resembles:
    - known-system

# abstract design decisions
decisions:
  - dimension: color-strategy
  - dimension: spatial-system

# concrete tokens
palette:
  dominant:
    - { role: primary, value: "#000000" }
  neutrals:
    steps: ["#ffffff", "#0a0a0a"]
    count: 2
  semantic: []
  saturationProfile: muted
  contrast: high

spacing:
  scale: [4, 8, 16, 24, 32]
  regularity: 1.0
  baseUnit: 4

typography:
  families: ["Inter"]
  sizeRamp: [14, 16, 20, 24, 32]
  weightDistribution: { "400": 1, "700": 1 }
  lineHeightPattern: normal

surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

2-4 sentences on the personality of this design language. This prose becomes `observation.summary` when parsed.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. Implementation-agnostic: name the pattern, not the token.

**Evidence:**
- `--color-primary: #000000`

### spatial-system

Prose rationale for the spatial-system decision.

**Evidence:**
- `--space-4: 16px`

# Fragments

- [embedding](embedding.md)
