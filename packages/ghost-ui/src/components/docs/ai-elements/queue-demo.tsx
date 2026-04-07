"use client";

import { CheckCircleIcon, ListTodoIcon } from "lucide-react";
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";

export function QueueDemo() {
  return (
    <div className="max-w-sm">
      <Queue>
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={2}
              label="pending"
              icon={<ListTodoIcon className="size-4" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator />
                  <QueueItemContent>
                    Refactor authentication module
                  </QueueItemContent>
                </div>
                <QueueItemDescription>
                  Extract shared logic into a reusable hook
                </QueueItemDescription>
              </QueueItem>
              <QueueItem>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator />
                  <QueueItemContent>
                    Write unit tests for API routes
                  </QueueItemContent>
                </div>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>

        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={2}
              label="completed"
              icon={<CheckCircleIcon className="size-4" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator completed />
                  <QueueItemContent completed>
                    Set up project scaffolding
                  </QueueItemContent>
                </div>
              </QueueItem>
              <QueueItem>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator completed />
                  <QueueItemContent completed>
                    Configure database schema
                  </QueueItemContent>
                </div>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  );
}
