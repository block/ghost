import { lintFingerprint, parseFingerprint } from "@ghost/core/browser";
import { useMemo } from "react";

interface FingerprintPreviewProps {
  source: string;
  showLint?: boolean;
  showBody?: boolean;
}

export function FingerprintPreview({
  source,
  showLint = true,
  showBody = false,
}: FingerprintPreviewProps) {
  const parsed = useMemo(() => {
    try {
      return { kind: "ok" as const, value: parseFingerprint(source) };
    } catch (err) {
      return { kind: "err" as const, message: (err as Error).message };
    }
  }, [source]);

  if (parsed.kind === "err") {
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        <strong>parse error:</strong> {parsed.message}
      </div>
    );
  }

  const fp = parsed.value.fingerprint;
  const body = parsed.value.body;

  return (
    <div className="my-4 rounded-lg border border-border-card bg-muted/40 p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="font-display text-base font-semibold tracking-tight text-foreground">
            {fp.id}
          </div>
          {fp.source && (
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              {fp.source}
            </div>
          )}
        </div>
        {fp.timestamp && (
          <div className="text-xs font-mono text-muted-foreground">
            {fp.timestamp}
          </div>
        )}
      </div>

      {fp.observation?.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {fp.observation.summary}
        </p>
      )}

      {fp.observation?.personality && fp.observation.personality.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fp.observation.personality.map((trait) => (
            <span
              key={trait}
              className="inline-block rounded border border-border-card bg-background px-1.5 py-0.5 text-xs font-mono text-foreground"
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      {showBody && body?.character && (
        <div className="border-t border-border/40 pt-3 text-sm text-muted-foreground leading-relaxed">
          {body.character}
        </div>
      )}

      {showLint && <LintReport source={source} />}
    </div>
  );
}

function LintReport({ source }: { source: string }) {
  const report = useMemo(() => {
    try {
      return lintFingerprint(source);
    } catch {
      return null;
    }
  }, [source]);

  if (!report) return null;
  const total = report.issues.length;
  const errors = report.issues.filter((i) => i.severity === "error").length;
  const warns = report.issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="border-t border-border/40 pt-3">
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className={errors === 0 ? "text-foreground" : "text-destructive"}>
          lint:{" "}
          {errors === 0 ? "ok" : `${errors} error${errors === 1 ? "" : "s"}`}
        </span>
        {warns > 0 && (
          <span className="text-muted-foreground">
            {warns} warning{warns === 1 ? "" : "s"}
          </span>
        )}
        {total === 0 && (
          <span className="text-muted-foreground">no issues</span>
        )}
      </div>
    </div>
  );
}
