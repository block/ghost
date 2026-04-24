"use client";

import { Button } from "ghost-ui";
import { Check, Copy, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { useThemePanel } from "@/contexts/ThemePanelContext";

export function ExportReset() {
  const { exportCSS, reset, overrides } = useThemePanel();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const css = exportCSS();
    if (!css) return;

    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportCSS]);

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={!hasOverrides}
        className="flex-1 gap-2"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy CSS
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={reset}
        disabled={!hasOverrides}
        className="flex-1 gap-2"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  );
}
