---
name: ground
description: Ground before generating by gathering, selecting, pulling, and inspecting.
---

# Recipe: Ground Before Generating

Use this before writing UI, copy, email, review text, or any other output that
should be shaped by a ghost package.

## Gather and select

Run `ghost gather <ask>` with the real task, not a generic label. Read the
supplied guidance, then check every item under `Available guidance`. Pull every
id whose `Applies when` condition fits the task. Skip clear non-matches; topic
overlap alone is not enough.

The cover is not in this menu because every pull includes it automatically. If
nothing in the list applies, run bare `ghost pull` for the cover and uncovered-
guidance policy.

## Pull and inspect

Run `ghost pull <id> [<id>…]`. Use the returned guidance directly instead of
rewriting it into a brief or checklist. Inspect any material the output tells
you to inspect before generating; [making.md](making.md) covers unavailable or
external material.

`ghost pull` records the selected ids. After compaction or a session handoff,
re-run it with the same ids to restore the cover and selected guidance.

Then make the requested artifact. When the output includes a matching starting
structure, begin from it verbatim and fill it with task content.
