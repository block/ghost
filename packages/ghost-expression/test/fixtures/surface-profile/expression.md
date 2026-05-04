---
id: surface-profile-fixture
source: llm
timestamp: 2026-05-04T00:00:00Z
references:
  specs: [packages/ghost-expression/test/fixtures/surface-profile/survey.json]
  components: [src/components/MetricCard.tsx, src/components/StatusTimeline.tsx]
  examples: [src/routes/dashboard.tsx]
observation:
  personality: [dense, operational, direct]
  resembles: [linear]
decisions:
  - dimension: composition-patterns
palette:
  dominant:
    - { role: foreground, value: "#111827" }
  neutrals:
    steps: ["#ffffff", "#111827"]
    count: 2
  semantic: []
  saturationProfile: muted
  contrast: high
spacing:
  scale: [4, 8, 12, 16, 24]
  baseUnit: 4
  regularity: 0.92
typography:
  families: [Inter]
  sizeRamp: [12, 14, 16, 20, 24]
  weightDistribution: { "400": 3, "600": 2 }
  lineHeightPattern: tight
surfaces:
  borderRadii: [6, 8]
  shadowComplexity: deliberate-none
  borderUsage: moderate
---

# Character

Dense, operational, and direct. The language favors clear foreground contrast and compact status reading over decorative atmosphere.

# Signature

The strongest implemented surface is a tracker-style dashboard: metric strips, status timelines, and dense tables combine into a single operational view. Generated output should preserve that task-shaped composition instead of flattening every answer into equal cards.

# Decisions

### composition-patterns

Choose tracker and control-surface layouts when the task is about status, progress, or operational review. Cards are allowed for repeated metric peers, but the overall composition should keep summary, timeline, and tabular detail in distinct zones.

**Evidence:**
- `survey.ui_surfaces[0]` classifies `src/routes/dashboard.tsx` as a compressed `tracker`
- Surface signals record `metric strip above timeline` and `dense table paired with persistent status summary`
- `src/components/MetricCard.tsx` appears as a repeated peer element, not the whole page shape
