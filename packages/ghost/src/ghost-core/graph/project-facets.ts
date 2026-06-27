import type { GhostFingerprintDocument } from "../fingerprint/types.js";
import type { GhostGraphNode } from "./types.js";

/**
 * TRANSITION SCAFFOLD — delete in the facet-removal phase.
 *
 * Project the legacy facet model into pure-prose graph nodes so existing
 * packages and fixtures yield a graph for free while consumers migrate. This is
 * intentionally lossy: it keeps each entry's id, surface placement (`under`),
 * and its primary text (as the node body), and drops the affordances Option A
 * removes (`evidence`, `guidance`, `check_refs`, pattern `kind`, exemplar
 * paths). No new code should treat this output as authoritative structure.
 */
export function projectFacetsToNodes(
  fingerprint: GhostFingerprintDocument,
): GhostGraphNode[] {
  const nodes: GhostGraphNode[] = [];

  const push = (id: string, surface: string | undefined, body: string) => {
    nodes.push({
      id,
      ...(surface ? { under: surface } : {}),
      relates: [],
      body,
      origin: "facet-projection",
    });
  };

  for (const s of fingerprint.intent.situations) {
    push(
      s.id,
      s.surface,
      s.user_intent ?? s.product_obligation ?? s.title ?? s.id,
    );
  }
  for (const p of fingerprint.intent.principles) {
    push(p.id, p.surface, p.principle);
  }
  for (const c of fingerprint.intent.experience_contracts) {
    push(c.id, c.surface, c.contract);
  }
  for (const x of fingerprint.inventory.exemplars) {
    push(x.id, x.surface, x.why ?? x.note ?? x.title ?? x.path);
  }
  for (const pat of fingerprint.composition.patterns) {
    push(pat.id, pat.surface, pat.pattern);
  }

  return nodes;
}
