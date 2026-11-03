# @design-intelligence/ghost

[![npm version](https://img.shields.io/npm/v/@design-intelligence/ghost.svg)](https://www.npmjs.com/package/@design-intelligence/ghost)
[![CI](https://github.com/block/ghost/actions/workflows/ci.yml/badge.svg)](https://github.com/block/ghost/actions/workflows/ci.yml)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-black.svg)](https://github.com/block/ghost/blob/main/LICENSE)

**Brand intelligence for your agents.**

Agents give more people the tools to bring an idea to life. They do not give
everyone the guidance or experience to direct that work. Without clear brand
context, model output tends toward the average.

ghost brings the right brand context into the work your agents create. Record
your brand's decisions as markdown, alongside the code and assets they refer
to. For each task, ghost provides the complete guidance menu. Your agent selects
what is relevant rather than receiving all brand context every time, then ghost
delivers the full guidance and materials before work begins.

A model generates the likeliest thing. ghost helps make your brand the
likeliest thing, so agents can produce work your team would actually use.

ghost works where you do: Claude Code, Codex, Cursor, OpenCode, and Goose. It
uses the agent and model you already use. The CLI does not call a model on its
own or require an API key.

[Get started](#get-started) ·
[Authoring guide](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/authoring.md) ·
[CLI reference](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/schema.md)

> [!NOTE]
> ghost is an early preview. The CLI, package format, and APIs can change
> without migration support, and breaking changes can ship in minor versions.
> Try it on a real repo and tell us what broke or confused you.

## How it works

```text
Your task
   │
   ▼
ghost gather    shows the complete guidance menu
   │
   ▼
Your agent      selects every item that applies
   │
   ▼
ghost pull      delivers the selected guidance and materials
   │
   ▼
Your agent      makes the work; you review the result
```

A `.ghost/` package turns your brand's identity into guidance an agent can
find and use. It keeps broad brand stances, task-specific decisions, and
pointers to concrete materials in one versioned place. The agent sees the
shape of the whole package, then loads only what the current task needs.

```text
.ghost/
├── manifest.yml             package identity and cover
├── glossary.md              the package's own categories
├── brand.md                 guidance every task receives
├── foundation.voice.md      a broad brand decision
├── payment-failure.md       guidance for a specific situation
├── materials/               tokens, examples, and other source files
└── checks/                   optional review instructions
```

You confirm the decisions. Your agent interprets and applies them. ghost makes
that exchange portable, inspectable, and repeatable across agents and models.

## Get started

Requires Node 20.19+ or 22.12+.

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

The skill teaches your agent how to set up and use ghost. If you use several
agents, choose a destination explicitly:

```bash
npx ghost skill install --agent claude
npx ghost skill install --agent cursor
npx ghost skill install --agent codex
npx ghost skill install --agent opencode
npx ghost skill install --agent goose
```

Then ask your agent to create the package:

```text
Set up the ghost package for this repo.
```

Your agent runs `ghost init` and creates starter guidance in `.ghost/`. Treat
those starting answers as provisional until you accept or replace them. Share
existing brand docs, examples you like, or corrections you keep making. Your
agent can turn them into guidance for you to confirm.

## Record one decision

Give your agent a decision and the situation where it applies:

```text
Record this decision as ghost guidance: a payment-failure message states
the known fact and the recovery action. It never speculates about the cause.
```

Your agent drafts a file such as `.ghost/payment-failure.md`:

```markdown
---
for: Writing an email, error message, or support reply about a failed payment.
---

State what we know and what the customer can do next. "Your card was
declined. Try another card or contact your bank." Do not guess at the
reason, and do not imply fault.
```

The `for` line tells the agent when to use the decision. The body says what to
do. Review the draft before accepting it, and link the code or assets that make
the decision concrete.

Now give your agent the work:

```text
Use the ghost guidance to write the email we send when a subscription
renewal is declined.
```

Under that request, the agent runs the selection loop:

```bash
npx ghost gather "email for a declined subscription renewal"
npx ghost pull payment-failure foundation.voice
```

`gather` shows every valid, selectable guidance item. It does not filter or
rank the menu. The agent selects every item that applies and uses `pull` to
load the full guidance, the package cover, and eligible materials.

## What ghost changes

A model starts from broad patterns. Your brand lives in specific decisions:
what to emphasize, what to leave out, which materials to use, and how the parts
fit together. ghost makes those decisions available at the moment an agent
needs them, helping close the gap between model output and brand intent.

| Without ghost | With ghost |
| --- | --- |
| Rely on the model's default guess at your brand | Direct the work with decisions your team confirmed |
| Choose passages by hand for each prompt | Let the agent select from the complete guidance menu |
| Load a whole guide into every task | Pull only the guidance relevant to the task |
| Keep agent-specific copies of brand rules | Use the same package across supported agents |
| Guess whether drift began in selection or execution | Inspect the menu, selections, and local usage summary |
| Review against memory | Add checks tied to the recorded guidance |

To measure the effect on your own brand, use
[context-control](https://github.com/block/ghost/tree/main/packages/context-control)
to test selection and
[steering-control](https://github.com/block/ghost/tree/main/packages/steering-control)
to compare work made with and without a ghost package.

## Where ghost fits

| Tool | Best used for |
| --- | --- |
| `AGENTS.md` | Repo-wide instructions that accompany every task |
| Agent or editor rules | Preferences for one tool or working environment |
| Design tokens | Machine-readable visual values |
| Component libraries | Reusable implementation materials |
| Asset libraries and design files | Source artwork and visual references |
| **ghost** | Brand decisions that apply only in particular situations |

These tools work together. Keep repo-wide operating instructions in
`AGENTS.md`, concrete values in tokens, implementation in components, and
conditional brand guidance in `.ghost/`.

## Review the work

You still judge whether the result follows the decision you recorded. ghost
does not learn your brand on its own, choose guidance for the agent, or score
the result.

Optional checks in `.ghost/checks/` give an agent review instructions tied to
specific guidance. Ask your agent:

```text
Set up ghost review checks for our payment-failure guidance.
Review this diff against those checks.
```

`ghost review` assembles the change, relevant guidance, and checks for the
agent to assess. Checks never enter the generation menu.

## CLI

```bash
npx ghost init              # create a starter package
npx ghost validate          # check guidance and review checks
npx ghost gather "<task>"   # show the complete guidance menu
npx ghost pull <id>         # read selected guidance and the cover
npx ghost review            # assemble a review packet for a diff
npx ghost stats             # summarize local usage
npx ghost skill install     # install the agent skill
```

See the [package and CLI reference](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/schema.md)
for formats and flags, or the [authoring guide](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/authoring.md)
for creating and updating guidance.

## What's in the repo

| Path | Role |
| --- | --- |
| [`packages/ghost`](https://github.com/block/ghost/tree/main/packages/ghost) | The public CLI and agent skill bundle. Install this. |
| [`packages/context-control`](https://github.com/block/ghost/tree/main/packages/context-control) | Tests whether agents select the right guidance. |
| [`packages/steering-control`](https://github.com/block/ghost/tree/main/packages/steering-control) | Compares work made with and without a ghost package. |
| [`packages/vessel-light`](https://github.com/block/ghost/tree/main/packages/vessel-light) | An example design language packaged for raw HTML and CSS work. |
| [`packages/vessel-react`](https://github.com/block/ghost/tree/main/packages/vessel-react) | The reference component system used to exercise ghost workflows. |
| [`apps/docs`](https://github.com/block/ghost/tree/main/apps/docs) | The project site and development log. |

## Contributing

See [Contributing](https://github.com/block/ghost/blob/main/CONTRIBUTING.md) for
local development, tests, and release checks. Project decisions follow the
public [Governance](https://github.com/block/ghost/blob/main/GOVERNANCE.md).

## License

[Apache License 2.0](https://github.com/block/ghost/blob/main/LICENSE)
