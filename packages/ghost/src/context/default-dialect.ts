import {
  GHOST_DEFAULT_DIALECT_ID,
  GHOST_DIALECT_SCHEMA,
  GHOST_PRODUCT_SURFACE_PROFILE,
  type GhostDialect,
} from "./dialect.js";

export function defaultGhostDialect(): GhostDialect {
  return {
    schema: GHOST_DIALECT_SCHEMA,
    id: GHOST_DEFAULT_DIALECT_ID,
    profile: GHOST_PRODUCT_SURFACE_PROFILE,
    facets: [
      {
        id: "manifest",
        path: "manifest.yml",
        schema: "ghost.fingerprint-package/v1",
        lane: "provenance",
        capabilities: ["source.grounding"],
        visibility: "public",
      },
      {
        id: "intent",
        path: "intent.yml",
        schema: "ghost.intent/v1",
        lane: "intent",
        capabilities: [
          "product.posture",
          "generation.context",
          "review.grounding",
        ],
        visibility: "public",
      },
      {
        id: "inventory",
        path: "inventory.yml",
        schema: "ghost.inventory/v1",
        lane: "inventory",
        capabilities: ["material.evidence", "material.exemplars"],
        visibility: "public",
      },
      {
        id: "composition",
        path: "composition.yml",
        schema: "ghost.composition/v1",
        lane: "composition",
        capabilities: ["design.composition", "review.fidelity"],
        visibility: "public",
      },
      {
        id: "validate",
        path: "validate.yml",
        schema: "ghost.validate/v1",
        lane: "checks",
        capabilities: ["validation.check", "review.rubric"],
        visibility: "public",
      },
    ],
  };
}
