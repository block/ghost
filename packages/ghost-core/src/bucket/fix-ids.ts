import { componentRowId, libraryRowId, tokenRowId, valueRowId } from "./id.js";
import type {
  Bucket,
  ComponentRow,
  LibraryRow,
  TokenRow,
  ValueRow,
} from "./types.js";

/**
 * Recompute every row's `id` from its content fields, producing a new
 * bucket with deterministic IDs.
 *
 * Authoring flow: an agent writes bucket rows with `id: ""` (or any
 * placeholder), then calls `recomputeBucketIds` to populate them, then
 * runs `lintBucket` to validate. This avoids forcing the agent to compute
 * SHA-256 hashes by hand for every row, while keeping the bucket
 * schema's strict id requirement.
 *
 * The function is pure — input bucket is unchanged.
 */
export function recomputeBucketIds(bucket: Bucket): Bucket {
  return {
    ...bucket,
    values: bucket.values.map(
      (row): ValueRow => ({
        ...row,
        id: valueRowId(row.source, row.kind, row.value, row.raw),
      }),
    ),
    tokens: bucket.tokens.map(
      (row): TokenRow => ({
        ...row,
        id: tokenRowId(row.source, row.name),
      }),
    ),
    components: bucket.components.map(
      (row): ComponentRow => ({
        ...row,
        id: componentRowId(row.source, row.name),
      }),
    ),
    libraries: bucket.libraries.map(
      (row): LibraryRow => ({
        ...row,
        id: libraryRowId(row.source, row.name),
      }),
    ),
  };
}
