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
- Run `pnpm install`, then `pnpm run quality:all`. This is the same complete
  gate used before releases: package checks, tests, builds, retained workspace
  checks, and validation of checked-in ghost packages.
- **Changesets:** `@design-intelligence/ghost` is the only public
  package. Write the changeset file yourself: `patch` for fixes and docs;
  `minor` for additions and clearly labeled breaking changes during the 0.x
  preview. Reserve `major` for the 1.0 release. One sentence, user-facing,
  present tense.

## Release authentication

`release.yml` publishes through npm trusted publishing (OIDC), not a stored
npm token. Before merging authentication changes, an npm package owner must
configure a GitHub Actions trusted publisher in the settings for
`@design-intelligence/ghost`:

- Organization: `block`
- Repository: `ghost`
- Workflow filename: `release.yml`
- Environment name: leave blank (the release job does not use one)
- Allowed actions: enable direct publishing with `npm publish`. Stage-only
  authorization does not permit the existing Changesets publish command.

Complete the first publish within two days of creating the trusted publisher
or npm expires the configuration. The workflow uses a GitHub-hosted runner,
Node 24, and `id-token: write`, as required for OIDC. Do not add `NPM_TOKEN`,
`NODE_AUTH_TOKEN`, or setup-node `registry-url` authentication to this workflow.
The repository `.npmrc` already selects the public npm registry.

After configuring npm and merging the workflow, let the main-branch release
run publish the pending version. Confirm npm publication, the GitHub Release
and its tarball, and any configured downstream syncs. Only after a successful
OIDC publish, revoke the obsolete publish token and remove the
`DESIGN_INTELLIGENCE_NPM_PUBLISH_TOKEN` repository secret. Local workflow
checks and `npm publish --dry-run` cannot verify npm-side authorization.

See [npm's trusted publishing guide](https://docs.npmjs.com/trusted-publishers/)
for setup and troubleshooting.

## Dogfooding

Surfaces in this repo carry their own ghost packages: `apps/docs/.ghost` and
`packages/vessel-react/.ghost`. If you touch a surface, `ghost gather` from its
package before you build, and expect review against it. This is where
you experience ghost as a user; treat friction you hit here as a bug worth
reporting.

## Governance

This repo follows [Block's org-level governance](https://github.com/block/.github/blob/main/GOVERNANCE.md).
Licensed Apache-2.0.
