---
name: steering-audit
description: Audit a Ghost fingerprint for concrete steering coverage.
---

# Recipe: Audit Steering Coverage

A steering audit asks whether a fingerprint can move generation away from the
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
| Retrieval | strong / weak | descriptions, ids, cover | sharpen descriptions or move universal truth to the cover |
| Concreteness | strong / thin | materials, fenced examples, Skeletons | add concrete locators, exemplars, or opening structures |
| Anti-goals | present / missing / vague | `anti-goal.*`, review packet | write not-X-instead-Y replacements and material locators |
| Consistency | clean / conflicting | concrete bodies vs rules | update stale examples; examples average with rules |
| Stance | present / missing | cover, `principle.*` | write forced-choice principles |
| Materials | present / missing | `materials`, inspect-pointers | point at real assets/components/tokens |
| Exemplars | annotated / unannotated / converging / missing | fenced samples, screenshots, repeated runs | say what to copy and what is incidental; tighten applicability when unrelated tasks converge |
| Patterns | bound-open / loose / missing | `pattern.*`, Skeletons | state applies / bound / open and add a Skeleton when opening structure matters |
| Checks | covered / partial / missing | checks/, probes, review packet | add checks/probes for high-risk invariants |
| Silence posture | defined / missing | cover | say when to proceed provisionally or ask |

## Exemplar convergence

When auditing repeated runs, compare unrelated asks that pulled the same
exemplar. If they reproduce the same composition, section order, or decorative
treatment without the exemplar's stated condition requiring it, the exemplar is
steering beyond its intent. The next move is to tighten applicability, add a
shape-appropriate exemplar, or remove the exemplar.

## Task-level readiness

For a task, gather, pull, and report:

- **Green:** enough Ghost-backed concrete guidance to generate.
- **Yellow:** safe to generate, but some reasoning is provisional. If there is
  no concrete material for this surface, readiness is at most Yellow.
- **Red:** missing brand-defining, high-risk, irreversible, legal, privacy, or
  security guidance; ask or author first.

Never present steering coverage as deterministic pass/fail.
