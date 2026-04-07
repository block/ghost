"use client";

import { ThemePanel } from "@/components/theme-panel/ThemePanel";
import { ThemePanelTrigger } from "@/components/theme-panel/ThemePanelTrigger";
import { ThemePanelProvider } from "@/contexts/ThemePanelContext";
import { ThemeToggle } from "./ThemeToggle";

export function ThemeControls() {
  return (
    <ThemePanelProvider>
      <div className="sticky top-4 right-0 flex justify-end z-50 px-6 h-0 gap-2">
        {/* <ThemePanelTrigger /> */}
        <ThemeToggle />
      </div>
      {/* <ThemePanel /> */}
    </ThemePanelProvider>
  );
}
