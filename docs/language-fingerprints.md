# Language In The Fingerprint

Voice and language are part of a product surface. Copy drifts the same way
layout drifts: generated notifications, error messages, empty states, and
button labels slowly stop sounding like one product.

Ghost does not need a new domain, schema, or dimension set to capture this.
Language flows through the same three core layers as every other
surface-composition concern:

- `fingerprint/prose.yml` carries voice intent.
- `fingerprint/inventory.yml` points at copy material and external writing
  standards.
- `fingerprint/composition.yml` carries copy patterns.
- `fingerprint/enforcement/checks.yml` carries the deterministic subset.

This document shows the mapping. Nothing here changes the
`ghost.fingerprint/v1` schema.

## Voice Intent Lives In Prose

`prose.summary.tone` already exists for tone words. Voice rules that need
rationale become principles. Surfaces with non-negotiable wording become
experience contracts.

```yaml
# fingerprint/prose.yml
summary:
  tone:
    - plain
    - direct
    - warm
principles:
  - id: action-first-copy
    principle: Copy leads with what the reader can do next, not with what the system did.
    applies_to:
      paths:
        - src/i18n/**
        - src/components/**
      surface_types:
        - error-state
        - empty-state
    guidance:
      - Prefer "Try again" over "The operation failed."
      - Keep apology framing out of routine errors.
    evidence:
      - path: src/components/error-banner.tsx
        note: Existing errors already lead with the recovery action.
experience_contracts:
  - id: exact-wording-surfaces
    contract: Designated surfaces (legal text, consent prompts, destructive confirmations) use approved exact wording and are never paraphrased.
    applies_to:
      surface_types:
        - legal-text
        - consent-prompt
        - destructive-confirmation
    obligations:
      - Treat the approved string as the source of truth, not a style suggestion.
      - Route wording changes through ordinary Git review.
    check_refs:
      - check:no-banned-phrases
```

Scope every voice entry with `applies_to`. Selective context assembly uses
`applies_to` paths, scopes, and surface types to decide which fingerprint
entries reach an agent for a given piece of work. Scoped voice entries are
selected when copy work touches their surfaces and stay out of the way when
it does not; unscoped entries only surface through ref edges or the global
fallback.

## Copy Material Lives In Inventory

Most teams already maintain writing standards somewhere: a style guide, a
terminology list, a banned-phrase list. The fingerprint should point at that
source, not fork it. `inventory.sources` already supports this.

```yaml
# fingerprint/inventory.yml
building_blocks:
  files:
    - src/i18n/en.json
  notes:
    - User-facing strings are centralized in the i18n catalog; copy edits happen there.
sources:
  - id: writing-standards
    kind: url
    ref: https://example.com/your-org/writing-standards
    note: Org voice rules and terminology. Normativity levels map to Ghost per the table in docs/language-fingerprints.md.
exemplars:
  - id: refund-error-copy
    path: src/components/refund-error.tsx
    surface_type: error-state
    why: Canonical error shape - states what happened, then the next step, in under two sentences.
```

External standards stay maintained in one place. The fingerprint records which
source applies and which surfaces it governs.

## Copy Patterns Live In Composition

`composition.yml` already has `kind: content` for exactly this.

```yaml
# fingerprint/composition.yml
patterns:
  - id: error-message-shape
    kind: content
    pattern: Error copy states what happened, then the next step the reader can take.
    applies_to:
      surface_types:
        - error-state
    guidance:
      - Two sentences maximum for inline errors.
      - Name the recovery action in the same breath as the failure.
    anti_patterns:
      - Passive apology framing ("we're sorry to inform you").
      - Blaming the reader ("you entered an invalid value").
    check_refs:
      - check:no-banned-phrases
    evidence:
      - path: src/components/error-banner.tsx
  - id: button-labels-are-verbs
    kind: content
    pattern: Buttons label the action the reader takes, as a verb phrase.
    anti_patterns:
      - Generic labels ("OK", "Submit") where a specific verb exists.
```

## The Deterministic Subset Becomes Checks

Writing standards commonly carry normativity levels, in the spirit of
RFC 2119: some rules are absolute, some are recommended, some are contextual.
Map them onto the existing check lifecycle instead of inventing a new one:

| Standard's level | Ghost expression | Effect |
| --- | --- | --- |
| must (legal wording, banned phrases) | `checks.yml` entry with `status: active` | `ghost check` can fail the diff |
| should (strong recommendation) | `checks.yml` entry with `status: proposed` | Surfaces in `ghost review` as advisory |
| may / contextual | `composition.yml` guidance only | Generation input, never a gate |

Only the mechanically detectable subset belongs in `checks.yml`. The
`forbidden-regex` and `required-regex` detectors cover banned phrases and
required boilerplate today:

```yaml
# fingerprint/enforcement/checks.yml
checks:
  - id: no-banned-phrases
    title: Banned phrases stay out of user-facing copy
    status: active
    severity: serious
    derivation:
      prose:
        - prose.experience_contract:exact-wording-surfaces
      composition:
        - composition.pattern:error-message-shape
    applies_to:
      paths:
        - src/i18n/**
        - src/components/**
    detector:
      type: forbidden-regex
      pattern: "we'?re sorry to inform you|per our policy"
    repair: Lead with the recovery action; see the error-message-shape pattern and the linked writing standards.
```

Everything that needs reading comprehension - tone, register, audience fit -
stays advisory. `ghost review` routes it to the host agent with the relevant
prose and composition refs; it never blocks on its own.

## What Ghost Deliberately Does Not Do

- Ghost does not ship a voice ontology, tone scales, or scored language
  dimensions. Voice rules are curated prose, owned by the team that writes
  them, approved through Git review like every other fingerprint edit.
- Ghost does not embed any organization's style guide. The fingerprint points
  at one through `inventory.sources`.
- Advisory copy critique never gates CI. Only active deterministic checks
  block, exactly as with visual and structural drift.

## Workflow

Capturing language follows the same loop as any other layer content: inventory
the user-facing strings, read the standards source the inventory declares,
draft the smallest evidence-backed entries, and ask a human to curate the
claims. The `voice` recipe in the Ghost skill bundle walks an agent through it.
