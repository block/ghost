# @design-intelligence/ghost

Use ghost to give agents applicable brand guidance before they start work. A
`.ghost/` package stores your stance, voice, trust moves, and concrete materials
in the repo. Agents select and read that guidance while working on a screen,
email, empty state, or sentence.

Reviewers repeat the same feedback on every surface: "that's not our voice."
Write the decision in `.ghost/` so the next agent has it before starting work.

[Documentation](https://block.github.io/ghost/) ·
[Repo](https://github.com/block/ghost)

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

## Use It

ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
ghost package, then ask in plain English:

```text
Set up the ghost package for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the ghost package.
Review this diff against the ghost checks.
```

Your agent decides what applies and interprets the guidance. The CLI handles
repeatable work without calling an LLM, so ghost needs no API key and does not
lock you into one agent.

## Use Guidance While Making

Your agent works with the package through a small set of commands:

```bash
ghost init          # scaffold .ghost/ with the skeleton starter
ghost checks init   # opt in to review assertions
ghost validate      # make sure the package is well-formed
ghost gather [ask]  # before building: show the complete guidance menu
ghost pull <ids>    # read the picked nodes' full bodies
ghost review        # during review: match a diff to guidance and checks
ghost export        # bundle the guidance as a portable artifact
ghost pulse         # while tuning: see what agents reached for
```

For a task-specific gather, your agent reads the complete, unfiltered menu and
pulls every node whose stated situation applies. Bare `ghost gather` inspects
the catalog without grounding a task.

Run `ghost --help` for the core workflow and `ghost <command> --help` for
flags. The [CLI reference](https://block.github.io/ghost/docs/cli) covers
every command; [Getting Started](https://block.github.io/ghost/docs/getting-started)
covers the full model. Stuck? See
[Troubleshooting](https://block.github.io/ghost/docs/troubleshooting).

## Library

```ts
import {
  initghostPackage,
  lintghostPackage,
  loadghostPackage,
} from "@design-intelligence/ghost/package";
import { buildCatalogMenu } from "@design-intelligence/ghost/core";
import { buildCli } from "@design-intelligence/ghost/cli";
```

Available subpath exports: `@design-intelligence/ghost`,
`@design-intelligence/ghost/package`,
`@design-intelligence/ghost/core`, and
`@design-intelligence/ghost/cli`. The former package API remains available as
an explicitly deprecated compatibility alias.

## Project Status: Beta

ghost is pre-1.0 and under active development. The CLI, package schema,
on-disk `.ghost/` package shape, and public JavaScript exports may change in
breaking ways before a stable 1.0 release. Breaking changes may ship in minor
versions; patch versions are reserved for fixes that should not require
migration. Pin the version you depend on and review release notes before
upgrading.

Every `ghost` command is also available as `ghost-fingerprint` for when
another tool owns the `ghost` bin.

## License

Apache-2.0
