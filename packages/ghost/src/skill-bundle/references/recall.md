---
name: recall
description: Gather and pull the applicable ghost brand guidance for a task.
---

# Recipe: Recall ghost Package

1. Run `ghost gather <ask>` for the actual task. The cover is inlined by gather;
   do not pull it separately. Read the coverage line: all-prose packages are
   weak steering.
2. Select against `description`; ghost never selects for you. Pull every node
   whose stated situation applies and whose guidance, material, structure, or
   refusal governs the work. Skip inapplicable nodes. Topic overlap alone is not
   applicability.
3. Run `ghost pull <id> [<id>…]`. Prefer `pull` over reading files directly: it
   orders the packet for steering, inlines small local materials, emits
   inspect-pointers for binary materials, extracts Skeletons last, and logs the
   pull to `.ghost/.events`.

## Read order = pull emission order

`ghost pull` emits selected nodes in steering order:

1. Cover first, when explicitly selected; normally it is already inlined by
   gather and should not be pulled separately.
2. Concrete-material nodes: `materials`, substantial fenced examples, or
   `## Skeleton` sections, with materials inlined or pointed to inspect.
3. Prose-only rules: principles, conditions, decisions, and other rules without
   concrete material.
4. Skeleton fences dead last: if one matches the surface, start from that
   structure verbatim.

Return the selected guidance with node ids, how each applies, and where the
package is silent. If no node applies, say so and do not invent ghost-backed
guidance. If silence is safe, proceed provisionally and label it;
if it is brand-defining or high-risk, ask or author a node first.
