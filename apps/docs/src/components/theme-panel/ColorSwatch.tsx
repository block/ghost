"use client";

interface ColorSwatchProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function ColorSwatch({ value, onChange, label }: ColorSwatchProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative w-7 h-7 rounded-full border border-border overflow-hidden shrink-0 transition-shadow group-hover:shadow-mini">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </div>
      <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/70 uppercase shrink-0">
          {value}
        </span>
      </div>
    </label>
  );
}
