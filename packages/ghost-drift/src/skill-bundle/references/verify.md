---
name: verify
description: Confirm generated UI stays within expression.md bounds; iterate if not.
handoffs:
  - label: Regenerate with feedback from the review
    skill: generate
    prompt: Regenerate the UI using the review findings as constraints
  - label: Update the expression to capture an uncaptured decision
    skill: profile
    prompt: Add the missing decision to expression.md and re-lint
---

# Recipe: Verify generated UI against the expression

**Goal:** confirm that generated UI (a component, a page, a variant) stays within the bounds of the local `expression.md`. This is the "generate → review → iterate" loop.

Ghost has no `ghost verify` CLI command. You drive the loop; the expression is the contract.

## Steps

### 1. Generate

Produce the UI code. See [generate.md](generate.md) for guidance, or work from whatever the user asked for. Respect `palette`, `spacing.scale`, `typography`, `surfaces`, `decisions`, `roles`.

### 2. Self-review

Apply the [review recipe](review.md) to the generated file. Scan for hardcoded values that drift from the expression. Group findings by dimension.

### 3. Decide

- **No findings** → pass. The generation is aligned. Report back to the user.
- **Findings exist** → iterate:
  - For each finding, identify the token the generator should have used.
  - Regenerate with explicit guidance: "Use `palette.primary` (`#0066cc`) instead of `#3b82f6`; snap padding to `spacing.scale` step 4 (16px) instead of `14px`."
  - Re-run the review. Up to 3 iterations.
  - If still drifting after 3 tries: report to the user. The expression may be missing a token the generator needs, or the generation prompt may be too loose.

### 4. (Optional) Suite verification

If the user is iterating on the expression itself and wants coverage stats:

- Generate against a suite of diverse prompts (button variants, a form, a data table, a hero section, etc. — pick a dozen).
- Run the review against each.
- Classify each dimension as **tight** (no drift), **leaky** (occasional drift), or **uncaptured** (frequent drift).
- "Uncaptured" dimensions are the signal the expression is missing a decision. Tell the user which one to add.

## Why the loop matters

The expression is a contract. Generation tests the contract. Drift shows where the contract is ambiguous or silent. Use verify results to refine both the generator's prompt and the expression itself.
