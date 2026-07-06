---
"@decentralized-design/ghost": minor
---

Collapse the on-disk node model into the directory tree: the layout supplies the
catalog. A node's id is its file path (`marketing/email.md` → `marketing/email`)
and its parent is its containing directory; a surface is just a directory, and a
directory's own prose lives in its `index.md` (the package-root `index.md` is
the implicit `core` node). The `surfaces.yml` spine file and the `nodes/`
directory are removed, along with the node frontmatter `id` and `under` fields —
identity and containment now come from where a file sits, never from frontmatter
or a declared spine. Node frontmatter carries descriptive properties only
(`description`, `relates`, `incarnation`, plus passthrough keys); `relates` and
cross-package `extends` refs are path ids (`core/trust`, `brand:core/trust`).
`ghost init` scaffolds `manifest.yml` + a core `index.md`; `ghost migrate`
writes a directory tree; any `*.md` outside the reserved `checks/` subtree lints
as a node. Moving a node is a rename — `ghost validate` reports `relates` that no
longer resolve.
