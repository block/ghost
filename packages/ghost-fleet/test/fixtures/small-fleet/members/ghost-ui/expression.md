---
id: ghost-ui
source: llm
timestamp: 2026-04-25T00:00:00Z
observation:
  personality:
    - monochromatic
    - editorial
    - restrained
  resembles:
    - Vercel Geist
    - Linear
decisions:
  - dimension: color-strategy
  - dimension: shape-language
palette:
  dominant:
    - { role: primary, value: "#1a1a1a" }
    - { role: background, value: "#ffffff" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#e8e8e8", "#999999", "#1a1a1a"]
    count: 5
  semantic: []
  saturationProfile: muted
  contrast: high
spacing:
  scale: [4, 8, 12, 16, 24, 32]
  regularity: 0.95
  baseUnit: 4
typography:
  families: ["system-ui"]
  sizeRamp: [12, 14, 16, 20, 24, 32]
  weightDistribution: { "400": 1, "600": 1, "700": 1 }
  lineHeightPattern: tight
surfaces:
  borderRadii: [10, 14, 999]
  shadowComplexity: layered
  borderUsage: moderate
---

# Character

A monochromatic editorial language — color is reserved for state, the
default surface stays achromatic. Type runs tight; pill-shaped controls
contrast moderately rounded containers.

# Decisions

### color-strategy

Treat hue as opt-in communication. The default theme is pure achromatic.

### shape-language

Pill-first for actionable controls; moderate radii for structural surfaces.
