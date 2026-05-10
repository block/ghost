---
name: remediate
description: Given drift findings (from review or compare) and the offending diff, suggest the minimal targeted fixes that close the gap.
handoffs:
  - label: Re-review after applying the suggested fixes
    skill: review
    prompt: Re-run the review against the patched files to confirm the drift is closed
  - label: Acknowledge the drift as accepted
    command: ghost-drift ack
    prompt: Acknowledge that the current fingerprint no longer matches and accept the drift
  - label: Declare a dimension intentionally divergent
    command: ghost-drift diverge
    prompt: Record an intentional divergence on a specific dimension so it stops flagging
---

# Recipe: Remediate drift

**Goal:** turn drift findings into a small, surgical patch — the minimal code change that closes the gap between the working tree and the root fingerprint bundle. Remediate is the loop after `review`: review *finds* drift; remediate *proposes the fix*.

Ghost has no `ghost-drift remediate` CLI command. You — the host agent — read the findings, weigh them against `patterns.yml`, `survey.json`, optional `intent.md`, and active checks, then write the patch.

## Steps

### 1. Gather inputs

You need:

- The **drift output** — either the JSON from `ghost-drift compare --semantic --format json` or the structured findings from a [review](review.md) pass.
- The **offending diff** — `git diff <base> -- <file>` for each flagged file.
- The **fingerprint bundle** — `.ghost/patterns.yml`, `.ghost/survey.json`, optional `.ghost/intent.md`, and `.ghost/checks.yml` for active gates.
- The **sync manifest** if present (`.ghost-sync.json`) — anything stance:`diverging` is intentional and must NOT be remediated.

### 2. Match each finding to a token

For every drift finding, identify the token the code *should* have used:

- Hardcoded `#3b82f6` → token or value evidenced in `survey.json`. If nothing fits, the bundle is silent and the right move is to add evidence or human intent, not a remediation.
- Off-pattern composition → restore the `patterns.yml` anatomy or use an allowed variant.
- Off-grid `padding: 14px` → nearest survey-backed spacing/token value. Prefer rounding *down* unless the surrounding rhythm suggests otherwise.
- Hard-coded radius not evidenced in `survey.json` → snap to a survey-backed radius or flag for human review.
- Behavioral drift → propose removing the offending property; cite the relevant pattern or intent.

### 3. Score by impact

Rank findings by how much distance they close:

- **Load-bearing** — fixes that restore required pattern anatomy, token usage, or active checks. Patch first.
- **Snap-to-grid** — off-scale spacing/radii values. Patch in the same pass.
- **Cosmetic** — values that drift slightly (`16px` vs `15px`) but don't break a decision. Group these into one cleanup commit.

If the drift number quoted in the finding is `< 0.05`, ask before patching — it may be acceptable noise.

### 4. Propose the patch

For each finding, write a unified-diff suggestion in the form:

```
file:line   before  →  after   (closes <dimension> drift of ~0.NN)
```

Example:

```
src/components/button.tsx:42   border-radius: 12px;   →   border-radius: var(--radius-md);
                                                          (matches surfaces.borderRadii: [4, 8, 16] — closes ~0.14 of 0.18 radius drift)
```

Group patches by file. Keep each patch surgical — do not refactor surrounding code, do not rewrite imports, do not "clean up while you're there."

### 5. Surface what cannot be remediated

Some findings have no clean fix:

- The bundle is silent on the dimension → tell the user the bundle is missing evidence, pattern policy, or accepted intent; offer to update the bundle.
- The drift is intentional (e.g. a brand-tier override on a single page) → suggest `ghost-drift diverge <dimension> --reason "..."` instead of a code patch.
- The fix would cascade across many files → flag and stop. A 30-file refactor disguised as "remediation" is a separate change with its own review.

### 6. Record the outcome

After the user applies (or rejects) the patches:

- Re-run `ghost-drift compare` — distance should drop. If it doesn't, the patches missed.
- If the user accepts the drift instead of fixing it, run `ghost-drift ack` (overall) or `ghost-drift diverge <dimension>` (one axis).
- Never silently regenerate the bundle to "absorb" the drift. That hides the act.

## Why this is a recipe, not a verb

Remediation requires judgment: which token is "closest", what matters enough to fix, when to escalate vs auto-patch. None of that is deterministic, so it stays in the recipe — the CLI gives you the math (`compare`), the recipe gives you the procedure, and you write the patch.
