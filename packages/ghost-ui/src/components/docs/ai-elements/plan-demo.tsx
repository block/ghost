"use client";

import { CheckCircleIcon, CircleIcon } from "lucide-react";
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";

export function PlanDemo() {
  return (
    <div className="space-y-6">
      <Plan defaultOpen>
        <PlanHeader>
          <div>
            <PlanTitle>Build a Landing Page</PlanTitle>
            <PlanDescription>
              Create a responsive landing page with hero section, features, and
              footer.
            </PlanDescription>
          </div>
          <PlanAction>
            <PlanTrigger />
          </PlanAction>
        </PlanHeader>
        <PlanContent>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircleIcon className="size-4 text-green-600" />
              <span className="text-muted-foreground line-through">
                Set up project structure
              </span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircleIcon className="size-4 text-green-600" />
              <span className="text-muted-foreground line-through">
                Design hero section
              </span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CircleIcon className="size-4 text-muted-foreground" />
              <span>Build features grid</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CircleIcon className="size-4 text-muted-foreground" />
              <span>Add footer and navigation</span>
            </li>
          </ul>
        </PlanContent>
        <PlanFooter>
          <p className="text-muted-foreground text-xs">
            2 of 4 steps completed
          </p>
        </PlanFooter>
      </Plan>
    </div>
  );
}
