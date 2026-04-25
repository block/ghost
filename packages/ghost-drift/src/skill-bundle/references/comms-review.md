---
name: comms-review
description: Flag generated or drafted copy that drifts from the communication voice in fingerprint.md.
handoffs:
  - label: Regenerate drifting copy to match the fingerprint
    skill: comms-verify
    prompt: Regenerate the drifting copy against fingerprint.md and re-review
  - label: Accept the drift as aligned reality
    command: ghost-drift ack
    prompt: Acknowledge that the current fingerprint.md no longer matches and record the drift
  - label: Declare a dimension intentionally divergent
    command: ghost-drift diverge
    prompt: Record an intentional divergence on a specific dimension so it stops flagging
---

# Recipe: Review copy for communication voice drift

**Goal:** flag generated or drafted copy that drifts from the communication voice defined in the local `fingerprint.md`.

Ghost has no `ghost comms-review` CLI command. You — the host agent — are the reviewer. The `fingerprint.md` is your rubric.

## Steps

### 1. Read the fingerprint

    cat fingerprint.md

Absorb the communication dimensions: `tone` (formality, directness, warmth, agency, urgency), `structure` (sentence length, CTA placement, information order), `register` (reading level, jargon tolerance, pronouns), `boundaries` (excluded phrases, required elements, constraints).

If no communication dimensions are present in the fingerprint, tell the user. The fingerprint may be visual-only. Offer to extend it with communication dimensions via the profile recipe.

### 2. Collect the copy

Read the generated or drafted copy. This may be:
- A generated notification, email, or in-app message
- A PR diff that modifies user-facing strings
- A template file (`.md`, `.txt`, `.html`, `.json` with text fields)
- Output from an AI generation endpoint

### 3. Scan for drift

For each piece of copy, check against the fingerprint dimensions:

- **Tone drift:**
  - `formality`: does the copy read more formal or casual than the fingerprint's scale? A brand at 0.3 formality shouldn't say "we regret to inform you."
  - `directness`: is the CTA buried? Does the copy hedge when the fingerprint says blunt?
  - `warmth`: is it clinical when it should be personal, or sentimental when it should be matter-of-fact?
  - `agency`: does the copy tell the reader what to do, or empower them with options? Match the fingerprint.
  - `urgency`: does the copy create more or less pressure than the fingerprint intends?

- **Structure drift:**
  - `sentenceLengthNorm`: are sentences significantly longer or shorter than the norm?
  - `ctaPlacement`: is the call-to-action where the fingerprint says it should be?
  - `informationOrder`: action-first brands should lead with the action. Context-first brands should set the scene. Empathy-first brands should acknowledge first.
  - `paragraphDensity`: wall of text when the fingerprint says tight? One-liners when it says spacious?

- **Register drift:**
  - `readingLevel`: is the copy significantly above or below the target grade level?
  - `jargonTolerance`: does the copy use technical terms when the fingerprint says `none`?
  - `contractions`: "we will" when the fingerprint says use contractions? "we'll" when it says don't?
  - `pronouns`: "the customer" when the fingerprint says second-person ("you")?
  - `sentenceVoice`: passive constructions when the fingerprint says active?

- **Boundary drift:**
  - `excluded`: does the copy contain any phrase from the exclusion list?
  - `required`: is the copy missing any required element for its context?
  - `constraints`: does the copy violate any constraint (e.g., implying blame when the fingerprint says never)?

### 4. Filter noise

Drop matches that aren't real drift:

- Quoted text from external sources the brand is referencing
- Legal boilerplate that can't be rewritten (regulatory language)
- Placeholder copy clearly marked as draft
- Copy in a context the fingerprint doesn't cover (if the fingerprint is scoped to "enforcement comms" and the copy is marketing, note the gap but don't flag)
- Intentional divergence: if `.ghost-sync.json` records a dimension as `diverging`, note it but don't flag

### 5. Produce the review

Group findings by dimension. Lead with the most impactful drift. For each finding:

- **Where:** the specific sentence or phrase
- **What was found:** the drifting language
- **What the fingerprint says:** the expected voice attribute
- **Why it matters:** one sentence connecting to brand impact
- **Suggested fix:** rewrite that matches the fingerprint

Format:
- **Ad-hoc chat:** markdown with the drifting text quoted
- **PR review:** inline comments on string changes + summary comment
- **Generation pipeline:** structured JSON with drift annotations per output

### 6. Record stance if the user accepts the drift

Same remediation as visual drift:
- `ghost-drift ack` — accept drift across the board
- `ghost-drift diverge <dimension> --reason "..."` — intentional divergence on one dimension
- `ghost-drift adopt <parent.md>` — adopt a new voice baseline
