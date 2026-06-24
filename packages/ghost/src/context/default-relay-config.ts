import {
  GHOST_DEFAULT_RELAY_CONFIG_ID,
  GHOST_PRODUCT_SURFACE_PROFILE,
  GHOST_RELAY_CONFIG_SCHEMA,
  type GhostRelayConfig,
} from "./relay-config.js";

export function defaultGhostRelayConfig(): GhostRelayConfig {
  return {
    schema: GHOST_RELAY_CONFIG_SCHEMA,
    id: GHOST_DEFAULT_RELAY_CONFIG_ID,
    profile: GHOST_PRODUCT_SURFACE_PROFILE,
    base: { kind: "fingerprint" },
    sources: [
      {
        id: "manifest",
        path: "manifest.yml",
        schema: "ghost.fingerprint-package/v1",
        section: "sources",
        visibility: "public",
      },
      {
        id: "intent",
        path: "intent.yml",
        schema: "ghost.intent/v1",
        section: "intent",
        visibility: "public",
      },
      {
        id: "inventory",
        path: "inventory.yml",
        schema: "ghost.inventory/v1",
        section: "inventory",
        visibility: "public",
      },
      {
        id: "composition",
        path: "composition.yml",
        schema: "ghost.composition/v1",
        section: "composition",
        visibility: "public",
      },
      {
        id: "validate",
        path: "validate.yml",
        schema: "ghost.validate/v1",
        section: "checks",
        visibility: "public",
      },
    ],
  };
}
