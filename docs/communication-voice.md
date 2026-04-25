# Communication Voice: A New Fingerprint Domain

Ghost captures visual brand identity — palette, spacing, typography, surfaces. But brand fidelity extends beyond pixels. A brand's **voice** — how it writes, what it refuses to say, the posture it takes in high-stakes moments — drifts the same way colors and spacing do. Faster, actually, because copy has fewer guardrails than design tokens.

This document proposes extending the fingerprint format to support **communication voice** as a first-class domain, parallel to visual.

---

## Why communication voice drifts

Visual drift happens when a developer uses `#3b82f6` instead of `var(--brand-500)`. Communication drift happens when:

- Generated copy sounds too formal for a casual brand (or too casual for a clinical one)
- Action-first brands bury the CTA in paragraph three
- Empathy-forward brands skip straight to instructions
- Copy includes language the brand explicitly avoids
- Tone shifts abruptly between contexts that should feel coherent

In an agent-authored world, communication drift is the bigger risk. An agent generating a notification, error message, or enforcement action email has no instinct for brand — only what the prompt tells it. If the prompt doesn't encode voice, the output regresses to generic.

Ghost's architecture already handles this. The fingerprint is a contract. The review recipe detects drift. The verify recipe iterates. The remediation verbs record intent. The only thing missing is the dimension set.

---

## Communication dimensions

Visual has four dimension blocks: `palette`, `spacing`, `typography`, `surfaces`. Communication has four parallel blocks:

### `tone`

Captures the brand's voice attributes as a structured scale.

```yaml
tone:
  formality: 0.3       # 0 = casual, 1 = formal
  directness: 0.8      # 0 = hedging, 1 = blunt
  warmth: 0.6          # 0 = clinical, 1 = personal
  agency: 0.7          # 0 = prescriptive, 1 = empowering
  urgency: 0.4         # 0 = relaxed, 1 = pressing
```

Each value is a 0–1 float. The agent uses these as grounding — "this brand lives at 0.8 directness, so lead with the action, don't build up to it."

**Drift signal:** generated copy that reads at 0.2 directness when the fingerprint says 0.8.

### `structure`

Captures composition norms — how the brand arranges information.

```yaml
structure:
  sentenceLengthNorm: short    # short | medium | long
  paragraphDensity: tight      # tight | normal | spacious
  ctaPlacement: top            # top | bottom | inline
  informationOrder: action-first  # action-first | context-first | empathy-first
  listStyle: bullets           # bullets | numbered | prose | none
```

**Drift signal:** copy that buries the CTA when the fingerprint says `ctaPlacement: top`.

### `register`

Captures language level and vocabulary norms.

```yaml
register:
  readingLevel: 8              # Flesch-Kincaid grade level target
  jargonTolerance: low         # none | low | moderate | domain-native
  contractions: yes            # yes | no | contextual
  pronouns: second-person      # first-person | second-person | third-person | brand-name
  sentenceVoice: active        # active | passive | mixed
```

**Drift signal:** copy at grade 14 when the fingerprint says grade 8. Jargon where the fingerprint says `none`.

### `boundaries`

Captures what the brand refuses to say — the exclusion set.

```yaml
boundaries:
  excluded:
    - pattern: "we're sorry to inform you"
      reason: "passive, distances the brand from the action"
    - pattern: "unfortunately"
      reason: "hedging word, undermines directness"
    - pattern: "per our policy"
      reason: "bureaucratic, not human"
  required:
    - pattern: "here's what to do next"
      context: "any action-required communication"
    - pattern: "contact us"
      context: "any adverse action"
  constraints:
    - id: "no-shame"
      rule: "never imply the recipient caused the problem"
    - id: "action-first"
      rule: "lead with what the recipient can do, not what happened"
```

**Drift signal:** generated copy that includes an excluded phrase or omits a required element.

---

## The partition (same rule as visual)

Communication dimensions follow the same partition as visual:

| Fingerprint field | Lives in | Section / key |
|---|---|---|
| `tone`, `structure`, `register`, `boundaries` | Frontmatter | top-level |
| `observation.personality`, `observation.voiceArchetypes` | Frontmatter | `observation:` |
| `observation.summary` | Body | `# Character` |
| `observation.distinctiveTraits` | Body | `# Signature` bullets |
| `decisions[].dimension`, `decisions[].embedding` | Frontmatter | `decisions:` entry |
| `decisions[].decision` (prose rationale) | Body | `### dimension` block |

No duplication. Prose in frontmatter is a lint error. Structured data in the body is a lint error.

---

## Domain detection

A fingerprint can be:
- **Visual-only:** has `palette`, `spacing`, `typography`, `surfaces`. No `tone`.
- **Communication-only:** has `tone`, `structure`, `register`, `boundaries`. No `palette`.
- **Both:** has all eight blocks. A full brand fingerprint.

`ghost-drift lint` validates whichever dimensions are present. `ghost-drift compare` computes distance over the dimensions both fingerprints share.

---

## Embedding

Visual fingerprints use a 49-dimensional vector (palette 0–20, spacing 21–30, typography 31–40, surfaces 41–48). Communication fingerprints use a parallel vector:

| Dimensions | Category | What it captures |
|---|---|---|
| 0–4 | Tone | formality, directness, warmth, agency, urgency |
| 5–9 | Structure | sentence length, paragraph density, CTA placement, information order, list style |
| 10–14 | Register | reading level, jargon tolerance, contractions, pronouns, sentence voice |
| 15–19 | Boundaries | exclusion count, required count, constraint count, specificity, coverage |

20 dimensions. Combined visual+comms fingerprints have 69 dimensions.

---

## Recipes

Two new skill recipes extend the existing set:

- **`comms-review`** — scan generated copy for voice drift against the fingerprint. Same flow as `review.md` but checks tone/structure/register/boundaries instead of palette/spacing/typography/surfaces.
- **`comms-verify`** — generate → comms-review → iterate loop for copy generation. Same flow as `verify.md`.

The existing `profile`, `compare`, `discover` recipes work unchanged — they read whichever dimensions are present.

---

## What this enables

- Any team can write a `fingerprint.md` for their brand's voice
- Any agent can author copy against it
- Drift gets caught at generation time, not after it ships
- Cross-brand comparison shows where voices diverge (intentionally or not)
- The same `ack/adopt/diverge` remediation works for voice decisions

Visual is the first domain. Communication is the second. The format and the detection architecture are domain-agnostic — this is the proof.
