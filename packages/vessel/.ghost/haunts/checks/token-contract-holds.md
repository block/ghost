---
name: token-contract-holds
description: Token and component changes preserve the semantic-role contract and add no broad aliases or raw palette usage.
severity: high
references:
  - asset.tokens
  - principle.named-decisions
---

Grade whether the change preserves the token contract in `asset.tokens`. Flag:

- new component code authored against raw palette utilities or the deprecated
  `background-*`, `text-*`, `border-*` compatibility aliases;
- new broad duplicate aliases (`background-alt`, `border-strong`, or similar)
  instead of narrow, job-named extensions;
- literal color values introduced outside the primitive layer;
- light/dark behavior implemented inside a component rather than the
  token/theme layer;
- tokens bridged into Tailwind that only raw CSS should consume.
