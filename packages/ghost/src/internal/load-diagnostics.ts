/** Format the loader's existing skipped-file records without running lint again. */
export function formatLoadDiagnostics(
  diagnostics: readonly Readonly<{ file: string; message: string }>[],
): string {
  if (diagnostics.length === 0) return "";
  return [
    "> Warning: invalid package files were skipped during loading. Fix the files below, then run `ghost validate` (use `--package <dir>` for a custom package).",
    ...diagnostics.map(
      ({ file, message }) => `> - ${oneLine(file)}: ${oneLine(message)}`,
    ),
  ].join("\n");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
