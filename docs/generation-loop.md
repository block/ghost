# Product Fingerprint Loop

Ghost gives UI generators and product-development agents a local, auditable
product fingerprint. The canonical input is the root `.ghost/` bundle:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md
  decisions/
  proposals/
```

`patterns.yml` is the operational composition grammar, `survey.json` is the
evidence ledger, `resources.yml` says what the capture is grounded in,
`checks.yml` contains deterministic gates, `intent.md` is optional human
authority, `decisions/` records optional product-experience rationale, and
`proposals/` stages candidate fingerprint updates. The generator can work
without optional decisions; when they are present, treat accepted decisions as
advisory context and proposals as unresolved candidates.

## Pipeline Shape

```text
.ghost/resources.yml
.ghost/map.md
.ghost/survey.json
.ghost/patterns.yml
.ghost/checks.yml
.ghost/intent.md
.ghost/decisions/*.yml
        |
        v
any generator
(host agent, Cursor, v0, in-house tool)
        |
        v
HTML / JSX / app code
        |
        v
ghost review + ghost check
        |
        v
advisory composition findings + deterministic check results
```

Ghost prepares the input and checks the output; it does not own the generator.
Use any generator that can read local context.

## Pieces

### `.ghost/patterns.yml`

The generator should read this before composing UI. It contains surface types,
composition pattern IDs, repeated anatomy, variants, traits, confidence, and
evidence links back into `survey.json`.

Patterns are advisory in this version. They affect review packets and repair
guidance, not deterministic blocking gates.

### `.ghost/survey.json`

The survey is a lean evidence ledger. It records factual observations:
implemented values, tokens, components, UI surfaces, and optional composition
facts such as ordered anatomy, primary region, action placement, navigation
context, responsive behavior, and confidence.

Interpretation belongs in `patterns.yml` or human-approved `intent.md`, not in
survey prose.

### `.ghost/checks.yml`

Checks are deterministic gates: color allowlists, radius floors, banned
classes, required attributes, and similar rules that can be evaluated without
AI judgment. Checks may carry `surface_types` or `pattern_ids` as metadata so a
reviewer knows which composition scope they belong to, but composition
detectors are a later feature.

### `.ghost/intent.md`

Intent is optional. It is where humans can name product purpose, audience,
voice, or strategic constraints that cannot be proven from code. Agents may
summarize it, but tooling should not require it and should not pretend generated
intent is the user's voice unless a human approves it.

### `.ghost/decisions/*.yml`

Decisions are optional `ghost.decision/v1` files that record accepted/rejected
product-experience rationale with evidence. They are broader than visual style
but narrower than product strategy: the boundary is anything that shapes how the
product is perceived, used, trusted, understood, or safely changed.

Accepted decisions can be included in advisory review with
`ghost review --include-memory`. They do not affect `ghost check`.

### `.ghost/proposals/*.yml`

Proposals are optional `ghost.proposal/v1` files. They record candidate changes
from design reviews, generated UI, QA findings, or PM/engineering
discussion. They are never canonical until a human promotes them.

## Review Loop

`ghost review` reads `.ghost/patterns.yml`, `.ghost/survey.json`,
optional `.ghost/intent.md`, and optional `.ghost/checks.yml`. With
`--include-memory`, it also reads accepted `.ghost/decisions/*.yml`. Advisory
findings should cite pattern evidence, survey evidence, and accepted decisions
when relevant.

`ghost check` reads `.ghost/checks.yml` and remains deterministic. It is
the blocking side of the loop.

When review flags drift, the host agent applies the smallest correction that
brings the output back toward the observed composition grammar. If the drift is
intentional, record a stance with `ghost ack`, `ghost track`, or
`ghost diverge` as appropriate.

## Verification

`ghost verify [dir] --root <root>` checks cross-artifact fidelity:

- pattern evidence exists in `survey.json`
- resource paths are reachable from the supplied root when local
- checks reference known surface types and pattern IDs
- optional decisions/proposals are structurally valid when present

The skill-level verify recipe can still run a generate -> review loop over a
prompt suite, but the deterministic package verifier is the first gate for the
bundle itself.

## Integration Patterns

**In a generation pipeline:** load the root `.ghost/` bundle into the host
agent, generate the requested UI, then run `ghost review` and
`ghost check`.

**In CI:** run deterministic checks for UI-touching changes and attach advisory
review packets when generated or changed UI appears to drift from
`patterns.yml`.

**Fingerprint Capture:** ask your agent to capture the fingerprint, then move in order:
`resources -> map -> survey -> patterns`. Keep `survey.json` factual, promote
repeated composition observations into `patterns.yml`, and add `intent.md` only
when a human has supplied or approved the intent.

**Fingerprint updates:** use `ghost` recipes to recall, brief, critique,
propose, and promote optional decisions/proposals. Keep promotion deliberate:
proposals are unresolved candidates; accepted decisions are advisory context;
active checks are the only blocking mechanism.
