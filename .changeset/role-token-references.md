---
"ghost-drift": minor
---

Role palette fields accept `{palette.dominant.<role>}` and `{palette.semantic.<role>}` references, so renames in the palette cascade into every role that cites them. `ghost-drift lint` flags unresolved references as `broken-role-reference`.
