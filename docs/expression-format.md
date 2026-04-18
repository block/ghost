# The `.expression.md` format

A Ghost **expression** is a single Markdown file that captures what a design system is trying to say. It replaces the opaque `.ghost-fingerprint.json` with something humans can read and edit, and something LLMs can consume natively — while preserving a structured machine layer for `ghost compare`, `ghost review`, and `ghost fleet`.

The file has two parts:

1. **Frontmatter (YAML)** — the machine layer. Vectors, tokens-as-data, provenance. This is what deterministic tools read. Must be stable and diff-friendly.
2. **Body (Markdown)** — the three-layer model in prose. Observation, Decisions, Values. This is what LLMs and humans read. Sections are optional; omit what the system has no opinion on.

Filename convention: `<slug>.expression.md`. The zero-config default for `ghost review` is `./.expression.md`.

---

## Frontmatter schema

```yaml
---
# --- identity ---
name: Claude                      # display name
slug: claude                      # kebab-case id, used for filenames & comparisons
schema: 1                         # format version (bump on breaking changes)
generated: 2026-04-17T00:00:00Z   # ISO-8601, when this expression was written
generator: ghost@0.8.0            # tool + version that produced it

# --- provenance ---
# Sources the expression was inferred from. Multi-source allowed.
sources:
  - github:anthropics/claude-code
  - https://claude.ai
confidence: 0.87                  # 0–1, overall confidence in the inference

# --- values layer (deterministic) ---
# Mirrors DesignFingerprint's structured fields. This is what
# `ghost compare` vector-diffs, and what `ghost review` scans against.
palette:
  dominant:
    - { name: terracotta, hex: '#c96442', role: accent }
    - { name: parchment,  hex: '#f5f4ed', role: surface }
  neutrals:                        # warm→dark or cool→dark ramp
    - '#faf9f5'
    - '#e8e6dc'
    - '#87867f'
    - '#5e5d59'
    - '#4d4c48'
    - '#141413'
  semantic:
    - { name: error,  hex: '#b53333', role: error }
    - { name: focus,  hex: '#3898ec', role: focus }
  saturation: muted                # muted | vibrant | mixed
  contrast:   moderate             # high | moderate | low
  temperature: warm                # warm | cool | neutral   (new; was prose-only)

typography:
  families:
    - { name: 'Anthropic Serif', fallback: Georgia, role: headline }
    - { name: 'Anthropic Sans',  fallback: Inter,   role: body }
    - { name: 'Anthropic Mono',  fallback: ui-monospace, role: code }
  scale:   [9.6, 12, 14, 15, 16, 17, 20, 25.6, 32, 36, 52, 64]
  weights: { 400: 0.6, 500: 0.4 }  # distribution across observed usage
  line-height: loose               # tight | normal | loose

spacing:
  scale:      [3, 4, 6, 8, 10, 12, 16, 20, 24, 30]
  base-unit:  8                    # null if no coherent base
  regularity: 0.85                 # 0–1, how gridded the scale is

surfaces:
  radii:   [4, 6, 8, 12, 16, 24, 32]
  shadow:  subtle                  # none | subtle | layered
  borders: moderate                # minimal | moderate | heavy

# --- vector layer ---
# 64-dim embedding used by `ghost compare`, `ghost fleet`, `ghost viz`.
# YAML allows long arrays; writers may wrap.
embedding: [0.12, -0.44, 0.33, /* … 64 floats … */]
---
```

**Required:** `name`, `slug`, `schema`, `generated`, `palette`, `typography`, `spacing`, `surfaces`, `embedding`.
**Optional:** `sources`, `confidence`, `generator`. Omit rather than lie — missing confidence is truer than fabricated 1.0.

---

## Body schema

Six sections, all optional except `# Character`. Order is fixed (so diffs line up), but an expression may skip any section the system has no opinion on — no filler.

### 1. `# Character` *(required, ~2 paragraphs)*

The opening atmosphere read. Evocative, not technical. This is the sentence an agent quotes back when it's trying to stay on-brand.

Maps to `DesignObservation.summary`. Think "literary salon reimagined as a product page," not "modern, clean, accessible UI."

### 2. `# Signature` *(3–7 bullets)*

What makes *this* system unlike its peers. The drift-sensitive moves — changes here register as identity changes, not tweaks. Front-loaded because distinctiveness is Ghost's whole payload.

Maps to `DesignObservation.distinctiveTraits`. Each bullet is one phrase; expand inline only if non-obvious.

### 3. `# Observation`

Prose descriptions of each dimension, *paired with* the structured data in frontmatter. The frontmatter says the palette is warm; the prose says *what that feels like and why it matters*.

Subsections (all optional — skip what the system doesn't care about):

- `## Palette`
- `## Typography`
- `## Spacing & rhythm`
- `## Surfaces & depth`

This section may embed tables (e.g., the typography hierarchy). Tables are prose, not data — anything machines need belongs in frontmatter.

### 4. `# Decisions`

Abstract, implementation-agnostic choices. Each decision is a short `###` block with evidence. Mirrors `DesignDecision[]`.

Format per decision:

```markdown
### Warm-only neutrals
Every gray carries a yellow-brown undertone. No cool blue-grays exist in the system.
**Evidence:** `#5e5d59`, `#87867f`, `#4d4c48` — all warm-shifted; no `slate-*` or `zinc-*` present.
```

Why separate from Observation? Observation describes; Decision commits. A reader who wants the "rules" this system lives by reads only this section.

### 5. `# Values` *(Do / Don't)*

Stance, not inventory. What the system *refuses*. Often the sharpest drift signal — a system's identity is defined by what it would never do.

```markdown
## Do
- Use Parchment (`#f5f4ed`) as the primary light background
- Keep all neutrals warm-toned

## Don't
- Use cool blue-grays anywhere
- Mix sans-serif into headline slots
```

### 6. `# Prompt guide` *(optional)*

Pre-baked prompts that rehydrate the expression into new UI — turning the doc from *description* into *instrument*. Lifted straight from DESIGN.md's pattern; include only when the expression will be used for generation (not just comparison).

Contents: a "Quick reference" of highest-signal tokens, then 3–5 ready-to-use component prompts.

---

## What's deliberately excluded

- **Fixed section templates.** If there's no shadow philosophy, there's no `## Surfaces & depth` subsection. Don't force filler.
- **Everything-is-prose.** The machine layer stays in frontmatter so `ghost compare` / `ghost review` don't need an LLM to run.
- **Implementation details.** No framework names, no CSS-in-JS specifics, no component library assumptions in the body. Decisions are abstract ("warm-only neutrals"), not concrete ("`neutral-50` through `neutral-900` in `tailwind.config.js`").
- **Confidence theatre.** If the generator isn't sure, say so or omit the field.

---

## Annotated example (abridged)

```markdown
---
name: Claude
slug: claude
schema: 1
generated: 2026-04-17T00:00:00Z
generator: ghost@0.8.0
sources: [github:anthropics/claude-code, https://claude.ai]
confidence: 0.87

palette:
  dominant:
    - { name: terracotta, hex: '#c96442', role: accent }
    - { name: parchment,  hex: '#f5f4ed', role: surface }
  neutrals: ['#faf9f5','#e8e6dc','#87867f','#5e5d59','#4d4c48','#141413']
  semantic:
    - { name: error, hex: '#b53333', role: error }
    - { name: focus, hex: '#3898ec', role: focus }
  saturation: muted
  contrast: moderate
  temperature: warm

typography:
  families:
    - { name: 'Anthropic Serif', fallback: Georgia, role: headline }
    - { name: 'Anthropic Sans',  fallback: Inter,   role: body }
  scale: [12, 14, 15, 16, 17, 20, 25.6, 32, 52, 64]
  weights: { 400: 0.6, 500: 0.4 }
  line-height: loose

spacing:
  scale: [4, 8, 12, 16, 24, 32]
  base-unit: 8
  regularity: 0.85

surfaces:
  radii: [8, 12, 16, 32]
  shadow: subtle
  borders: moderate

embedding: [0.12, -0.44, 0.33 /* …64 floats… */]
---

# Character

A literary salon reimagined as a product page — warm, unhurried, and quietly
intellectual. The entire experience sits on a parchment-toned canvas that
evokes premium paper rather than a digital surface. Where most AI products
lean into cold futurism, Claude radiates human warmth, as if the AI itself
had good taste in interior design.

The signature move is a custom serif used at a single medium weight,
giving every heading the gravitas of a book title, paired with an
exclusively warm neutral ramp. No cool grays exist anywhere.

# Signature

- Warm ring-shadows instead of drop-shadows — borders disguised as depth
- Editorial serif/sans split: serif for authority, sans for utility
- Light/dark section alternation as page rhythm, chapter-like
- Organic hand-drawn illustrations in place of geometric tech iconography
- Terracotta as the single chromatic accent — every other hue is neutral

# Observation

## Palette

Every neutral carries a yellow-brown undertone. Backgrounds are warm cream,
not white; darks are olive-tinted, not slate. The only saturated hue is
terracotta, reserved for primary CTAs and signature moments.

## Typography

Headlines are serif at a single weight (500); UI is sans at 400–500. Body
line-heights are generous (1.60), closer to a novel than a dashboard.

# Decisions

### Warm-only neutrals
Every gray has a yellow-brown undertone. No cool blue-grays.
**Evidence:** `#5e5d59`, `#87867f`, `#4d4c48` — all warm-shifted.

### Serif for authority, sans for utility
Headlines use Anthropic Serif at weight 500 exclusively. UI text uses
Anthropic Sans. No cross-over.
**Evidence:** all H1–H4 serif 500; buttons, labels, nav sans 400–500.

### Ring-shadows instead of drops
Depth uses `0 0 0 1px` ring shadows in warm tones — borders disguised as
shadows. True drop-shadows appear only for elevated media, at 0.05 opacity.
**Evidence:** button/card focus states use ring patterns; no `box-shadow`
with meaningful y-offset on interactive chrome.

# Values

## Do
- Use Parchment (`#f5f4ed`) as the primary light background
- Keep all neutrals warm-toned
- Reserve terracotta for primary CTAs only
- Use generous body line-height (1.60)

## Don't
- Use cool blue-grays anywhere
- Apply bold (700+) to serif headlines
- Use pure white as a page background
- Use geometric/tech-style illustrations
```

---

## Migration

`DesignFingerprint` JSON and `.expression.md` carry the same payload. The writer:

1. Emits frontmatter from `palette`, `typography`, `spacing`, `surfaces`, `embedding`, plus provenance fields.
2. Emits `# Character` from `observation.summary`, `# Signature` from `observation.distinctiveTraits`.
3. Emits `# Decisions` from `decisions[]` — one `###` block per decision, evidence inlined.
4. Synthesizes `# Values` Do/Don'ts from the Decisions layer (LLM step; may be skipped for fast re-emission).

Parser guarantee: every `.expression.md` round-trips losslessly to `DesignFingerprint` via frontmatter alone. The body is additive — prose the machine layer can't hold.
