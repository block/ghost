# ghost

[![npm version](https://img.shields.io/npm/v/@design-intelligence/ghost.svg)](https://www.npmjs.com/package/@design-intelligence/ghost)
[![CI](https://github.com/block/ghost/actions/workflows/ci.yml/badge.svg)](https://github.com/block/ghost/actions/workflows/ci.yml)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-black.svg)](./LICENSE)

![brand intelligence for your agents](https://github.com/user-attachments/assets/d4dce405-387e-44b9-93c1-fad91743622c)

Agents can make almost anything. The hard part is making it yours.

_ghost_ keeps your brand decisions alongside your code and assets. Before each task, it gives your agent the relevant guidance and materials.

Models generate the likeliest thing. _ghost_ helps make **your brand** the likeliest thing.

It works with the tools, agents, and models you already use. The CLI doesn't make its own model calls or need an API key.

> [!NOTE]
> ghost is an early preview. The CLI, package format, and APIs can change
> without migration support, and breaking changes can ship in minor versions.
>
> Try it on a real repo and tell us what broke or confused you.

[Get started](./packages/ghost/README.md#get-started) ·
[Authoring guide](./packages/ghost/src/skill-bundle/references/authoring.md) ·
[CLI reference](./packages/ghost/src/skill-bundle/references/schema.md)

## Same prompt, two results

| Without ghost | With ghost |
| --- | --- |
| _Add image_ | _Add image_ |

## How it works

_ghost_ separates mechanics from guidance. The mechanics determine which
nodes are available, when they apply, what travels with them, and what
reviewers check. Guidance is the brand context those mechanics deliver to the
agent.

![guidance moving from a ghost package into agent work](https://github.com/user-attachments/assets/8685af17-fb8e-4ae2-bdca-6cdff41fcf44)

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
ghost pull      delivers the guidance and materials
   │
   ▼
Your agent      makes the work; you review the result
```

A `.ghost/` package is a versioned set of markdown files:

```text
.ghost/
├── manifest.yml          package identity and cover
├── glossary.md           your vocabulary
├── brand.md              guidance every task receives
├── foundation.voice.md   a broad brand decision
├── payment-recovery.md   guidance for one situation
├── materials/            tokens, examples, and source files
└── checks/                optional review instructions
```

Your agent sees the complete menu and pulls only what applies. _ghost_ never
ranks the menu or selects guidance for the agent.

## Go deeper

- [Package guide](./packages/ghost/README.md) — setup, everyday use, and review
- [Authoring guide](./packages/ghost/src/skill-bundle/references/authoring.md) — write and maintain guidance
- [CLI reference](./packages/ghost/src/skill-bundle/references/schema.md) — commands, formats, and flags
- [context-control](./packages/context-control) — test whether agents select the right guidance
- [steering-control](./packages/steering-control) — compare work made with and without ghost
- [Contributing](./CONTRIBUTING.md) — develop and release the project

## License

[Apache License 2.0](./LICENSE)
