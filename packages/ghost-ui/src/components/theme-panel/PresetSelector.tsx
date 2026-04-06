"use client";

import { useThemePanel } from "@/contexts/ThemePanelContext";
import { PRESETS } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

export function PresetSelector() {
  const { activePresetId, applyPreset } = useThemePanel();

  return (
    <div className="grid grid-cols-3 gap-2">
      {PRESETS.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-card-sm border p-3 transition-all cursor-pointer",
              isActive
                ? "border-border-accent shadow-mini bg-background-alt"
                : "border-border hover:border-border-input-hover hover:bg-background-alt",
            )}
          >
            <div className="flex gap-1">
              {[
                preset.preview.accent,
                preset.preview.background,
                preset.preview.text,
                preset.preview.muted,
              ].map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-foreground leading-tight text-center">
              {preset.name}
            </span>
          </button>
        );
      })}
      {/* Custom indicator */}
      {activePresetId === null && (
        <div className="flex flex-col items-center gap-2 rounded-card-sm border border-border-accent shadow-mini bg-background-alt p-3">
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-full border border-black/10 bg-gradient-to-br from-background-accent to-background-muted" />
            <div className="w-4 h-4 rounded-full border border-black/10 bg-background" />
            <div className="w-4 h-4 rounded-full border border-black/10 bg-text-default" />
            <div className="w-4 h-4 rounded-full border border-black/10 bg-muted" />
          </div>
          <span className="text-[10px] font-medium text-foreground leading-tight text-center">
            Custom
          </span>
        </div>
      )}
    </div>
  );
}
