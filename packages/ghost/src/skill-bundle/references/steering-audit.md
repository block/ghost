---
name: steering-audit
description: Audit a Ghost fingerprint for steering coverage without turning steering buckets into required fields.
---

# Recipe: Audit Steering Coverage

A steering audit asks whether a fingerprint can steer generation, not whether it
fills a schema. The buckets are mandatory questions, not mandatory fields. Missing
coverage is an authoring signal, not a validation failure.

Start by running:

```bash
ghost validate
ghost gather --format json
ghost pulse --format json
```

If the checks haunt is installed and there is a change to review, also run
`ghost review` to inspect review coverage gaps.

## Corpus-level audit

Read the gathered menu, the `index` node, and representative nodes from each kind.
Return a compact table:

| Bucket | Status | Evidence | Next move |
| --- | --- | --- | --- |
| Retrieval | strong / weak | descriptions, ids, `index` | sharpen descriptions or mention cold nodes in `index` |
| Stance | present / missing | `principle.*` or equivalent | write forced-choice principles |
| Materials | present / missing | `materials`, `asset.*` | add concrete locators and explain what they mean |
| Exemplars | annotated / unannotated / missing | `exemplar.*` | say what to copy and what is incidental |
| Anti-goals | specific / generic / missing | `anti-goal.*` | name likely wrong outputs |
| Patterns | bound-open / loose / missing | `pattern.*` | state applies / bound / open |
| Invariants | checkable / soft / missing | always/never lines | make hard lines concrete and consider checks |
| Conditions | clear / weak / missing | prose situations | replace destinations with activation conditions |
| Decision traces | present / missing | `decision.*` | record tradeoffs, rejected options, and reversal conditions |
| Checks | covered / partial / missing | checks haunt, review packet | add checks for high-risk invariants |
| Silence posture | defined / missing | `index` | say when to proceed provisionally or ask a human |

Use `ghost pulse` as tuning signal. If a kind or node is always exposed but never
pulled, its description may be weak, it may be too broad, or it may belong in
`index` if it is truly non-negotiable.

## Task-level readiness

For a specific task, run `ghost gather <ask> --format json`, pull the selected
nodes, and report:

```markdown
Readiness: Green / Yellow / Red

Grounded:
- `node.id` — short claim

Missing:
- <bucket or decision the fingerprint does not cover>

Proceed:
- <how to generate, what to label provisional, or what to ask a human>
```

Use these labels:

- **Green:** enough Ghost-backed guidance to generate.
- **Yellow:** generation is safe, but some reasoning must be labeled
  provisional.
- **Red:** missing brand-defining, high-risk, or irreversible guidance; ask a
  human or author a node first.

## Recommend the next node by failure mode

| Failure | Next authoring move |
| --- | --- |
| Agent did not find the truth | sharpen `description` or mention it in `index` |
| Agent invented facts | add `asset.*`, exact values, and material locators |
| Output looked generic | add `anti-goal.*` and an annotated `exemplar.*` |
| Wrong structure | add `pattern.*` with applies / bound / open |
| Hard line violated | add an invariant and a check |
| Guidance applied too broadly | add a condition in prose |
| Bad tradeoff | add `decision.*` |
| Correct but forgettable | add scoped `concept.*`, clearly not reusable law |
| Drift missed in review | add or reroute a check |

Never report steering coverage as a deterministic pass/fail. `ghost validate`
handles package shape. This audit handles authoring quality.
