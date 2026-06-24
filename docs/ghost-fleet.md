# Ghost Fleet

`ghost-fleet` is a private workspace package for read-only elevation views
across many design-system or product-surface fingerprints. It is not part of
the public `@anarchitecture/ghost` npm surface.

Per-repo Ghost answers "is this repo using its fingerprint faithfully?" Fleet
answers "what does this set of systems look like together?" It computes
deterministic facts across member snapshots, then the fleet skill turns those
facts into a world-shape narrative.

## Current Shape

Fleet reads a local directory of member snapshots:

```text
fleet/
  members/
    cash-web/
      map.md
      fingerprint.md
      .ghost-sync.json
      fingerprints/
        checkout.md
    dashboard/
      map.md
      fingerprint.md
  reports/
```

Each member is read-only. Fleet does not fetch, refresh, regenerate, or author
member fingerprints. If a member is stale, refresh the source repo or snapshot
outside fleet, then run fleet again.

## CLI

```bash
ghost-fleet members <dir>
ghost-fleet view <dir>
ghost-fleet emit skill
```

- `members` lists loaded members and surfaces missing or malformed inputs.
- `view` writes `fleet.md` and `fleet.json` to `<dir>/reports/`.
- `emit skill` installs the fleet skill bundle into a host agent directory.

The emitted `ghost.fleet/v1` frontmatter contains:

- parent-member pairwise distances;
- scoped fingerprint nodes and node distances;
- track edges read from `.ghost-sync.json`;
- groupings by platform, build system, registry, rendering, and styling.

The CLI intentionally does not write the narrative. The skill fills the body
sections `World shape`, `Cohorts`, and `Tracks` from the deterministic output.

## Boundaries

- Fleet consumes direct `map.md` and `fingerprint.md` snapshots for the private
  fleet workflow. That compatibility shape does not change the public
  `.ghost/` package model.
- Fleet may read scoped overlays from `fingerprints/<scope>.md`; those are
  member snapshots, not nested package roots.
- Clusters are a narrative projection over distances and groupings. They are
  deliberately not serialized into `ghost.fleet/v1` frontmatter.
- The current milestone supports `members`, `view`, and `emit skill`. Separate
  temporal aggregation, refresh, and interactive browsing remain out of scope
  until a real workflow needs them.
