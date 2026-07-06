---
"@design-intelligence/ghost": major
---

Remove cross-package `extends` and inherited nodes. A Ghost package is a single
self-contained contract: its `.ghost/` directory tree is the whole fingerprint.
The manifest no longer accepts `extends`, `relates` targets must be local path
ids (the `<package>:<path>` colon ref is gone), and the catalog drops the
`origin` / inherited-node distinction. Use `ghost --package <dir>` to address a
package; there is no shared-brand inheritance in this version.
