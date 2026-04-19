import type { Expression } from "../types.js";

/**
 * Render a Expression as a standardized natural language description.
 * This text is fed to embedding models to produce semantic vectors.
 *
 * The description is structured to emphasize design-relevant signals
 * and minimize noise from identifiers or timestamps.
 */
export function describeFingerprint(fp: Expression): string {
  const sections: string[] = [];

  // Observation (Layer 1) — prepend when available for richer semantic embedding
  if (fp.observation) {
    sections.push(fp.observation.summary);
    if (fp.observation.distinctiveTraits.length > 0) {
      sections.push(`${fp.observation.distinctiveTraits.join(". ")}.`);
    }
  }

  // Design decisions (Layer 2)
  if (fp.decisions && fp.decisions.length > 0) {
    const decisionText = fp.decisions
      .map((d) => `${d.dimension}: ${d.decision}`)
      .join(". ");
    sections.push(`${decisionText}.`);
  }

  // Values (Layer 3)
  sections.push(describePalette(fp));
  sections.push(describeSpacing(fp));
  sections.push(describeTypography(fp));
  sections.push(describeSurfaces(fp));

  return sections.filter(Boolean).join(" ");
}

function describePalette(fp: Expression): string {
  const parts: string[] = [];

  const { palette } = fp;

  if (palette.dominant.length > 0) {
    const colors = palette.dominant
      .map((c) => {
        const oklch = c.oklch
          ? `oklch(${c.oklch[0]}, ${c.oklch[1]}, ${c.oklch[2]})`
          : c.value;
        return `${c.role}: ${oklch}`;
      })
      .join(", ");
    parts.push(`Dominant colors: ${colors}.`);
  }

  if (palette.semantic.length > 0) {
    const roles = palette.semantic
      .map((c) => {
        const oklch = c.oklch
          ? `oklch(${c.oklch[0]}, ${c.oklch[1]}, ${c.oklch[2]})`
          : c.value;
        return `${c.role}: ${oklch}`;
      })
      .join(", ");
    parts.push(`Semantic colors: ${roles}.`);
  }

  if (palette.neutrals.count > 0) {
    parts.push(`${palette.neutrals.count}-step neutral gray ramp.`);
  }

  parts.push(
    `${palette.saturationProfile} saturation profile, ${palette.contrast} contrast.`,
  );

  return parts.join(" ");
}

function describeSpacing(fp: Expression): string {
  const { spacing } = fp;
  const parts: string[] = [];

  if (spacing.scale.length > 0) {
    parts.push(`Spacing scale: ${spacing.scale.join(", ")}px.`);
  } else {
    parts.push("No spacing scale detected.");
  }

  if (spacing.baseUnit) {
    parts.push(`Base unit: ${spacing.baseUnit}px.`);
  }

  const regularity =
    spacing.regularity > 0.8
      ? "highly regular"
      : spacing.regularity > 0.4
        ? "moderately regular"
        : "irregular";
  parts.push(`Scale is ${regularity}.`);

  return parts.join(" ");
}

function describeTypography(fp: Expression): string {
  const { typography } = fp;
  const parts: string[] = [];

  if (typography.families.length > 0) {
    parts.push(`Font families: ${typography.families.join(", ")}.`);
  }

  if (typography.sizeRamp.length > 0) {
    const min = typography.sizeRamp[0];
    const max = typography.sizeRamp[typography.sizeRamp.length - 1];
    parts.push(
      `Type scale: ${typography.sizeRamp.length} sizes from ${min}px to ${max}px.`,
    );
  }

  const weightEntries = Object.entries(typography.weightDistribution);
  if (weightEntries.length > 0) {
    const weights = weightEntries
      .map(([w, count]) => `${w} (${count}x)`)
      .join(", ");
    parts.push(`Font weights: ${weights}.`);
  }

  parts.push(`Line height: ${typography.lineHeightPattern}.`);

  return parts.join(" ");
}

function describeSurfaces(fp: Expression): string {
  const { surfaces } = fp;
  const parts: string[] = [];

  if (surfaces.borderRadii.length > 0) {
    parts.push(
      `Border radii: ${surfaces.borderRadii.map((r) => `${r}px`).join(", ")}.`,
    );
  } else {
    parts.push("No border radii detected.");
  }

  parts.push(`Shadow complexity: ${surfaces.shadowComplexity}.`);
  parts.push(`Border usage: ${surfaces.borderUsage}.`);

  return parts.join(" ");
}
