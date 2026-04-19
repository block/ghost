"use client";

import { useIsMobile } from "@ghost/ui";
import { lazy, Suspense } from "react";
import { CardsChat } from "@/components/docs/bento/chat";
import { CardsCookieSettings } from "@/components/docs/bento/cookie-settings";
import { CardsCreateAccount } from "@/components/docs/bento/create-account";
import { CardsPaymentMethod } from "@/components/docs/bento/payment-method";
import { CardsReportIssue } from "@/components/docs/bento/report-issue";
import { CardsShare } from "@/components/docs/bento/share";
import { CardsTeamMembers } from "@/components/docs/bento/team-members";

const CardsStats = lazy(() =>
  import("@/components/docs/bento/stats").then((m) => ({
    default: m.CardsStats,
  })),
);
const CardsCalendar = lazy(() =>
  import("@/components/docs/bento/calendar").then((m) => ({
    default: m.CardsCalendar,
  })),
);
const CardsActivityGoal = lazy(() =>
  import("@/components/docs/bento/activity-goal").then((m) => ({
    default: m.CardsActivityGoal,
  })),
);
const CardsMetric = lazy(() =>
  import("@/components/docs/bento/metric").then((m) => ({
    default: m.CardsMetric,
  })),
);
const CardsDataTable = lazy(() =>
  import("@/components/docs/bento/data-table").then((m) => ({
    default: m.CardsDataTable,
  })),
);

function CalendarMetricGroup() {
  return (
    <div className="grid gap-1 sm:grid-cols-[260px_1fr]">
      <Suspense>
        <CardsCalendar />
      </Suspense>
      <div className="pt-3 sm:pl-2 sm:pt-0 xl:pl-3">
        <Suspense>
          <CardsActivityGoal />
        </Suspense>
      </div>
      <div className="pt-3 sm:col-span-2 xl:pt-3">
        <Suspense>
          <CardsMetric />
        </Suspense>
      </div>
    </div>
  );
}

export function BentoDemo() {
  const isMobile = useIsMobile();

  return (
    <div className="md:grids-col-2 grid md:gap-4 lg:grid-cols-10 xl:grid-cols-11 xl:gap-4">
      <div className="space-y-4 lg:col-span-4 xl:col-span-6 xl:space-y-4">
        <Suspense>
          <CardsStats />
        </Suspense>
        {isMobile && <CalendarMetricGroup />}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="space-y-4 xl:space-y-4">
            <CardsTeamMembers />
            <CardsCookieSettings />
            <CardsPaymentMethod />
          </div>
          <div className="space-y-4 xl:space-y-4">
            <CardsChat />
            <CardsCreateAccount />
            <div className="hidden xl:block">
              <CardsReportIssue />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4 lg:col-span-6 xl:col-span-5 xl:space-y-4">
        {!isMobile && (
          <>
            <CalendarMetricGroup />
            <Suspense>
              <CardsDataTable />
            </Suspense>
          </>
        )}
        <CardsShare />
        <div className="xl:hidden">
          <CardsReportIssue />
        </div>
      </div>
    </div>
  );
}
