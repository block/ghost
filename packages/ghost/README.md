# @design-intelligence/ghost

Use ghost to give agents applicable brand guidance before they start work. A
`.ghost/` package stores your stance, voice, trust moves, and concrete materials
in the repo. Agents select and read that guidance while working on a screen,
email, empty state, or sentence.

Reviewers repeat the same feedback on every surface: "that's not our voice."
Write the decision in `.ghost/` so the next agent has it before starting work.

[Project site](https://block.github.io/ghost/) ·
[Repo](https://github.com/block/ghost)

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

After upgrading, run `npx ghost skill check` to compare the installed skill
with this CLI's bundle. Use `--agent` or `--dest` to select an installation;
the command prints the directory it checks and never modifies it. Review any
local edits before reinstalling with `ghost skill install --force`.

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
ghost init          # scaffold .ghost/ with the starter package
ghost checks init   # opt in to review assertions
ghost validate      # make sure the package is well-formed
ghost gather <ask>  # before building: show the complete guidance menu
ghost pull <ids>    # read the cover plus picked nodes' full bodies
ghost review        # during review: match a diff to guidance and checks
ghost stats         # while tuning: see what agents reached for
ghost skill install # install the unified ghost skill bundle
ghost skill check   # compare an installation with the shipped skill
ghost manifest      # emit a machine-readable index of commands and flags
```

For a task-specific gather, your agent reads the complete, unfiltered menu and
pulls every node whose stated situation applies. `ghost gather --format json` inspects
the catalog without grounding a task.

Run `ghost --help` for the core workflow and `ghost <command> --help` for
current flags and command behavior.

When new work uses unchanged components or prose guidance, name the nodes that
govern the change:

```bash
ghost review --node component.button --node voice
```

Repeat `--node` for each applicable ID. This adds guidance and referencing
checks alongside existing diff matches; it never filters other checks.
Unknown IDs stop review rather than produce a partial packet. Review still
requires `.ghost/checks/`, and the agent decides which offered checks apply.

## Library

```ts
import {
  initGhostPackage,
  lintGhostPackage,
  loadGhostPackage,
} from "@design-intelligence/ghost/package";
import { buildCatalogMenu } from "@design-intelligence/ghost/core";
import {
  gatherGhostPackage,
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
} from "@design-intelligence/ghost/embed";
import { buildCli } from "@design-intelligence/ghost/cli";
```

Embedded hosts can use `@design-intelligence/ghost/embed` for the same semantic
contract as CLI `gather` and `pull` without CLI-only presentation fields or event
side effects. `loadGhostSnapshot` reads the package, resolved/absent/dangling
cover state, glossary kinds, and checks. `gatherGhostPackage` returns the
unfiltered selectable menu without cover content; checks stay separate.
Gather and pull return skipped guidance files in `diagnostics`. Check gather's
`contract.completeness.complete` before treating its menu as complete; these
loading diagnostics do not replace `ghost validate`.
`pullGhostNodes` includes the resolved cover before validated, de-duplicated
selected ids, returns misses with suggestions, stable concrete/prose ordering,
stripped node bodies, extracted Skeletons, and material transport packets. Use
`inspectGhostMaterial` only for materials declared by a pulled node; it is local
and bundled-only by default, with explicit host policy required for referenced
files. Symlinks must resolve within the permitted directory. Pull still inlines
small referenced text by default; use `inlineMaterials: false` before inspection
when the host requires explicit read permission. HTTPS inspection is always
rejected. Included and inspected material is marked `untrusted: true`; hosts
must keep it in a data or tool-result channel
rather than an instruction channel. Embedded operations do not write
`.ghost/.events`; hosts may
persist exported observability events in their own telemetry.

Available subpath exports: `@design-intelligence/ghost`,
`@design-intelligence/ghost/package`,
`@design-intelligence/ghost/core`,
`@design-intelligence/ghost/embed`, and
`@design-intelligence/ghost/cli`.

## Delivery evidence

Process-pipe tests compare complete output for large Unicode bodies, aggregate
pulls, and full guidance menus, including slow readers. Material tests compare
complete accepted text and check that non-inline materials remain explicit
references or unavailable results. A reference is not evidence that its content
was read. Markdown framing and whitespace normalization differ from raw files.

These tests cover the CLI process and embedded operations, not a host's tool
message or the model's use of it. They do not establish that all authored
content survives loading and rendering. If a host clips output, retrieve the
complete result through a lossless host route; do not substitute a summary or
claim complete grounding while required content remains unavailable.

## Project Status: Development Preview

ghost is being built in public, but it is not ready for adoption and the
project is not seeking external testers yet. The CLI, package schema, on-disk
`.ghost/` package shape, and public JavaScript exports may change without
migration support. Breaking changes may ship in minor versions; patch versions
are reserved for fixes that should not require migration.


## License

Apache-2.0
