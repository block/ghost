---
name: steering-audit
description: Audit a ghost package for concrete steering coverage.
---

# Recipe: Audit Steering Coverage

A steering audit asks whether a ghost package can move generation away from the
generic median. It is not a validation pass; `ghost validate` handles package
shape.

Start with:

```bash
ghost validate
ghost gather --format json
ghost pulse --format json
```

If checks are installed and a diff exists, run `ghost review` too.

## Headline the audit with concreteness

Report first:

- **Concreteness coverage:** total nodes, concrete-material nodes, prose-only
  nodes. Concrete means non-empty `materials`, a fenced code block of at least 3
  lines, or a `## Skeleton` section. `ghost gather` also breaks out materials,
  substantial fenced examples, and Skeletons as payload labels.
- **Pulse by concreteness:** concrete-material exposure/pull rate vs prose-only
  exposure/pull rate. In markdown this is the `Concrete material` row. This is
  the tuning instrument: if concrete nodes are not pulled when applicable,
  descriptions or task selection are failing.

## Corpus-level table

| Row | Status | Evidence | Next move |
| --- | --- | --- | --- |
| Retrieval | strong / weak | descriptions, ids, cover | sharpen descriptions or move universal guidance to the cover |
| Concreteness | strong / thin | materials, fenced examples, Skeletons | add concrete locators, exemplars, or opening structures |
| Anti-goals | present / missing / vague | `anti-goal.*`, review packet | write not-X-instead-Y replacements and material locators |
| Consistency | clean / conflicting | concrete bodies vs rules | update stale examples; examples average with rules |
| Stance | present / missing | cover, `principle.*` | write forced-choice principles |
| Materials | present / missing | `materials`, inspect-pointers | point at real assets/components/tokens |
| Exemplars | annotated / unannotated / missing | fenced samples, screenshots | say what to copy and what is incidental |
| Patterns | bound-open / loose / missing | `pattern.*`, Skeletons | state applies / bound / open and add a Skeleton when opening structure matters |
| Checks | covered / partial / missing | checks/, probes, review packet | add checks/probes for high-risk invariants |
| Silence posture | defined / missing | cover | say when to proceed provisionally or ask |

## Task-level readiness

For a task, gather, pull, and report:

- **Green:** enough ghost-backed concrete guidance to generate.
- **Yellow:** safe to generate, but some reasoning is provisional. If there is
  no concrete material for this surface, readiness is at most Yellow.
- **Red:** missing brand-defining, high-risk, irreversible, legal, privacy, or
  security guidance; ask or author first.

Never present steering coverage as deterministic pass/fail.
