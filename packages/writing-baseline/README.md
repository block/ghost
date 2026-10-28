# writing-baseline

writing-baseline is a brand-agnostic writing package for ghost. It holds the
language decisions that are right for any brand, and it names the decisions
only a brand can make. It has no install, build, or dependencies.

Use it as the starting point for a brand's writing guidance, or copy single
nodes into a package you already have. The corpus is flat, so each file
stands on its own.

## Install

```bash
ghost init --body writing-baseline
```

When working from this repository, you can copy the source package directly:

```bash
cp -R packages/writing-baseline/.ghost .ghost
```

## What is in it

| Node | Authority | Holds |
| --- | --- | --- |
| `baseline` (cover) | — | What the baseline is and the order of authority. |
| `standard.language` | Obligation | Honesty, clarity, and integrity rules every brand's copy owes its reader, each tied to a public source. |
| `standard.copy-defaults` | Default | Generic phrasing to reject, each rule labeled as a measured Ghost default or editorial practice. |
| `foundation.voice` | Open questions | Warmth, humor, address, register, refusals, and exemplars, answered with rewrite pairs. |
| `foundation.tone` | Law + open range | How tone moves with the reader's moment; the brand sets how far. |
| `foundation.mechanics` | Law + conventions + open questions | Consistency rules, shared conventions, and the style choices a brand makes once. |

Checks: `checks/language-obligations.md` enforces `standard.language`;
`checks/copy-defaults.md` flags `standard.copy-defaults`.

The default `ghost init` skeleton ships `standard.language` from this package,
and `ghost checks init` scaffolds its paired check.

## Authority

1. Obligations hold everywhere. The brand controls how they sound, never
   whether they hold.
2. Brand answers hold next, once a human records them in a foundation chapter.
3. Defaults hold until a brand answer replaces them.

## Adapting it

1. Change the manifest id. Until then, the package is honestly labeled as the
   unadapted baseline.
2. Answer each known gap in the foundation chapters with rewrite pairs from
   the people who own the voice: a generic line and the line the brand ships.
   Restate the rule as the brand's answer.
3. Delete any default the brand has deliberately replaced, together with its
   paired check flag. `ghost validate` warns when a deletion orphans a check
   reference.
4. Keep the obligations. Rewrite their wording in the brand's voice if you
   like, but keep each `###` heading so the paired check still resolves.

## Sources

`standard.language` cites its sources inline in each rule:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) success criteria, by number
- [ISO 24495-1:2023](https://www.iso.org/standard/78907.html), plain language
- [deceptive.design pattern types](https://www.deceptive.design/types)
- [Unicode CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)

The citations are provenance, not materials, so agents are not sent to fetch
the standards while writing.

`standard.copy-defaults` marks which rules come from Ghost's measured
model defaults and which come from editorial practice that has not been
measured.

## Not yet included

Moment patterns (error, empty state, confirmation, destructive action,
consent) and channel contexts (email, notification, marketing,
documentation, conversation) are planned as follow-ups.
