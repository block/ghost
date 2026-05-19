---
name: patterns
description: Interpret .ghost/survey.json surface evidence into .ghost/patterns.yml, the operational composition grammar.
handoffs:
  - label: Verify bundle
    command: ghost verify .ghost --root .
    prompt: Verify the root fingerprint bundle
---

# Recipe: Write `patterns.yml`

**Goal:** produce `.ghost/patterns.yml` (`ghost.patterns/v1`) from
`.ghost/survey.json`.

`patterns.yml` is operational composition grammar. It names surface types,
composition patterns, anatomy, variants, anti-patterns, confidence, and evidence
so generation and advisory review have stable handles. It is not human intent;
use optional `intent.md` for accepted product strategy.

## Start From Survey Evidence

```bash
ghost survey patterns .ghost/survey.json -o .ghost/patterns.yml
```

Then curate the draft. Keep every pattern evidence-backed.

If `ghost scan --format json` reports `readiness.state: substrate-only`, leave
`composition_patterns` empty and keep advisory expectations focused on
tokens/components/values. If readiness is `component-demo`, mark patterns as
demo or component-anatomy evidence; do not present them as product composition,
surface flow, or hierarchy.

## Authoring Rules

- Use stable slugs: `resource-index`, `dense-resource-index`, `settings-stack`.
- Record surface type selection policy in `surface_types[].preferred_patterns`.
- Record pattern anatomy in `composition_patterns[].anatomy`.
- Put sparse but important differences in `variants` or `anti_patterns`.
- Use `confidence` for observed support, not taste.
- Cite `survey.ui_surfaces` via `surface_id`, `locator`, or `path`.
- Keep subjective or strategic rationale out of `patterns.yml`; put approved
  intent in `intent.md`.

## Validate

```bash
ghost lint .ghost
ghost verify .ghost --root .
```

Verification fails when composition patterns lack survey-backed evidence.
