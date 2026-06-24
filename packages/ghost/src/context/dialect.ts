import { validateGhostCapability } from "./capabilities.js";

export const GHOST_DIALECT_SCHEMA = "ghost.dialect/v1" as const;
export const GHOST_DEFAULT_DIALECT_ID = "ghost.default/v1" as const;
export const GHOST_PRODUCT_SURFACE_PROFILE =
  "ghost.product-surface/v1" as const;

export const CORE_GHOST_LANES = [
  "intent",
  "inventory",
  "composition",
  "checks",
  "questions",
  "provenance",
] as const;

export type GhostCoreLane = (typeof CORE_GHOST_LANES)[number];
export type GhostExtensionLane = `extension:${string}`;
export type GhostSemanticLane = GhostCoreLane | GhostExtensionLane;

export interface GhostProjectionDeclaration {
  items_path?: string;
  id_path?: string;
  summary_path?: string;
  content_paths?: string[];
  max_chars?: number;
}

export interface GhostFacetDeclaration {
  id: string;
  path: string;
  schema?: string;
  lane: GhostSemanticLane;
  capabilities: string[];
  visibility?: "public" | "internal";
  priority?: number;
  merge?: string;
  projection?: GhostProjectionDeclaration;
}

export interface GhostDialect {
  schema: typeof GHOST_DIALECT_SCHEMA;
  id: string;
  profile?: string;
  facets: GhostFacetDeclaration[];
}

export interface ResolvedGhostDialect {
  dialect: GhostDialect;
  source: "default" | "file";
  path?: string;
  root: string;
}

const CORE_LANE_SET = new Set<string>(CORE_GHOST_LANES);

export function isCoreGhostLane(value: string): value is GhostCoreLane {
  return CORE_LANE_SET.has(value);
}

export function isExtensionGhostLane(
  value: string,
): value is GhostExtensionLane {
  return /^extension:[a-z][a-z0-9_-]*$/.test(value);
}

export function validateGhostLane(value: string): string | undefined {
  if (isCoreGhostLane(value)) return undefined;
  if (isExtensionGhostLane(value)) return undefined;
  return `Lane '${value}' must be a core Ghost lane or a namespaced extension lane such as extension:brand_voice.`;
}

export function validateGhostDialect(dialect: GhostDialect): string[] {
  const errors: string[] = [];
  if (dialect.schema !== GHOST_DIALECT_SCHEMA) {
    errors.push(`Dialect schema must be ${GHOST_DIALECT_SCHEMA}.`);
  }
  if (!dialect.id?.trim()) {
    errors.push("Dialect id is required.");
  }
  if (!Array.isArray(dialect.facets)) {
    errors.push("Dialect facets must be an array.");
    return errors;
  }

  const ids = new Set<string>();
  dialect.facets.forEach((facet, index) => {
    const prefix = `facets[${index}]`;
    if (!facet.id?.trim()) {
      errors.push(`${prefix}.id is required.`);
    } else if (ids.has(facet.id)) {
      errors.push(`${prefix}.id '${facet.id}' is duplicated.`);
    } else {
      ids.add(facet.id);
    }
    if (!facet.path?.trim()) errors.push(`${prefix}.path is required.`);
    const laneError = validateGhostLane(facet.lane);
    if (laneError) errors.push(`${prefix}.lane: ${laneError}`);
    if (!Array.isArray(facet.capabilities)) {
      errors.push(`${prefix}.capabilities must be an array.`);
    } else {
      for (const capability of facet.capabilities) {
        const capabilityError = validateGhostCapability(capability);
        if (capabilityError) {
          errors.push(`${prefix}.capabilities: ${capabilityError}`);
        }
      }
    }
    if (
      facet.visibility !== undefined &&
      facet.visibility !== "public" &&
      facet.visibility !== "internal"
    ) {
      errors.push(`${prefix}.visibility must be public or internal.`);
    }
    if (
      facet.projection?.max_chars !== undefined &&
      (!Number.isInteger(facet.projection.max_chars) ||
        facet.projection.max_chars <= 0)
    ) {
      errors.push(`${prefix}.projection.max_chars must be a positive integer.`);
    }
  });
  return errors;
}
