---
"@design-intelligence/ghost": minor
---

Add load diagnostics to gather, pull, and review JSON and embedded results, with actionable warnings in Markdown. Gather and pull report skipped invalid guidance; review also reports skipped invalid checks. All-miss CLI pulls keep stdout empty and report load diagnostics on stderr before exiting with code 2.

Breaking API change: gather's `contract.completeness.complete` changes from literal `true` to `boolean` and is `false` when invalid guidance was skipped. Consumers must check the value before treating the menu as complete. Healthy results include `diagnostics: []`; no on-disk schema migration is required. Unreadable directories and malformed present glossaries now fail loading instead of appearing absent.
