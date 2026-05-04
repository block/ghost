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

# decision index: rationale and evidence live in matching body blocks
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

2-4 sentences on the personality of this design language. This prose becomes `observation.summary` when parsed. Describe the language directly instead of introducing the project by name. Name what the system permits, not only what it avoids: scale contrast, shaped composition, semantic color, role-based elevation, functional motion, font sourcing, or themeable tokens.

# Signature

2-4 sentences on the final-picture posture: dominant moves, layout habits, and what generated output should feel like when the language comes together.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. Implementation-agnostic: name the pattern, not the token.

**Evidence:**
- `--color-primary: #000000`
- Survey color evidence: dominant observations cluster on the neutral palette

### spatial-system

Prose rationale for the spatial-system decision.

**Evidence:**
- `--space-4: 16px`
- Survey spacing evidence: padding/gap/margin observations stay on the documented scale

# Fragments

- [embedding](embedding.md)
