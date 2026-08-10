---
"@design-intelligence/ghost": patch
---

`ghost pull` now inlines each distinct material file once per pull: the first node in output order carries the content, and later nodes that declare the same file point at the copy already in context instead of repeating it.
