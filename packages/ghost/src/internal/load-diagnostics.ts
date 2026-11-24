import type {
  GhostEmbedSnapshot,
  GhostGuidanceDiagnostic,
} from "../embed/types.js";

export function guidanceDiagnostics(
  snapshot: GhostEmbedSnapshot,
): readonly GhostGuidanceDiagnostic[] {
  const warning = snapshot.cascade?.versionWarning;
  return warning ? [...snapshot.invalid, warning] : snapshot.invalid;
}

/** Format loader diagnostics without running lint again. */
export function formatLoadDiagnostics(
  diagnostics: readonly GhostGuidanceDiagnostic[],
): string {
  const skipped = diagnostics.filter((diagnostic) => !("code" in diagnostic));
  const warnings = diagnostics.filter((diagnostic) => "code" in diagnostic);
  return [
    ...(skipped.length
      ? [
          "> Warning: invalid package files were skipped during loading. Fix the files below, then run `ghost validate` (use `--package <dir>` for a custom package).",
          ...skipped.map(
            ({ file, message }) => `> - ${oneLine(file)}: ${oneLine(message)}`,
          ),
        ]
      : []),
    ...warnings.map(({ message }) => `> Warning: ${oneLine(message)}`),
  ].join("\n");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
