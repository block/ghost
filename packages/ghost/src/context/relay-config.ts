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
export type GhostRelayBaseDeclaration =
  | { kind: "fingerprint" }
  | { kind: "none" };

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

export interface GhostRelayStackUnitSourceDeclaration {
  id?: string;
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

export interface GhostRelayStackResolverDeclaration {
  id: string;
  kind: "stack";
  path?: string;
  files?: string[];
  schema?: string;
  match?: Record<string, string | string[]>;
  unit_sources: GhostRelayStackUnitSourceDeclaration[];
}

export type GhostRelayRequestResolverDeclaration =
  GhostRelayStackResolverDeclaration;

export interface GhostRelayConfig {
  schema: typeof GHOST_RELAY_CONFIG_SCHEMA;
  id: string;
  profile?: string;
  base?: GhostRelayBaseDeclaration;
  sources: GhostRelaySourceDeclaration[];
  request_resolvers?: GhostRelayRequestResolverDeclaration[];
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

export function relayConfigBase(
  config: GhostRelayConfig,
): GhostRelayBaseDeclaration {
  return config.base ?? { kind: "fingerprint" };
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
  validateBase(config.base, errors);

  const ids = new Set<string>();
  config.sources.forEach((source, index) => {
    const prefix = `sources[${index}]`;
    validateSourceDeclaration(source, prefix, errors, { ids });
  });
  validateRequestResolvers(config.request_resolvers, errors);
  return errors;
}

function validateBase(base: GhostRelayConfig["base"], errors: string[]): void {
  if (base === undefined) return;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    errors.push("base must be an object.");
    return;
  }
  if (base.kind !== "fingerprint" && base.kind !== "none") {
    errors.push("base.kind must be fingerprint or none.");
  }
}

function validateRequestResolvers(
  resolvers: GhostRelayConfig["request_resolvers"],
  errors: string[],
): void {
  if (resolvers === undefined) return;
  if (!Array.isArray(resolvers)) {
    errors.push("request_resolvers must be an array.");
    return;
  }
  const ids = new Set<string>();
  resolvers.forEach((resolver, index) => {
    const prefix = `request_resolvers[${index}]`;
    if (!resolver.id?.trim()) {
      errors.push(`${prefix}.id is required.`);
    } else if (ids.has(resolver.id)) {
      errors.push(`${prefix}.id '${resolver.id}' is duplicated.`);
    } else {
      ids.add(resolver.id);
    }
    if (resolver.kind !== "stack") {
      errors.push(`${prefix}.kind must be stack.`);
    }
    if (!resolver.path?.trim() && !resolver.files?.length) {
      errors.push(`${prefix}.path or ${prefix}.files is required.`);
    }
    if (resolver.files !== undefined) {
      if (!Array.isArray(resolver.files)) {
        errors.push(`${prefix}.files must be an array.`);
      } else {
        resolver.files.forEach((file, fileIndex) => {
          if (typeof file !== "string" || !file.trim()) {
            errors.push(`${prefix}.files[${fileIndex}] is required.`);
          }
        });
      }
    }
    if (resolver.match !== undefined) {
      if (
        typeof resolver.match !== "object" ||
        resolver.match === null ||
        Array.isArray(resolver.match)
      ) {
        errors.push(`${prefix}.match must be an object.`);
      } else {
        for (const [key, value] of Object.entries(resolver.match)) {
          if (!key.trim()) errors.push(`${prefix}.match key is required.`);
          if (Array.isArray(value)) {
            value.forEach((item, itemIndex) => {
              if (typeof item !== "string" || !item.trim()) {
                errors.push(
                  `${prefix}.match.${key}[${itemIndex}] must be a string.`,
                );
              }
            });
          } else if (typeof value !== "string" || !value.trim()) {
            errors.push(`${prefix}.match.${key} must be a string or array.`);
          }
        }
      }
    }
    if (!Array.isArray(resolver.unit_sources)) {
      errors.push(`${prefix}.unit_sources must be an array.`);
      return;
    }
    resolver.unit_sources.forEach((source, sourceIndex) => {
      validateSourceDeclaration(
        source,
        `${prefix}.unit_sources[${sourceIndex}]`,
        errors,
        { projectableOnly: true, requireId: false },
      );
    });
  });
}

function validateSourceDeclaration(
  source: GhostRelaySourceDeclaration | GhostRelayStackUnitSourceDeclaration,
  prefix: string,
  errors: string[],
  options: {
    ids?: Set<string>;
    projectableOnly?: boolean;
    requireId?: boolean;
  } = {},
): void {
  const requireId = options.requireId ?? true;
  if (requireId) {
    if (!source.id?.trim()) {
      errors.push(`${prefix}.id is required.`);
    } else if (options.ids?.has(source.id)) {
      errors.push(`${prefix}.id '${source.id}' is duplicated.`);
    } else {
      options.ids?.add(source.id);
    }
  } else if (source.id !== undefined && !source.id.trim()) {
    errors.push(`${prefix}.id must be non-empty when provided.`);
  }
  if (!source.path?.trim()) errors.push(`${prefix}.path is required.`);
  const sectionError = validateGhostSection(source.section);
  if (sectionError) errors.push(`${prefix}.section: ${sectionError}`);
  if (options.projectableOnly && !isProjectableSection(source.section)) {
    errors.push(
      `${prefix}.section must be questions, sources, or an extra section such as extra:block_composition.`,
    );
  }
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
}

function isProjectableSection(section: GhostContextSection): boolean {
  return (
    section === "questions" ||
    section === "sources" ||
    isExtraGhostSection(section)
  );
}
