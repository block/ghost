---
name: ground
description: Ground before generating by gathering, selecting, pulling, and inspecting.
---

# Recipe: Ground Before Generating

Use this before writing UI, copy, email, review text, or any other output that
should be shaped by a ghost package.

## Gather and select

Use `--package <dir>` for a standalone or legacy package. If the fingerprint's
manifest declares `universal`, use
`--package <fingerprint-dir> --universal <universal-dir>`. Keep the same package
flags for every command in this recipe.

Run `ghost gather <ask>` with the real task, not a generic label. Read the
supplied guidance, then check every item under `Available guidance`. Pull every
id whose `Applies when` condition fits the task. Skip clear non-matches; topic
overlap alone is not enough. Honor the kind's selection rules too.

If the output reports excluded guidance, do not interpret it as silence. Run
`ghost validate` with the same package flags, then resolve the reported
failures or state the grounding gap before continuing provisionally.

The cover is not in this menu because every pull includes it automatically. If
nothing in the list applies, run bare `ghost pull` with the same package flags for the
cover and uncovered-guidance policy.

## Pull and inspect

Run `ghost pull <id> [<id>…]` with the same package flags. Use the returned
guidance directly instead of rewriting it into a brief or checklist. Inspect
any material the output tells
you to inspect before generating; [making.md](making.md) covers unavailable or
external material.

`ghost pull` records the selected ids. After compaction or a session handoff,
re-run it with the same ids and package flags to restore the cover and selected
guidance.

Then make the requested artifact. When the output includes a matching starting
structure, begin from it verbatim and fill it with task content.
