export const GHOST_RELAY_CONFIG_SCHEMA = "ghost.relay-config/v1" as const;
export const GHOST_DEFAULT_RELAY_CONFIG_ID = "ghost.default/v1" as const;
export const GHOST_PRODUCT_SURFACE_PROFILE =
  "ghost.product-surface/v1" as const;

export const CORE_RELAY_SECTIONS = [
  "intent",
  "inventory",
  "composition",
  "checks",
  "questions",
  "sources",
] as const;

export type GhostCoreSection = (typeof CORE_RELAY_SECTIONS)[number];
export type GhostExtraSection = `extra:${string}`;
export type GhostContextSection = GhostCoreSection | GhostExtraSection;

export interface GhostRelaySourceDeclaration {
  id: string;
  path: string;
  schema?: string;
  section: GhostContextSection;
  items?: string;
  summary?: string;
  include?: string[];
  max_chars?: number;
  visibility?: "public" | "internal";
  priority?: number;
}

export interface GhostRelayConfig {
  schema: typeof GHOST_RELAY_CONFIG_SCHEMA;
  id: string;
  profile?: string;
  sources: GhostRelaySourceDeclaration[];
}

export interface ResolvedGhostRelayConfig {
  config: GhostRelayConfig;
  source: "default" | "file";
  path?: string;
  root: string;
}

const CORE_SECTION_SET = new Set<string>(CORE_RELAY_SECTIONS);

export function isCoreGhostSection(value: string): value is GhostCoreSection {
  return CORE_SECTION_SET.has(value);
}

export function isExtraGhostSection(value: string): value is GhostExtraSection {
  return /^extra:[a-z][a-z0-9_-]*$/.test(value);
}

export function validateGhostSection(value: string): string | undefined {
  if (isCoreGhostSection(value)) return undefined;
  if (isExtraGhostSection(value)) return undefined;
  return `Section '${value}' must be a core Relay section or an extra section such as extra:brand_voice.`;
}

export function validateGhostRelayConfig(config: GhostRelayConfig): string[] {
  const errors: string[] = [];
  if (config.schema !== GHOST_RELAY_CONFIG_SCHEMA) {
    errors.push(`Relay config schema must be ${GHOST_RELAY_CONFIG_SCHEMA}.`);
  }
  if (!config.id?.trim()) {
    errors.push("Relay config id is required.");
  }
  if (!Array.isArray(config.sources)) {
    errors.push("Relay config sources must be an array.");
    return errors;
  }

  const ids = new Set<string>();
  config.sources.forEach((source, index) => {
    const prefix = `sources[${index}]`;
    if (!source.id?.trim()) {
      errors.push(`${prefix}.id is required.`);
    } else if (ids.has(source.id)) {
      errors.push(`${prefix}.id '${source.id}' is duplicated.`);
    } else {
      ids.add(source.id);
    }
    if (!source.path?.trim()) errors.push(`${prefix}.path is required.`);
    const sectionError = validateGhostSection(source.section);
    if (sectionError) errors.push(`${prefix}.section: ${sectionError}`);
    if (source.include !== undefined && !Array.isArray(source.include)) {
      errors.push(`${prefix}.include must be an array.`);
    }
    if (
      source.visibility !== undefined &&
      source.visibility !== "public" &&
      source.visibility !== "internal"
    ) {
      errors.push(`${prefix}.visibility must be public or internal.`);
    }
    if (
      source.max_chars !== undefined &&
      (!Number.isInteger(source.max_chars) || source.max_chars <= 0)
    ) {
      errors.push(`${prefix}.max_chars must be a positive integer.`);
    }
  });
  return errors;
}
