"use client";

import {
  cn,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ghost/ui";
import { XIcon } from "lucide-react";
import { useThemePanel } from "@/contexts/ThemePanelContext";
import { ColorControls } from "./ColorControls";
import { ExportReset } from "./ExportReset";
import { PresetSelector } from "./PresetSelector";
import { RadiusControls } from "./RadiusControls";
import { ShadowControls } from "./ShadowControls";
import { TypographyControls } from "./TypographyControls";

export function ThemePanel() {
  const { isOpen, setOpen } = useThemePanel();

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-[360px] sm:w-[420px] bg-background border-l border-border flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-1.5 p-6 pb-0 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-foreground font-semibold tracking-[-0.01em]">
            Theme
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-xs opacity-70 transition-opacity hover:opacity-100"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <p className="text-muted-foreground text-sm">
          Customize the design system in real time.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Presets */}
        <div>
          <p
            className="font-display uppercase text-muted-foreground mb-3"
            style={{
              fontSize: "var(--label-font-size)",
              letterSpacing: "var(--label-letter-spacing)",
              fontWeight: "var(--label-font-weight)",
            }}
          >
            Presets
          </p>
          <PresetSelector />
        </div>

        <Separator />

        {/* Token Controls */}
        <Tabs defaultValue="colors">
          <TabsList className="w-full">
            <TabsTrigger value="colors" className="flex-1 text-xs">
              Colors
            </TabsTrigger>
            <TabsTrigger value="radius" className="flex-1 text-xs">
              Radius
            </TabsTrigger>
            <TabsTrigger value="shadows" className="flex-1 text-xs">
              Shadows
            </TabsTrigger>
            <TabsTrigger value="type" className="flex-1 text-xs">
              Type
            </TabsTrigger>
          </TabsList>
          <TabsContent value="colors">
            <ColorControls />
          </TabsContent>
          <TabsContent value="radius">
            <RadiusControls />
          </TabsContent>
          <TabsContent value="shadows">
            <ShadowControls />
          </TabsContent>
          <TabsContent value="type">
            <TypographyControls />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 border-t border-border shrink-0">
        <ExportReset />
      </div>
    </div>
  );
}
