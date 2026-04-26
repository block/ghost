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

# abstract design decisions — one entry per ### block in the body, slugs must match
decisions:
  - dimension: "<dimension-slug>"
    evidence:
      - "<citation>"
  - dimension: "<dimension-slug>"
    evidence:
      - "<citation>"

# concrete tokens — values are platform-neutral magnitudes (web px ≈ iOS pt ≈ Android dp at 1×)
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
  shadowComplexity: none          # none | subtle | layered
  borderUsage: minimal            # minimal | moderate | heavy

# slot → token bindings. Required when the project has rendering surfaces.
# Use cross-platform archetype names (title-xl, body, button-primary, card),
# not platform-specific names (h1, LargeTitle, DisplayLarge).
roles: []
---

# Character

2–4 sentences on the personality of this design language, written from a visceral read of the rendered product — not from token files. Becomes `observation.summary` when parsed.

# Signature

- "<distinctive-trait>" instead of "<counter-trait>".
- "<distinctive-trait>" instead of "<counter-trait>".

# Decisions

### <dimension-slug>

State the pattern in visual / observable terms (not implementation mechanism). When possible, end with how a reviewer would spot a violation.

### <dimension-slug>

Same shape — pattern, then operationalization.

# Fragments

- [embedding](embedding.md)
