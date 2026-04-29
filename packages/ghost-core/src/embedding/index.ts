export {
  classifyContrast,
  classifySaturation,
  colorToSemanticColor,
  contrastScore,
  parseColorToOklch,
  resolveColorOklch,
  saturationScore,
} from "./colors.js";
export type { CompareOptions } from "./compare.js";
export { compareExpressions } from "./compare.js";
export { describeExpression } from "./describe.js";
export { computeSemanticEmbedding, embedTexts } from "./embed-api.js";
export { computeEmbedding, embeddingDistance } from "./embedding.js";
export type { RoleCandidate } from "./semantic-roles.js";
export { inferSemanticRole } from "./semantic-roles.js";
export { computeDriftVectors, DIMENSION_RANGES } from "./vector.js";
