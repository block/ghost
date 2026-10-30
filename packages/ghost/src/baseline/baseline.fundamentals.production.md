---
for: "Preparing or reviewing final output size, viewing conditions, image resolution, color profiles, or proofs."
requires: [baseline.fundamentals.core, baseline.fundamentals.accessibility]
---

## Usage

A source file can hide failures that appear in a physical print, projected slide, small screen, or distant sign. Production decisions depend on the actual medium and viewing conditions. Color conversion changes relationships as well as individual swatches.

## Rules

- Evaluate the work at 100% output size or intended physical viewing distance, using its actual copy, imagery, type, and color combinations.
- Check representative devices, brightness levels, projections, or print proofs as appropriate; compare critical small text and fine features in the real reproduction conditions.
- Use imagery with sufficient resolution for the intended output. Size type for the medium and distance rather than reusing a numerical size across print, mobile, desktop, environmental, and large-format work.
- For general digital output, use sRGB by default; proof critical print colors.
- Required: Follow supplied, documented color-space, spot-color, and print-profile constraints. Reason: documented technical limits; scope: output governed by those constraints.
- Recheck hierarchy after color-space conversion. Preserve relative value, temperature, and chroma relationships when adapting an inspiration palette.
- At each declared output size, verify intended fonts and media without accidental fallback, missing sources, clipping, overlap, duplicate painting, or disappearing content.

## Never

- Never approve small text or optical balance only while zoomed in — instead inspect the actual output scale.
- Never assume a printed reference swatch guarantees the digital or production value, or that colors reproduce identically across media — instead convert and test the applicable output.
