# ghost

**Give agents the brand guidance that applies, and know what they received.**

Pasting a brand guide into a prompt is a guess. Searching it finds what
sounds similar, which is not the same as what applies: a trust rule can
govern a payment form even when nobody types the word "trust."

ghost keeps brand guidance in your repo as plain files. Each file states
when it applies. Your agent reads that menu, pulls what governs the task,
and receives the original words plus pointers to their sources.

```text
.ghost/
  glossary.md           # your vocabulary
  principle.trust.md    # "near the moment of payment, reduce felt risk…"
  voice.md              # how the brand talks
  asset.logo.md         # points at the actual SVGs
```

Each file says when it applies, what the brand wants, what it refuses, and
which real files back it up.

Claude Code, Codex, Cursor, and Goose can all use the same guidance.
ghost is bring-your-own-agent: the CLI never calls a model and needs no
API key.

[Project site](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@design-intelligence/ghost)

## What it looks like

In a filled-in package, you ask your agent for a transactional email.
The agent runs:

```bash
ghost gather "write a transactional email about seller reverification"
```

gather prints the complete menu: every selectable guidance file and when it
applies. The cover is excluded from selection and included by every pull.
gather never filters or ranks the menu. Selection belongs to the agent,
which reads the menu and picks what governs the task:

> *Agent's selection in a filled-in package:* `foundation.voice`,
> `context.email-transactional`, `shared.content-integrity` apply.
> `context.marketing-web` is the wrong register for a transactional email.
> `foundation.motion` does not apply; email has no motion.

For that filled-in package, the agent runs
`ghost pull foundation.voice context.email-transactional shared.content-integrity`.
The email and content-integrity files in this example are authored guidance,
not files created by `ghost init`.

pull delivers the cover, the selected guidance in its original words, and
any declared sources or source pointers. Not a summary.
Not the whole brand book. Successful gather and pull calls are logged locally,
so you can see what the CLI delivered for the run.

Running `ghost init` gives you a usable starter package; the demo above
shows a filled-in one.

> [!NOTE]
> ghost is an early preview. The CLI, package format, and APIs may change
> without migration support, and breaking changes can ship in minor
> versions. If that doesn't scare you, we'd love your feedback: try it on a
> real repo and tell us what broke or confused you.

## Install

Use the local CLI with `npx ghost`, or make `ghost` available on your PATH
for the commands below.

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

## Use It

Install the skill bundle so your host agent knows how to author and use the
ghost package, then ask in plain English:

```text
Set up the ghost package for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the ghost package.
Review this diff against the ghost review checks.
```

Your agent selects, interprets, and applies the guidance.

ghost never grades the work. It makes sure the CLI delivers the brand's
actual words, and shows you what it delivered. Whether the result is good is
still your call, and `ghost review` is built for that moment: it lays the
change, the guidance, and the review checks side by side so a reviewer can
judge quickly.

## The loop

The starter package is usable before the brand is fully documented. Confirm
or replace its provisional guidance as the brand becomes known. Run setup
once per repo, then gather, pull, and review for each task. If you installed
the skill during Install, skip the repeated `ghost skill install` command:

```bash
# Setup (once per repo)
ghost init          # create .ghost/ with a usable starter package
ghost checks init   # opt in to review checks
ghost skill install # teach your agent the ghost workflow
ghost validate      # check the package is well-formed

# The loop (every task; this example uses a starter-package ID)
ghost gather "write a transactional email about seller reverification"
ghost pull foundation.voice # deliver the cover plus selected guidance and sources
ghost review        # assemble an advisory review packet for a diff
```

Your agent supplies the actual task to gather and the applicable IDs to pull;
the commands above use a concrete task and an ID available in the starter.
Review requires review checks and a Git diff against an existing commit.

While tuning the package, `ghost stats` summarizes what agents actually
reached for. See the [CLI reference](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/schema.md#command-behavior)
for all commands, including `stats`, `skill check`, and `manifest`.

## Thesis

Agents now make screens, emails, and sentences. Polishing one output does not
help the next generation. Record where the model's default is good enough and
where the brand must differ, then give those decisions to the agent before it
starts.

A `.ghost/` package keeps that guidance in the repo with the sources it
points at and the conditions where it applies. Buttons stay buttons. The
moments that carry your brand get your stance instead of the default. Write the
decision once, and each agent can use it when the same situation returns.

Selection is by applicability, not similarity. The menu states when each
file applies, and the agent pulls what governs the task, including guidance
whose words never appear in the prompt.

## How it works

The package is a folder of guidance files. Each file is one brand
decision: frontmatter saying when it applies and which sources back it,
and the guidance itself in prose. There is no hierarchy to learn. The
folder is flat, and directories are only for browsing.

```text
.ghost/
  manifest.yml          # schema + package id + optional cover id
  glossary.md           # your kind vocabulary + what each kind means
  brand.md              # example cover included by every pull
  principle.trust.md    # guidance of kind `principle`
  asset.logo.md         # guidance that points at concrete sources
  checks/               # optional review checks; not guidance files
```

The optional `cover:` in `manifest.yml` names the one page always included
by pull. gather excludes it from the selectable menu. The starting structure
calls it `brand`, but the filename is not reserved.

```markdown
---
for: Placing, sizing, or choosing a logo lockup or glyph.
materials:
  - brand/logo-lockup.svg
  - brand/logo-glyph.svg
  - https://figma.com/file/example?node-id=logo-lockups
---

Use the full lockup when recognition matters. Use the glyph only when space is
constrained or when brand presence should recede.
```

`for` states when the file applies. `materials` lists its sources as explicit
repo-relative paths or supported external references. Name each file instead
of using a glob. A reference may include a short note about what the agent
will find there. Guidance stays in prose; sources say where to look.

**Review checks** are optional assertions in `.ghost/checks/`. Core
`ghost init` ships no review checks; opt in with `ghost checks init`.
They are used only by review, never by gather or pull:

```markdown
---
name: logo-clearspace-holds
description: Logo usage preserves clearspace, lockup integrity, and glyph rules.
severity: medium
references:
  - asset.logo
---

Assess whether the change preserves the logo guidance in `asset.logo`.
```

review reads a diff, matches touched files to guidance sources, and offers
review checks for the agent to weigh. Review output never enters generation
context. Use `ghost review --node` to add guidance that governs a change even
when its sources were not touched. See the CLI reference for flag usage.

## What ghost can verify

ghost's CLI delivery is observable by design. That is a deliberate contrast
with pasting a document into a prompt: ghost supplies a local record of what
its CLI delivered, not evidence of what the model read.

- Successful `gather` and `pull` calls are logged locally in a private
  run log excluded from git, so a run shows which guidance was requested and delivered.
- Agents can keep delivered context task-scoped. An email task can pull the
  email guidance; a deck task can pull the deck guidance. Different tasks
  can pull different subsets instead of the whole book every time.
- Delivery is tested end to end: transport tests verify that complete
  guidance survives the pipe, and included source content is always marked
  as untrusted source data.

One honest boundary: a pull proves CLI delivery, not adherence. It does not
prove that the host passed the full output to the model or that the model
read it. Whether the agent followed the guidance is what review, and your
assessment, are for.

Don't take our word for it. The repo ships two evaluation harnesses:
[`packages/context-control`](./packages/context-control) measures whether
agents select the applicable guidance from the menu, and
[`packages/steering-control`](./packages/steering-control) measures what a
package buys before and after, as a self-contained report. Run them
against your own package.

## What ghost does not do

- It does not score brand quality or grade outputs.
- It does not learn the brand automatically; humans confirm every decision.
- It does not guarantee adherence; it makes delivery and review inspectable.
- It does not lock you to a model, agent, or service. The package is plain
  files in your git.

## Why not just…

**…put it in AGENTS.md?** Agent instruction files are always-on: every
rule rides along on every task, whether it applies or not. ghost guidance
is selected per task, so the agent can leave email rules out of a dashboard,
and the package can grow without growing every prompt.

**…paste the brand guide into the prompt?** All-or-nothing delivery, no
CLI record of what was delivered, and the guide competes with the task for
attention. ghost delivers the subset the agent selects and logs successful
pulls.

**…use RAG over the brand docs?** Search finds what sounds similar.
Applicability is situational: the guidance that governs a payment form may
never share vocabulary with the request. ghost shows the whole selectable
menu with explicit conditions and lets the agent judge applicability directly.

## What it costs to start

You do not need a finished brand book. `ghost init` scaffolds a usable
starter package, and one real decision beats an empty taxonomy: write down
the thing reviewers keep repeating, give it a condition, and let the
package grow from use. Guidance is markdown in your repo, so maintenance
is ordinary review: edit the file, see the diff, merge.

## Repo Layout

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | The public `ghost` CLI, guidance authoring, package validation, gather/pull, review packet assembly, and the skill bundle. | yes: `@design-intelligence/ghost` |
| [`packages/vessel-react`](./packages/vessel-react) | A standalone shadcn component registry and reference component system. | no |
| [`packages/vessel-light`](./packages/vessel-light) | Vessel's design language as a portable `.ghost/` package for agents writing raw HTML/CSS. | no |
| [`packages/context-control`](./packages/context-control) | Selection evaluation bench: measures whether agents choose applicable guidance from the complete menu. | no |
| [`packages/steering-control`](./packages/steering-control) | Before/after evaluation harness: measures what a `.ghost` package buys as a self-contained `report.html`. | no |
| [`apps/docs`](./apps/docs) | Public thesis site and development log. | no |

## Development

```bash
pnpm install
pnpm run quality:all
```

`pnpm build`, `pnpm test`, and `pnpm check` remain available for focused work.
The complete gate also builds retained workspace packages and validates every
checked-in ghost package.

## License

[Apache License 2.0](./LICENSE) · [Governance](./GOVERNANCE.md)
