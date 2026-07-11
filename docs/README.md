# docs/

Durable, current, maintainer-audience architecture only — the internal model
docs that defend a boundary or explain a rule a contributor needs before
touching the fingerprint schema or CLI. Not onboarding (that's
[apps/docs](../apps/docs)'s Five-Minute Ghost and Getting Started), not
design exploration, not migration plans, not evidence appendices.

Before adding a doc here, ask:

- **Is it durable?** A doc describing a migration in progress, a phased
  plan, or a driving ethos that hasn't landed in the CLI/schema/skill bundle
  yet belongs in your own working notes, not here. Land the idea in shipped
  code or the skill bundle first; document the boundary it establishes
  after.
- **Is it current?** A doc that duplicates or contradicts what
  `packages/ghost/src/skill-bundle` or the CLI already say has failed its
  purpose. When shipped material supersedes a doc here, retire the doc and
  fold anything still-true into the shipped surface.
- **Does it earn standalone status?** Prefer folding a short rule into an
  existing doc, a package README, or the skill bundle over adding a new
  file. A doc belongs here only when it defends a boundary or model no
  single existing surface owns.

Every doc here should open with an audience/scope callout (see
[`purposes.md`](./purposes.md) for the pattern) so a reader without the full
vocabulary knows immediately whether to keep reading or go to the onboarding
docs instead.
