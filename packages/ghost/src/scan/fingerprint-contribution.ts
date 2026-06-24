import type {
  GhostFingerprintDocument,
  GhostValidateDocument,
} from "#ghost-core";

export type ScanContributionState =
  | "missing"
  | "invalid"
  | "empty"
  | "contributing";

export type ScanFacet = "intent" | "inventory" | "composition" | "validate";
export type ScanFacetState = "absent" | "empty" | "useful";

export interface ScanFacetFileState {
  path: string;
  present: boolean;
}

export interface ScanFacetReport {
  state: ScanFacetState;
  /** Absolute path to the facet file. */
  path: string;
  file_present: boolean;
  count: number;
  reasons: string[];
}

export interface ScanBuildingBlockRows {
  tokens: number;
  components: number;
  libraries: number;
  assets: number;
  routes: number;
  files: number;
  notes: number;
}

export interface ScanValidateCounts {
  active: number;
  proposed: number;
  disabled: number;
}

export interface ScanContributionReport {
  state: ScanContributionState;
  facets: Record<ScanFacet, ScanFacetReport>;
  contributing_facets: ScanFacet[];
  empty_facets: ScanFacet[];
  absent_facets: ScanFacet[];
  reasons: string[];
  product_surface_count: number;
  demo_surface_count: number;
  building_block_rows: ScanBuildingBlockRows;
  validate_counts: ScanValidateCounts;
}

const FACETS: ScanFacet[] = ["intent", "inventory", "composition", "validate"];

export function summarizeFingerprintContribution(input: {
  fingerprint?: GhostFingerprintDocument;
  validate?: GhostValidateDocument;
  files: Record<ScanFacet, ScanFacetFileState>;
  missing?: boolean;
  invalidReason?: string;
}): ScanContributionReport {
  const buildingBlockRows = countBuildingBlocks(input.fingerprint);
  const counts: Record<ScanFacet, number> = {
    intent: countIntent(input.fingerprint),
    inventory: countInventory(input.fingerprint, buildingBlockRows),
    composition: countComposition(input.fingerprint),
    validate: countValidate(input.validate),
  };
  const validateCounts = countValidateStatuses(input.validate);
  const facets = Object.fromEntries(
    FACETS.map((facet) => [
      facet,
      facetReport(facet, input.files[facet], counts[facet]),
    ]),
  ) as Record<ScanFacet, ScanFacetReport>;
  const contributingFacets = FACETS.filter(
    (facet) => facets[facet].state === "useful",
  );
  const emptyFacets = FACETS.filter((facet) => facets[facet].state === "empty");
  const absentFacets = FACETS.filter(
    (facet) => facets[facet].state === "absent",
  );

  const state: ScanContributionState = input.missing
    ? "missing"
    : input.invalidReason
      ? "invalid"
      : contributingFacets.length > 0
        ? "contributing"
        : "empty";

  return {
    state,
    facets,
    contributing_facets: contributingFacets,
    empty_facets: emptyFacets,
    absent_facets: absentFacets,
    reasons: contributionReasons(state, {
      contributingFacets,
      emptyFacets,
      absentFacets,
      invalidReason: input.invalidReason,
    }),
    product_surface_count: input.fingerprint?.inventory.exemplars.length ?? 0,
    demo_surface_count: 0,
    building_block_rows: buildingBlockRows,
    validate_counts: validateCounts,
  };
}

function facetReport(
  facet: ScanFacet,
  file: ScanFacetFileState,
  count: number,
): ScanFacetReport {
  const state: ScanFacetState = !file.present
    ? "absent"
    : count > 0
      ? "useful"
      : "empty";
  return {
    state,
    path: file.path,
    file_present: file.present,
    count,
    reasons: facetReasons(facet, state, count),
  };
}

function facetReasons(
  facet: ScanFacet,
  state: ScanFacetState,
  count: number,
): string[] {
  if (state === "useful") {
    return [`${facet}.yml contributes ${count} useful item(s).`];
  }
  if (state === "empty") {
    return [
      `${facet}.yml is present but does not contribute useful items yet.`,
    ];
  }
  return [
    `${facet}.yml is absent; this package contributes no ${facet} facet.`,
  ];
}

function contributionReasons(
  state: ScanContributionState,
  input: {
    contributingFacets: ScanFacet[];
    emptyFacets: ScanFacet[];
    absentFacets: ScanFacet[];
    invalidReason?: string;
  },
): string[] {
  if (state === "missing") {
    return [
      "manifest.yml is missing, so no package contribution can be resolved.",
    ];
  }
  if (state === "invalid") {
    return [
      `fingerprint package could not be read: ${input.invalidReason ?? "invalid fingerprint package"}`,
    ];
  }
  if (state === "empty") {
    const detail = input.emptyFacets.length
      ? ` Empty facets: ${input.emptyFacets.join(", ")}.`
      : "";
    const absent = input.absentFacets.length
      ? ` Absent facets may be inherited from broader stack context: ${input.absentFacets.join(", ")}.`
      : "";
    return [
      `Ghost package is valid but this package contributes no useful facets yet.${detail}${absent}`,
    ];
  }

  const absent = input.absentFacets.length
    ? ` Absent facets may be inherited from broader stack context: ${input.absentFacets.join(", ")}.`
    : "";
  const empty = input.emptyFacets.length
    ? ` Empty facets: ${input.emptyFacets.join(", ")}.`
    : "";
  return [
    `Ghost package contributes ${input.contributingFacets.join(", ")}.${empty}${absent}`,
  ];
}

function countIntent(
  fingerprint: GhostFingerprintDocument | undefined,
): number {
  if (!fingerprint) return 0;
  return (
    summaryFieldCount(fingerprint.intent.summary) +
    fingerprint.intent.situations.length +
    fingerprint.intent.principles.length +
    fingerprint.intent.experience_contracts.length
  );
}

function countInventory(
  fingerprint: GhostFingerprintDocument | undefined,
  buildingBlockRows: ScanBuildingBlockRows,
): number {
  if (!fingerprint) return 0;
  return (
    (fingerprint.inventory.topology.scopes?.length ?? 0) +
    (fingerprint.inventory.topology.surface_types?.length ?? 0) +
    fingerprint.inventory.exemplars.length +
    fingerprint.inventory.sources.length +
    buildingBlockRows.tokens +
    buildingBlockRows.components +
    buildingBlockRows.libraries +
    buildingBlockRows.assets +
    buildingBlockRows.routes +
    buildingBlockRows.files +
    buildingBlockRows.notes
  );
}

function countComposition(
  fingerprint: GhostFingerprintDocument | undefined,
): number {
  return fingerprint?.composition.patterns.length ?? 0;
}

function countValidate(validate: GhostValidateDocument | undefined): number {
  return validate?.checks.length ?? 0;
}

function countValidateStatuses(
  validate: GhostValidateDocument | undefined,
): ScanValidateCounts {
  const counts: ScanValidateCounts = { active: 0, proposed: 0, disabled: 0 };
  for (const check of validate?.checks ?? []) {
    counts[check.status] += 1;
  }
  return counts;
}

function countBuildingBlocks(
  fingerprint: GhostFingerprintDocument | undefined,
): ScanBuildingBlockRows {
  const buildingBlocks = fingerprint?.inventory.building_blocks;
  return {
    tokens: buildingBlocks?.tokens?.length ?? 0,
    components: buildingBlocks?.components?.length ?? 0,
    libraries: buildingBlocks?.libraries?.length ?? 0,
    assets: buildingBlocks?.assets?.length ?? 0,
    routes: buildingBlocks?.routes?.length ?? 0,
    files: buildingBlocks?.files?.length ?? 0,
    notes: buildingBlocks?.notes?.length ?? 0,
  };
}

function summaryFieldCount(
  summary: GhostFingerprintDocument["intent"]["summary"],
): number {
  let count = 0;
  if (summary.product?.trim()) count += 1;
  for (const field of [
    summary.audience,
    summary.goals,
    summary.anti_goals,
    summary.tradeoffs,
    summary.tone,
  ]) {
    count += field?.length ?? 0;
  }
  return count;
}
