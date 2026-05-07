# Fingerprint Package Schema Reference

Canonical package:

```text
.ghost/fingerprint/
  map.md          ghost.map/v2
  survey.json     ghost.survey/v2
  profile.md      non-enforcing design-language prior
  checks.yml      ghost.checks/v1
```

## `profile.md`

Profile frontmatter may include:

- required: `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`
- optional: `sources`, `references`, `observation.personality`, `observation.resembles`, `decisions[]`, `metadata`, `name`, `slug`, `generator`, `confidence`, `generated`, `extends`

Forbidden: root `schema`, root `embedding`, `checks[]`,
`decisions[].embedding`, `decisions[].decision`,
`decisions[].evidence`, `observation.summary`, and unknown root keys.

The body uses:

```markdown
# Character

# Signature

# Decisions

### color-strategy
```

Evidence bullets live in the body. Profile prose shapes judgment; it does not
enforce CI.

## `checks.yml`

```yaml
schema: ghost.checks/v1
id: my-project
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [checkout]
      paths: [src/checkout]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [typescript]
    evidence:
      support: 0.94
      observed_count: 31
      examples:
        - src/checkout/Button.tsx
    repair: Replace literals with semantic tokens.
```

Detector types:

- `forbidden-regex`
- `required-regex`
- `banned-import`
- `banned-component`
- `required-token`

Statuses:

- `active`: enforced by `ghost-drift check`
- `proposed`: kept as a candidate
- `disabled`: retained but ignored

## Validation

```bash
ghost-fingerprint lint .ghost/fingerprint
ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root .
ghost-drift check --base main
```

`lint` validates all four artifacts together, including check scope references
against `map.md`. `verify-profile` validates profile-to-survey fidelity.
`ghost-drift check` is the deterministic pass/fail gate.
