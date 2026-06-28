---
name: voice
description: Capture voice and language guidance into existing Ghost fingerprint facets.
---

# Recipe: Capture Voice And Language

Language maps onto the existing facets; do not invent new schema. Voice and
language flow through `intent.yml` (tone, voice principles, wording contracts),
`inventory.yml` (copy material and writing-standard sources),
`composition.yml` (copy patterns), and `validate.yml` (the detectable subset).

1. Inventory the user-facing strings: i18n catalogs, error components,
   notifications, empty states, onboarding copy. Record durable locations in
   `inventory.building_blocks` and strong examples as `inventory.exemplars`.
2. Check `inventory.sources` for a declared writing-standards source. Read it
   when present. If the team maintains standards elsewhere, propose adding a
   `sources` entry pointing at them instead of copying their content in.
3. Draft the smallest evidence-backed entries:
   - Tone words into `intent.summary.tone`.
   - Voice rules with rationale into `intent.principles`.
   - Surfaces with non-negotiable exact wording into
     `intent.experience_contracts`.
   - Copy shapes into `composition.patterns` with `kind: content`, including
     `anti_patterns` observed in the repo.
   - Place each entry in the surface it belongs to so selective context
     assembly surfaces it for copy work on that surface and omits it
     elsewhere. Brand-wide voice lives in the root surface and cascades down.
4. Promote only the mechanically detectable subset into
   `validate.yml`:
   - Absolute rules (banned phrases, required boilerplate) become
     `forbidden-regex` or `required-regex` checks with `status: active`.
   - Recommendations become `status: proposed` so `ghost review` surfaces
     them without blocking.
   - Contextual guidance stays in composition only.
   - Give each check a `derivation` ref back to the intent or composition
     entry it enforces.
5. Validate with `ghost lint` and `ghost verify --root <target>`, then hand
   the draft to the human to curate. Fingerprint edits stay ordinary
   uncommitted draft work until Git review accepts them.

When reviewing copy changes, cite the diff location and the relevant
`intent.principle`, `intent.experience_contract`, or `composition.pattern` refs.
Tone and register findings are advisory unless an active check backs them.
When voice facets are silent, proceed from nearby copy in the repo and label
that reasoning as provisional and non-Ghost-backed.
