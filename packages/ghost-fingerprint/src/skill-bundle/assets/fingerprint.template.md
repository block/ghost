---
# identity
id: PROJECT_ID
source: extraction              # registry | extraction | llm | unknown
timestamp: TIMESTAMP_ISO

# narrative tags (prose lives in the body)
observation:
  personality:
    - "<adjective>"
    - "<adjective>"
    - "<adjective>"
    - "<adjective>"
  resembles:
    - "<known-system>"

# decision index: rationale and evidence live in matching body blocks
decisions:
  - dimension: "<dimension-slug>"
  - dimension: "<dimension-slug>"

# concrete tokens - values are platform-neutral magnitudes (web px / iOS pt / Android dp at 1x)
palette:
  dominant:
    - { role: "<role>", value: "#000000" }
  neutrals:
    steps: ["#ffffff", "#0a0a0a"]
    count: 2
  semantic: []
  saturationProfile: muted        # muted | vibrant | mixed
  contrast: high                  # high | moderate | low

spacing:
  scale: [4, 8, 16, 24, 32]
  regularity: 1.0
  baseUnit: 4

typography:
  families: ["<family>"]
  sizeRamp: [14, 16, 20, 24, 32]
  weightDistribution: { "400": 1, "700": 1 }
  lineHeightPattern: normal       # tight | normal | loose

surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none # deliberate-none | subtle | layered
  borderUsage: minimal              # minimal | moderate | heavy

# slot -> token bindings. Required when the project has rendering surfaces.
# Use cross-platform archetype names (title-xl, body, button-primary, card),
# not platform-specific names (h1, LargeTitle, DisplayLarge).
roles: []
---

# Character

2-4 sentences on the personality of this design language, grounded in rendered evidence and survey-backed surfaces, not token files alone. Describe the language directly instead of introducing the project by name. Name what the system permits, not only what it avoids: scale contrast, shaped composition, semantic color, role-based elevation, functional motion, font sourcing, or themeable tokens.

# Signature

2-4 sentences on the final-picture posture: dominant moves, layout habits, and what generated output should feel like when the language comes together. When a contrast is load-bearing, phrase it as what the language does instead of what it refuses.

# Decisions

### <dimension-slug>

State the pattern in visual / observable terms (not implementation mechanism). When possible, end with how a reviewer would spot a violation.

**Evidence:**
- "<survey-backed citation>"

### <dimension-slug>

Same shape: pattern, then operationalization.

**Evidence:**
- "<survey-backed citation>"
