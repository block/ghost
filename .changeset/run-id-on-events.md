---
"@design-intelligence/ghost": minor
---

`gather` and `pull` accept an optional run identifier (`--run <id>` or
`GHOST_RUN_ID`) and stamp it onto their events-tape lines as `run`. Hosts
that invoke Ghost per task can now attribute tape events to a specific run
exactly, instead of guessing by time window. When no identifier is supplied,
tape lines are byte-identical to before — the field is attribution only and
never affects gather or pull output.
