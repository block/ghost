---
name: generate
description: Generate or revise UI from Ghost fingerprint layers.
---

# Recipe: Generate From Ghost Fingerprint

Generation starts from the checked-in fingerprint contract. Review and checks
validate the result afterward; they do not replace prose, inventory, and
composition as inputs.

## 1. Build The Packet

```bash
ghost emit context-bundle
```

Use the packet directly when available. If you inspect files manually, read
`fingerprint/prose.yml`, `fingerprint/inventory.yml`, and
`fingerprint/composition.yml` before implementation.

## 2. Apply The Contract

- Select relevant `prose.situations`, `prose.principles`, and
  `prose.experience_contracts`.
- Inspect matching `inventory.exemplars` and building blocks before choosing
  structure, components, copy, motion, or density.
- Use `composition.patterns` to decide how the surface should be assembled.
- Treat active checks as deterministic guardrails to avoid, not as generation
  source material.
- Use optional cache, intent, accepted decisions, and stacks only when present
  or requested.

## 3. Implement

Build the smallest product-appropriate change that satisfies the task and the
applicable fingerprint refs. If the fingerprint is silent, continue from nearby
product surfaces and local conventions when safe, and label that reasoning as
provisional and non-Ghost-backed.

## 4. Verify

After implementation, run the checks that fit the change:

```bash
ghost check --base <ref>
ghost review --base <ref>
```

Use screenshots, browser inspection, or product tests when visual fidelity,
layout, motion, accessibility, or interaction quality matters. Fix active-check
failures first. Treat advisory findings as product-experience guidance unless
they are tied to an active deterministic check.
