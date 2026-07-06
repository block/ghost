---
name: steering-audit
description: Audit a Ghost fingerprint for concrete steering coverage and guard routing.
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

## Headline the audit with concreteness + guards

Report first:

- **Concreteness coverage:** total nodes, concrete-material nodes, prose-only
  nodes. Concrete means non-empty `materials`, a fenced code block of at least 3
  lines, or a `## Skeleton` section.
- **Guard routing:** how many guard nodes exist, whether they stay in default
  gather, and whether `ghost review` can auto-offer matched guards via
  materials.
- **Pulse by concreteness:** concrete exposure/pull rate vs prose-only
  exposure/pull rate. This is the tuning instrument: if concrete nodes are not
  pulled, descriptions or task selection are failing.

## Corpus-level table

| Row | Status | Evidence | Next move |
| --- | --- | --- | --- |
| Retrieval | strong / weak | descriptions, ids, `index` | sharpen descriptions or mention cold nodes in `index` |
| Concreteness | strong / thin | materials, fenced examples, Skeletons | add concrete locators, exemplars, or opening structures |
| Guards | routed / missing / vague | `posture: guard`, review packet | write not-X-instead-Y guards and material locators |
| Consistency | clean / conflicting | concrete bodies vs rules/guards | update stale examples; examples average with rules |
| Stance | present / missing | `index`, `principle.*` | write forced-choice principles |
| Materials | present / missing | `materials`, inspect-pointers | point at real assets/components/tokens |
| Exemplars | annotated / unannotated / missing | fenced samples, screenshots | say what to copy and what is incidental |
| Patterns | bound-open / loose / missing | `pattern.*`, Skeletons | state applies / bound / open and add a Skeleton when opening structure matters |
| Checks | covered / partial / missing | checks haunt, probes, review packet | add checks/probes for high-risk invariants |
| Silence posture | defined / missing | `index` | say when to proceed provisionally or ask |

## Task-level readiness

For a task, gather, pull, and report:

- **Green:** enough Ghost-backed concrete guidance to generate.
- **Yellow:** safe to generate, but some reasoning is provisional. If there is
  no concrete material for this surface, readiness is at most Yellow.
- **Red:** missing brand-defining, high-risk, irreversible, legal, privacy, or
  security guidance; ask or author first.

Never present steering coverage as deterministic pass/fail.
