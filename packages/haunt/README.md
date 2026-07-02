# haunt

**The BYO-design-system adherence + drift layer for Ghost. Problem A.**

Ghost splits into two differently-shaped jobs:

- **Fingerprint** (`@anarchitecture/ghost-fingerprint`) — the portable, medium-agnostic on-brand
  generation contract. The knowledge substrate.
- **Haunt** (this package) — the implementation-side adherence + drift layer. It
  bridges to the design-system code a repo already owns and grades high-altitude
  compositional drift against the fingerprint's brand truths.

> **Summon** a ghost. It leaves a **Fingerprint**. Then it **Haunts** the code —
> whether that code is yours or lives in a **Vessel** we provide.

## The wedge

| | Owns code? | Adherence / drift | Stack lock-in |
|---|---|---|---|
| shadcn | you copy & own | none (by design) | none |
| Astryx | yes (their stack) | declines on purpose | high |
| **Haunt** | **no — bridges to yours** | **yes, novel** | **none** |

Haunt is design-system-agnostic. **Vessel** is the reference body it ships
knowing best (richest out-of-the-box read), but Haunt never requires it —
point it at any repo's own components and it still works.

## The mechanism (BYOA)

The deterministic core assembles the evidence — the matched materials + files,
the referenced fingerprint prose, and the diff — and the **host agent renders
the findings**. Prose is the baseline; code is the observable; the inventory
bridge reconnects them.

## Shape

Haunt is a plugin of the fingerprint: it lives in the reserved
`.ghost/haunt/` subtree, always derived from the fingerprint's location, and
has no manifest of its own — the fingerprint's `manifest.yml` is the only
anchor. A haunt package is two flat dirs — no nesting, no inheritance. Brand
truths (principles, composition, stance) live at the `.ghost/` root as
fingerprint prose nodes; haunt checks point at them:

```text
.ghost/
  manifest.yml   # the fingerprint's anchor
  haunt/
    inventory/   # the materials — prose + `paths` to where they live in code.
    checks/      # ghost.check/v1 assertions — `references` bind them to prose.
```

A check is a `ghost.check/v1` document (`name`, `description`, `severity` +
prose body) plus the haunt-side `references` field (required, min 1). Each
reference is either a bare local inventory id (`modals`) or a fingerprint node
target with an optional heading anchor (`principle.trust > Confirmation`) —
one pointer grammar system-wide, shared with `ghost.check/v1`'s `source:`.

**A `.ghost/` fingerprint is required for `ghost-haunt review`** — without brand
truths, review degrades to generic lint. `ghost-haunt init` and `ghost-haunt validate`
work without one.

## CLI

```bash
ghost-haunt init                 # scaffold the .ghost/haunt/ package (inventory + check examples)
ghost-haunt validate             # shape (flat dirs) + check references (local + fingerprint)
ghost-haunt review --diff=-      # advisory packet: matched materials, referenced fingerprint
                           #   prose, offered checks, coverage gaps, diff (agent renders findings)
ghost-haunt integrity            # advisory audit packet: the whole inventory partitioned by
                           #   material — prose, bound checks + baselines, sibling pointers,
                           #   glob match counts, gaps (agent renders findings)
ghost-haunt skill install        # install the host-agent skill bundle
ghost-haunt manifest             # self-describing JSON of commands + flags
```

`ghost haunt <command>` also works via the ghost hub dispatch when both CLIs
are installed.

`ghost-haunt review` requires a resolvable `.ghost/` package (exit 2 with an on-ramp
message otherwise; `--ghost-dir <dir>` overrides the location). The bridge is
one hop: diff files → inventory via `paths`. Offered checks are those whose
`references` hit a touched inventory id, plus every check that references only
fingerprint nodes (brand truths are always in play). The packet embeds each
reference's baseline prose — fingerprint node bodies are sliced to the anchored
heading section. Haunt never edits and never grades on its own.

**Two tenses, one substrate.** `review` grades a change; `integrity` grades
the whole — "does what we own still cohere with what we said, and with
itself?" Sprawl (contracts diverging, naming drifting, variants accumulating)
is invisible at diff granularity, so integrity audits the entire inventory in
one holistic, stateless run: each material bound to its prose, the checks that
reference it, their fingerprint baselines, and its sibling materials. The
packet is a map, not a payload — authored prose plus glob pointers with
verified match counts; the agent reads the code. It also requires `.ghost/`
(exit 2 with the same on-ramp).

## Status

Reconciled onto the fingerprint: two-dir
shape, `ghost.check/v1` checks, `references` grammar, fingerprint-required
review. Deferred: inventory self-linting, the eval/vibe-test harness, and
first-party Vessel knowledge. Private until the self-lint slice lands.
