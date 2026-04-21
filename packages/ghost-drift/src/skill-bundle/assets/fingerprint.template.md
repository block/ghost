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
  closestSystems:
    - known-system

# abstract design decisions
decisions:
  - dimension: color-strategy
    evidence:
      - "--color-primary: #000000"
  - dimension: spatial-system
    evidence:
      - "--space-4: 16px"

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
  shadowComplexity: none
  borderUsage: minimal

roles: []
---

# Character

2-4 sentences on the personality of this design language. This prose becomes `observation.summary` when parsed.

# Signature

- Distinctive trait 1.
- Distinctive trait 2.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. Implementation-agnostic: name the pattern, not the token.

### spatial-system

Prose rationale for the spatial-system decision.

# Fragments

- [embedding](embedding.md)
