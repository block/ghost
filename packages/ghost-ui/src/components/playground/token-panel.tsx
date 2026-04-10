"use client";

import { cn } from "@/lib/utils";

interface SemanticColor {
  role: string;
  value: string;
  oklch?: [number, number, number];
}

interface Fingerprint {
  id: string;
  palette: {
    dominant: SemanticColor[];
    neutrals: { steps: string[]; count: number };
    semantic: SemanticColor[];
    saturationProfile: string;
    contrast: string;
  };
  spacing: {
    scale: number[];
    regularity: number;
    baseUnit: number | null;
  };
  typography: {
    families: string[];
    sizeRamp: number[];
    lineHeightPattern: string;
  };
  surfaces: {
    borderRadii: number[];
    shadowComplexity: string;
    borderUsage: string;
  };
  architecture: {
    tokenization: number;
    methodology: string[];
    componentCount: number;
    namingPattern: string;
  };
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-6 rounded border border-border-card shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <div className="text-xs font-mono truncate">{color}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function TokenPanel({
  fingerprint,
  label,
  variant = "default",
}: {
  fingerprint: Fingerprint;
  label: string;
  variant?: "default" | "drifted";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-5",
        variant === "drifted"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border-card",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm">{label}</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {fingerprint.id}
        </span>
      </div>

      {/* Palette */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Palette
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fingerprint.palette.semantic.map((c) => (
            <ColorSwatch key={c.role} color={c.value} label={c.role} />
          ))}
        </div>
        {fingerprint.palette.neutrals.steps.length > 0 && (
          <div className="flex gap-0.5 h-4 rounded overflow-hidden">
            {fingerprint.palette.neutrals.steps.map((step, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: step }}
              />
            ))}
          </div>
        )}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Saturation: {fingerprint.palette.saturationProfile}</span>
          <span>Contrast: {fingerprint.palette.contrast}</span>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Spacing
        </div>
        <div className="flex items-end gap-1 h-8">
          {fingerprint.spacing.scale.map((v) => (
            <div
              key={v}
              className="bg-foreground/20 rounded-sm"
              style={{
                width: Math.max(v / 4, 2),
                height: Math.min(v / 2, 32),
              }}
              title={`${v}px`}
            />
          ))}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>
            Base: {fingerprint.spacing.baseUnit ?? "none"}px
          </span>
          <span>
            Regularity: {(fingerprint.spacing.regularity * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Typography
        </div>
        <div className="flex flex-wrap gap-1">
          {fingerprint.typography.families.map((f) => (
            <span
              key={f}
              className="rounded bg-muted px-2 py-0.5 text-xs font-mono"
            >
              {f}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {fingerprint.typography.sizeRamp.length} sizes &middot;{" "}
          {fingerprint.typography.lineHeightPattern} line height
        </div>
      </div>

      {/* Architecture */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Architecture
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Components: </span>
            <span className="font-medium">
              {fingerprint.architecture.componentCount}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Tokenization: </span>
            <span className="font-medium">
              {(fingerprint.architecture.tokenization * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Naming: </span>
            <span className="font-mono">
              {fingerprint.architecture.namingPattern}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Methods: </span>
            <span className="font-mono">
              {fingerprint.architecture.methodology.join(", ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
