# ghost

[![npm version](https://img.shields.io/npm/v/@design-intelligence/ghost.svg)](https://www.npmjs.com/package/@design-intelligence/ghost)
[![CI](https://github.com/block/ghost/actions/workflows/ci.yml/badge.svg)](https://github.com/block/ghost/actions/workflows/ci.yml)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-black.svg)](./LICENSE)

![brand intelligence for your agents](https://github.com/user-attachments/assets/d4dce405-387e-44b9-93c1-fad91743622c)

Agents help us bring more ideas to life, faster. But without the right brand context, the result looks exactly like what it is: agent work.

_ghost_ keeps your brand decisions alongside your code and assets. Before each task, it gives your agent the relevant guidance and materials.

Models generate the likeliest thing. _ghost_ helps make **your brand** the likeliest thing.

It works with the tools, agents, and models you already use. The CLI doesn't make its own model calls or need an API key.


> [!NOTE]
> ghost is an early preview. The CLI, package format, and APIs can change
> without migration support, and breaking changes can ship in minor versions.

> Try it on a real repo and tell us what broke or confused you.

[Get started](#get-started) ·
[Authoring guide](./packages/ghost/src/skill-bundle/references/authoring.md) ·
[CLI reference](./packages/ghost/src/skill-bundle/references/schema.md)

## How it works

![guidance-animation](https://github.com/user-attachments/assets/8685af17-fb8e-4ae2-bdca-6cdff41fcf44)

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
├── glossary.md              the package's own kinds
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
[context-control](./packages/context-control) to test selection and
[steering-control](./packages/steering-control) to compare work made with and
without a ghost package.

## Where ghost fits

| Tool | Best used for |
| --- | --- |
| `AGENTS.md` | Repo-wide instructions that accompany every task |
| Agent or editor rules | Preferences for one tool or working environment |
| Design tokens | Machine-readable visual values |
| Component libraries | Reusable implementation materials |
| Asset libraries and design files | Source artwork and visual references |
| **ghost** | Broad brand stances and decisions for particular situations |

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

See the [package and CLI reference](./packages/ghost/src/skill-bundle/references/schema.md)
for formats and flags, or the [authoring guide](./packages/ghost/src/skill-bundle/references/authoring.md)
for creating and updating guidance.

## What's in this repo

| Path | Role |
| --- | --- |
| [`packages/ghost`](./packages/ghost) | The public CLI and agent skill bundle. Install this. |
| [`packages/context-control`](./packages/context-control) | Tests whether agents select the right guidance. |
| [`packages/steering-control`](./packages/steering-control) | Compares work made with and without a ghost package. |
| [`packages/vessel-light`](./packages/vessel-light) | An example design language packaged for raw HTML and CSS work. |
| [`packages/vessel-react`](./packages/vessel-react) | The reference component system used to exercise ghost workflows. |
| [`apps/docs`](./apps/docs) | The project site and development log. |

## Contributing

See [Contributing](./CONTRIBUTING.md) for local development, tests, and release
checks. Project decisions follow the public [Governance](./GOVERNANCE.md).

## License

[Apache License 2.0](./LICENSE)
