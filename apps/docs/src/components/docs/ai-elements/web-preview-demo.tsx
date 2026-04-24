"use client";

import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "ghost-ui";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from "lucide-react";

export function WebPreviewDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <WebPreview defaultUrl="https://example.com" className="h-[480px]">
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Forward">
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Reload">
            <RefreshCwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
        <WebPreviewConsole
          logs={[
            {
              level: "log",
              message: "Page loaded successfully",
              timestamp: new Date(2026, 2, 29, 10, 30, 0),
            },
            {
              level: "warn",
              message: "Deprecation warning: 'substr' is deprecated",
              timestamp: new Date(2026, 2, 29, 10, 30, 1),
            },
            {
              level: "error",
              message: "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT",
              timestamp: new Date(2026, 2, 29, 10, 30, 2),
            },
          ]}
        />
      </WebPreview>
    </div>
  );
}
