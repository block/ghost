---
name: registry-metadata-current
description: Component additions and reworks keep the registry and its decision metadata in step.
severity: medium
references:
  - asset.registry
---

Grade whether the change keeps the registry contract in `asset.registry`.
Flag:

- a new or reworked high-impact component with no `meta.agent_decision`
  packet (intent, when to use, when not to use, safe variants, misuses,
  token roles);
- hand-edits to generated `public/r/` artifacts instead of regenerating from
  source;
- registry entries whose metadata now contradicts the component's actual
  variants or token usage.
