---
"@anarchitecture/ghost": minor
---

Add `ghost.check/v1`: markdown + frontmatter checks (`name`, `description`,
`severity`, optional `tools` / `turn-limit`, plus a Ghost `surface:` placement),
parsed and linted but never executed by Ghost. Markdown files under a `checks/`
directory lint as checks. This mirrors the established agent-check format so
Ghost can route and ground checks without owning a check engine.
