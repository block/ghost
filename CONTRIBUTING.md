# Contributing to ghost

ghost is a public development preview, not an open testing or support program.
The maintainers may review focused fixes, but cannot promise responses to usage
questions, feature requests, or unsolicited contributions. The constraints
below explain which changes can fit the project when review capacity exists.

## Invariants

These are project-defining. A PR that violates one gets declined regardless
of quality elsewhere.

1. **The CLI computes; it never decides.** No LLM calls in the CLI, ever.
   ghost is BYOA (bring your own agent): the host agent does all interpretive
   work. The CLI's value is determinism: same input, same output, no key
   required.
2. **The corpus stays flat.** No hierarchy, no inheritance, no
   edges between nodes. A node's identity is its filename; its kind is a
   glossary-declared prefix. Altitude lives in prose, not structure.
3. **Feed-back never leaks into generation context.** Checks and
   review packets inform the agent after the fact. They are never a node
   source and never enter `gather`/`pull` output.
4. **The published artifact packs self-contained.** No `workspace:*` runtime
   dependencies in `packages/ghost`. CI checks the packed tarball.

## The vocabulary gate

`scripts/check-terminology.mjs` fails CI on banned phrasings. The script is
the source of truth; these are the clusters and their reasons:

- **The "memory" compounds.** ghost holds nothing; an agent holds nothing it
  isn't handed. The ghost package is a steering packet, not recall.
- **The "judg-" words.** The CLI computes; the host agent decides. Review
  output is advisory.
- **Product-UI-centric framing.** ghost is brand through every medium
  (screens, emails, empty states, sentences), so phrases that anchor it to
  product UI alone are banned.
- **Bare next-major version markers.** No speculative roadmap language in
  the tree.

Run `pnpm check:terminology` locally before pushing; don't try to memorize
the list.

## The deterministic path

- pnpm 10+, Node 20.19+ or 22.12+.
- `pnpm install` → `pnpm check` → `pnpm test` → `pnpm build`. CI gates:
  biome lint/format, typecheck, file-size, terminology, and packed-tarball
  checks.
- **Changesets:** `@design-intelligence/ghost` is the only public
  package. Write the changeset file yourself: `patch` for fixes and docs,
  `minor` for new commands/flags/exports, `major` for removed or renamed
  public behavior. One sentence, user-facing, present tense.

## Dogfooding

Surfaces in this repo carry their own ghost packages: `apps/docs/.ghost` and
`packages/vessel-react/.ghost`. If you touch a surface, `ghost gather` from its
package before you build, and expect review against it. This is where
you experience ghost as a user; treat friction you hit here as a bug worth
reporting.

## Governance

This repo follows [Block's org-level governance](https://github.com/block/.github/blob/main/GOVERNANCE.md).
Licensed Apache-2.0.
