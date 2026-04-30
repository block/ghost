---
"ghost-expression": minor
---

Add a controlled vocabulary of 12 canonical decision dimensions (`color-strategy`, `surface-hierarchy`, `shape-language`, `typography-voice`, `spatial-system`, `density`, `motion`, `elevation`, `theming-architecture`, `interactive-patterns`, `token-architecture`, `font-sourcing`) so fleet-aggregation primitives can group decisions across members. Profile recipe nudges authors toward canonical slugs; novel project-flavored slugs may pair with an optional `dimension_kind` that maps to a canonical bucket. New soft `non-canonical-dimension` lint warning suggests the closest canonical match. The schema accepts the optional `dimension_kind` field on `decisions[]`; existing expressions remain valid.
