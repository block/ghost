---
name: comms-verify
description: Confirm generated copy stays within fingerprint.md voice bounds; iterate if not.
handoffs:
  - label: Regenerate with feedback from the review
    skill: comms-verify
    prompt: Regenerate the copy using the review findings as constraints
  - label: Update the fingerprint to capture an uncaptured voice decision
    skill: profile
    prompt: Add the missing voice decision to fingerprint.md and re-lint
---

# Recipe: Verify generated copy against the fingerprint

**Goal:** confirm that generated copy (a notification, email, error message, or any user-facing text) stays within the communication voice bounds of the local `fingerprint.md`. This is the "generate → review → iterate" loop for copy.

Ghost has no `ghost comms-verify` CLI command. You drive the loop; the fingerprint is the contract.

## Steps

### 1. Generate

Produce the copy. Work from whatever the user asked for. Respect `tone` (formality, directness, warmth, agency, urgency), `structure` (CTA placement, information order), `register` (reading level, jargon tolerance), `boundaries` (excluded phrases, required elements, constraints).

### 2. Self-review

Apply the [comms-review recipe](comms-review.md) to the generated copy. Scan for drift across all four communication dimensions. Group findings by dimension.

### 3. Decide

- **No findings** → pass. The copy is aligned. Report back to the user.
- **Findings exist** → iterate:
  - For each finding, identify the fingerprint value the generator should have followed.
  - Regenerate with explicit guidance: "Use second-person pronouns ('you') instead of third-person ('the customer'). Lead with the action per `structure.informationOrder: action-first`. Drop 'unfortunately' per `boundaries.excluded`."
  - Re-run the comms-review. Up to 3 iterations.
  - If still drifting after 3 tries: report to the user. The fingerprint may be missing a voice decision the generator needs, or the generation prompt may be too loose.

### 4. (Optional) Suite verification

If the user is iterating on the fingerprint's communication dimensions:

- Generate against a suite of diverse contexts (welcome email, error notification, enforcement action, support response, transactional receipt, marketing CTA).
- Run comms-review against each.
- Classify each dimension as **tight** (no drift), **leaky** (occasional drift), or **uncaptured** (frequent drift).
- "Uncaptured" dimensions are the signal the fingerprint is missing a voice decision. Tell the user which one to add.

### 5. Return with annotations

When the loop completes, return the final copy with:
- Which dimensions were checked
- Any remaining drift that couldn't be resolved (with the fingerprint decision that was violated)
- The iteration count (0 = first-pass clean, 3 = max iterations hit)

This gives the human reviewer a head start — they know exactly where to look.

## Why the loop matters

The fingerprint is a contract. Generation tests the contract. Drift shows where the contract is ambiguous or silent. Use comms-verify results to refine both the generator's prompt and the fingerprint's voice decisions.

A visual fingerprint missing a border-radius decision produces a leaky component. A communication fingerprint missing a tone decision produces a message that doesn't sound like the brand. Both are the same problem. Both are fixed the same way: add the decision, re-verify.
