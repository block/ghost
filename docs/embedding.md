# Embedding ghost

> Audience: embedded-host implementers. Scope: library exports, material access,
> trust boundaries, diagnostics, and host observability.

```ts
import {
  initGhostPackage,
  lintGhostPackage,
  loadGhostPackage,
} from "@design-intelligence/ghost/package";
import { buildCatalogMenu } from "@design-intelligence/ghost/core";
import {
  gatherGhostPackage,
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
} from "@design-intelligence/ghost/embed";
import { buildCli } from "@design-intelligence/ghost/cli";
```

Embedded hosts can use `@design-intelligence/ghost/embed` for the same semantic
contract as CLI `gather` and `pull` without CLI-only presentation fields or event
side effects. `loadGhostSnapshot` reads the package, resolved/absent/dangling
cover state, glossary kinds, and checks. `gatherGhostPackage` returns the
unfiltered selectable menu without cover content; checks stay separate.
Gather and pull return skipped guidance files in `diagnostics`. Check gather's
`contract.completeness.complete` before treating its menu as complete; these
loading diagnostics do not replace `ghost validate`.
`pullGhostNodes` includes the resolved cover before validated, de-duplicated
selected ids, returns misses with suggestions, stable concrete/prose ordering,
stripped node bodies, extracted Skeletons, and material transport packets. Use
`inspectGhostMaterial` only for materials declared by a pulled node; it is local
and bundled-only by default, with explicit host policy required for referenced
files. Symlinks must resolve within the permitted directory. Pull still inlines
small referenced text by default; use `inlineMaterials: false` before inspection
when the host requires explicit read permission. HTTPS inspection is always
rejected. Included and inspected material is marked `untrusted: true`; hosts
must keep it in a data or tool-result channel
rather than an instruction channel. Embedded operations do not write
`.ghost/.events`; hosts may
persist exported observability events in their own telemetry.

Available subpath exports: `@design-intelligence/ghost`,
`@design-intelligence/ghost/package`,
`@design-intelligence/ghost/core`,
`@design-intelligence/ghost/embed`, and
`@design-intelligence/ghost/cli`.

See [Delivery guarantees](./delivery-guarantees.md) for transport boundaries.
