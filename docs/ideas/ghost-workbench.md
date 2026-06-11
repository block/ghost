---
status: exploring
---

# Ghost Workbench

> Fingerprint-first context: Ghost Workbench is a safe inspector and playground
> for the `.ghost/fingerprint/` lifecycle. It teaches, previews, and governs the
> portable surface-composition contract; it does not replace that contract.

## Thesis

Ghost needs a local workbench where people can understand and iterate on
fingerprints without having to mentally simulate the CLI, host-agent skill, and
review loop.

The workbench should make the causal chain inspectable:

```text
fingerprint -> context selection -> prompt narrowing -> generated output/diff -> drift review -> stance
```

The product promise is not "a prettier CLI." It is a safe playground where a
team can see what Ghost believes, why it selected certain context, what it left
out, and how governance signals flow back to the durable fingerprint package.

## Product stance

Ghost Workbench should be a separate future app, not a route inside `apps/docs`.
The docs app explains Ghost; the workbench lets people operate Ghost.

It should also be separate from `packages/ghost-ui`. Ghost UI can be reference
inventory and evidence for scenarios, but the workbench is the lifecycle
inspector across arbitrary fingerprint packages. It should not require a shadcn
registry, Ghost UI metadata, or any specific frontend stack.

The first version should be canned-scenario-first. Live filesystem inspection is
powerful, but it is harder to make safe, deterministic, and pedagogical on day
one. Canned scenarios let people learn the model before pointing the workbench
at a real repo with local state, nested packages, large diffs, and unreviewed
fingerprint edits.

## Work areas

### Fingerprint Studio

Author and view the canonical fingerprint layers:

- `fingerprint/prose.yml`
- `fingerprint/inventory.yml`
- `fingerprint/composition.yml`
- `fingerprint/enforcement/checks.yml`
- optional `fingerprint/memory/intent.md`

Studio mode should make the layer boundaries clear. Core layers are canonical
generation input. Checks are deterministic governance. Memory is optional human
context. Generated cache is replaceable source material.

Editing belongs after inspection is trustworthy. Early work should emphasize
readability, validation, and previewing the effect of changes before it allows
saved edits.

### Package Library

Save, load, import, and compare fingerprint packages and workbench snapshots.

The package library is how a team keeps playground work reversible. A snapshot
should capture the package or scenario, selected target path, sample prompt,
emitted context, review/check outputs, and any notes. It should not silently
modify the underlying `.ghost/fingerprint/` package.

### Context Inspector

Explain exactly what Ghost would hand to an agent for a selected target.

The inspector should surface the concepts already present in the context
entrypoint:

- match status
- requested paths
- matched scopes and surface types
- source layers
- identity capsule
- selected prose, composition, exemplars, and checks
- suggested reads
- omissions
- generated cache state

This is the first place the workbench can become excellent: context narrowing is
the invisible part of Ghost that users most need to see.

### Prompt Lab

Let people try sample prompts and see how task intent changes the handoff.

The first Prompt Lab should not promise agent execution. It should show the
prompt, selected context, omitted material, and suggested reads. Later versions
can connect host agents or generation providers, but v1 should teach what the
agent would receive rather than pretend to be the agent.

### Scenario Runner

Run small, deterministic scenarios that demonstrate the Ghost loop.

Scenarios should be explicit product lessons, not generic examples. Each one
should include:

- a small repo shape or fixture
- a target path or diff
- expected match behavior
- expected selected refs
- expected omissions or cache notes
- a short teaching note about what the user should notice

Scenario definitions should be introduced during implementation, not specified
as a public schema in this memo.

### Drift Desk

Inspect checks, advisory review packets, and governance stance.

This area should show the difference between deterministic check failures,
advisory review findings, missing fingerprint coverage, intentional divergence,
and accepted stance. The workbench should keep the human approval boundary
visible: fingerprint edits and stance changes remain deliberate, reviewable
actions.

### Compare And Fleet View

Later, compare fingerprint versions and product fingerprints.

This should build on existing compare and fleet concepts after the context and
scenario loop feels stable. It should help teams understand which dimensions are
moving, which differences are intentional, and where one product has become a
reference for another.

## First vertical slice: Canned Context Inspector

The first buildable slice should prove one promise:

> I can see exactly what Ghost would give an agent, why it chose it, and what it
> left out.

The slice should load checked-in scenarios based on the existing context sandbox
tests. It should not inspect or mutate arbitrary local repos yet.

Minimum behavior:

1. Choose a canned scenario.
2. Show the scenario repo shape, target path, and optional diff.
3. Resolve the fingerprint context.
4. Display match status, matched scopes, selected refs, suggested reads,
   omissions, and generated cache state.
5. Preview the emitted prompt or selected context markdown.
6. Explain what the scenario teaches.

The implementation should be allowed to use existing internal concepts such as
`PackageContext`, `ContextEntrypoint`, review packet JSON, check report JSON,
and future scenario definitions. This memo does not add or freeze any public
API, CLI command, package export, schema, or wire format.

## Canned v1 scenarios

Ground the initial scenario set in existing deterministic coverage:

| Scenario | What it teaches |
| --- | --- |
| Path-matched single surface | Target paths can narrow context to relevant scopes, refs, exemplars, and active checks. |
| Global fallback | Ghost stays useful when no scope matches, but the handoff is broader and should be treated with humility. |
| Nested stack | Child packages can preserve local provenance and child-specific refs. |
| Shared component review | Shared UI files should not invent a local product scope when the change is broad. |
| Multi-stack diff | One diff can produce multiple selected contexts for different changed surfaces. |
| Malformed generated cache | Cache is optional source material and never becomes canonical fingerprint input. |
| Deterministic emission | Repeated context emissions from the same scenario should produce identical output. |

These scenarios should be small enough to inspect by eye and deterministic
enough to serve as regression tests for the workbench.

## Non-goals for v1

- No AI generation engine inside the workbench.
- No automatic fingerprint rewrites.
- No live-repo mutation.
- No requirement to use `ghost-ui`.
- No final scenario schema commitment.
- No new public Ghost package shape.
- No replacement for ordinary Git review of fingerprint edits.

## Later implementation tracks

1. Define the scenario fixture format and runner around existing context
   sandbox behavior.
2. Expose a narrow internal workbench data layer over context entrypoints,
   review packets, and check reports.
3. Scaffold the separate workbench app with a serious inspector UI: dense,
   evidence-led, reversible, and provenance-rich.
4. Build the Canned Context Inspector vertical slice.
5. Add authoring only after inspection, validation, and snapshot behavior are
   trustworthy.
6. Add drift and stance flows after users can already understand the selected
   context.
7. Add live-repo loading last, with clear read-only defaults and explicit
   mutation boundaries.

## Open questions

- What is the right boundary between scenario definitions and generated
  sandbox fixtures?
- Should the workbench eventually call the CLI, import package APIs directly, or
  use a local service layer?
- What should a saved workbench snapshot contain so it is useful in design and
  code review?
- How much authoring should happen in the workbench versus in an editor with
  workbench preview?
- Which stance actions, if any, should be allowed from the UI once live repos
  are supported?
