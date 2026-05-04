import {
  componentRowId,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "./id.js";
import type {
  ComponentRow,
  Survey,
  TokenRow,
  UiSurfaceRow,
  ValueRow,
} from "./types.js";

/**
 * Recompute every row's `id` from its content fields, producing a new
 * survey with deterministic IDs.
 *
 * Authoring flow: an agent writes survey rows with `id: ""` (or any
 * placeholder), then calls `recomputeSurveyIds` to populate them, then
 * runs `lintSurvey` to validate. This avoids forcing the agent to compute
 * SHA-256 hashes by hand for every row, while keeping the survey
 * schema's strict id requirement.
 *
 * The function is pure — input survey is unchanged.
 */
export function recomputeSurveyIds(survey: Survey): Survey {
  return {
    ...survey,
    values: survey.values.map(
      (row): ValueRow => ({
        ...row,
        id: valueRowId(row.source, row.kind, row.value, row.raw),
      }),
    ),
    tokens: survey.tokens.map(
      (row): TokenRow => ({
        ...row,
        id: tokenRowId(row.source, row.name),
      }),
    ),
    components: survey.components.map(
      (row): ComponentRow => ({
        ...row,
        id: componentRowId(row.source, row.name),
      }),
    ),
    ui_surfaces: survey.ui_surfaces.map(
      (row): UiSurfaceRow => ({
        ...row,
        id: uiSurfaceRowId(row.source, row.name, row.kind, row.locator),
      }),
    ),
  };
}
