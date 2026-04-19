"use client";

import { Button } from "@ghost/ui";
import { Palette } from "lucide-react";
import { useThemePanel } from "@/contexts/ThemePanelContext";

export function ThemePanelTrigger() {
  const { setOpen } = useThemePanel();

  return (
    <Button
      size="lg"
      appearance="icon"
      onClick={() => setOpen(true)}
      className="bg-background-inverse text-primary-foreground hover:scale-105"
    >
      <Palette className="h-4 w-4" />
    </Button>
  );
}
