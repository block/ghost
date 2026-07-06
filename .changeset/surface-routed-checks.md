---
"@decentralized-design/ghost": minor
---

Add markdown checks (`ghost.check/v1`) in a package's `checks/` directory.
`ghost checks --surface <ids>` grounds the named surfaces and offers every
check; the host agent judges which apply. A check binds to the prose it enforces
through an optional `source:` pointer (a node id with an optional `> Heading`),
not by surface routing. Ghost selects, grounds, and emits checks; it never runs
them.
