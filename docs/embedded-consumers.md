# Embedded Consumer Contract

This page is for governed hosts that embed Ghost as a library instead of asking
a human to run commands or an agent to drive the CLI. A UI-generation server, a
review-orchestration service, or another controlled host can load a fingerprint
package, present the same selection surface, and record its own receipts without
shelling out to `ghost gather` or `ghost pull` at serve time.

Ghost has three consumer shapes:

- a human at a terminal, reading CLI output;
- a bring-your-own-agent workflow, where an agent drives the CLI and reads the
  emitted packet;
- an embedded host, which imports `@design-intelligence/ghost/core` and
  `@design-intelligence/ghost/fingerprint` and owns presentation, selection,
  authorization, and telemetry.

The third shape must preserve the same load-bearing semantics. The CLI is one
transport for those semantics, not their source of truth.

## Semantics and presentation

| Contract | Library home | Embedded requirement |
| --- | --- | --- |
| Wild-posture gate | `buildGatherMenu(catalog, { includeWild })` returns `{ entries, wildAvailable, wildIncluded }`. | Exclude wild nodes by default. Include them only for an explicit per-request opt-in. Treat `wildAvailable` as discoverability count: hidden wild nodes may advertise that open territory exists, but their ids stay hidden until opted in. |
| Steering order | `orderPulledNodes(nodes)` and `steeringBucket(node)`. | Preserve the pull order: `index` first, then concrete nodes, then steady and wild nodes, then guard nodes. Ordering is stable within each bucket. Do not sort by historical usage, string distance, or model preference. |
| Checks are review assertions | `loadFingerprintPackage` returns `checks: Map<string, LoadedCheck>` from `@design-intelligence/ghost/fingerprint`; check parsing and slicing live in `@design-intelligence/ghost/core`. | `gather` and `pull` never emit checks. Do not put check bodies in generation context. Route checks back to truth nodes through each check's `references`; they are advisory review assertions, not source material for generation. |
| `index` front door | The catalog node whose `id` or `slug` is `index`; bucketed by `steeringBucket`. | Treat `index` as the fingerprint front door. If selected, read it before other pulled nodes, regardless of request order. |
| Skeleton extraction | `stripSkeletonSections(body)` and `extractSkeletonFences(body)`. | Strip Skeleton sections from the prose body handed to generation, then emit extracted fences last as structure seeds for the artifact. The structure starts the artifact; it does not replace the truth text. |

Presentation belongs to each transport. Markdown and JSON formatting, warning
phrases, help text, and process exit codes are CLI presentation. Embedded hosts
may render menus, misses, materials, and skeletons differently as long as the
contracts above stay intact.

## Observability

The `.ghost/.events` tape is CLI transport. It is not canonical state, not part
of the fingerprint semantics, and not a file embedded consumers should write.
Vendored fingerprint packages are read-only content fixtures; do not mutate the
package directory to append events, cache selections, or store receipts.

Library consumers should construct the same event shapes exported from
`@design-intelligence/ghost/fingerprint`: `GatherObservabilityEvent`,
`PullObservabilityEvent`, `GhostObservabilityEvent`,
`NewGhostObservabilityEvent`, `PullMiss`, and `stampGhostEvent`. Record stamped
events in the host's own telemetry or receipt system, alongside the request id,
actor, policy decision, and selected package version.

Pulse data is local tuning signal only. It is for authors to see what agents
reached for and improve descriptions. It must never become ranking, memory, or
canonical fingerprint state. Do not feed historical hit rates back into
`buildGatherMenu`, `orderPulledNodes`, or any other menu ordering path.

## Minimal consumption sketch

```ts
import {
  buildGatherMenu,
  orderPulledNodes,
  stripSkeletonSections,
  extractSkeletonFences,
} from "@design-intelligence/ghost/core";
import {
  loadFingerprintPackage,
  resolveFingerprintPackage,
  stampGhostEvent,
  type GhostObservabilityEvent,
  type NewGhostObservabilityEvent,
} from "@design-intelligence/ghost/fingerprint";

async function buildGhostPacket(input: {
  packageDir?: string;
  request: { ask?: string; allowWild?: boolean };
  selectGhostNodes: (entries: ReturnType<typeof buildGatherMenu>["entries"]) =>
    Promise<string[]>;
  recordGhostEvent: (event: GhostObservabilityEvent) => void;
}) {
  const paths = resolveFingerprintPackage(input.packageDir, process.cwd());
  const loaded = await loadFingerprintPackage(paths);

  const menu = buildGatherMenu(loaded.catalog, {
    includeWild: input.request.allowWild === true,
  });
  const gatherEvent = {
    event: "gather",
    ...(input.request.ask ? { ask: input.request.ask } : {}),
    menu: menu.entries.map((entry) => entry.id),
    wild: input.request.allowWild === true,
    wildIds: menu.entries.filter((entry) => entry.wild).map((entry) => entry.id),
  } satisfies NewGhostObservabilityEvent;
  input.recordGhostEvent(stampGhostEvent(gatherEvent));

  // Host policy, UI, or a host agent selects ids from menu.entries.
  const selectedIds = await input.selectGhostNodes(menu.entries);
  const selectedNodes = selectedIds.flatMap((id) => {
    const node = loaded.catalog.nodes.get(id);
    return node ? [node] : [];
  });

  const pulled = orderPulledNodes(selectedNodes);
  const generationContext = pulled.map((node) => ({
    id: node.id,
    description: node.description,
    body: stripSkeletonSections(node.body).trim(),
    materials: node.materials,
  }));
  const skeletons = pulled.flatMap((node) =>
    extractSkeletonFences(node.body).map((fence) => ({
      nodeId: node.id,
      info: fence.info,
      content: fence.content,
    })),
  );

  const wildIds = pulled.filter((node) => node.wild).map((node) => node.id);
  const pullEvent = {
    event: "pull",
    ids: pulled.map((node) => node.id),
    ...(wildIds.length > 0 ? { wildIds } : {}),
  } satisfies NewGhostObservabilityEvent;
  input.recordGhostEvent(stampGhostEvent(pullEvent));

  return { generationContext, skeletons };
}
```

## Embedders must not

- shell out to the CLI at serve time;
- include wild nodes without an explicit per-request opt-in;
- expose hidden wild-node ids before that opt-in;
- surface check bodies to a generator;
- mutate a fingerprint package directory, including `.ghost/.events`;
- use pulse or historical hit rates to rank, remember, or rewrite the menu.
