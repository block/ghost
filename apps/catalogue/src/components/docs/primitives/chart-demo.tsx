import { ChartAreaDemo } from "@/components/docs/primitives/chart-area-demo";
import { ChartBandedDemo } from "@/components/docs/primitives/chart-banded-demo";
import { ChartBarDemo } from "@/components/docs/primitives/chart-bar-demo";
import { ChartBarMixed } from "@/components/docs/primitives/chart-bar-mixed";
import { ChartLineDemo } from "@/components/docs/primitives/chart-line-demo";
import { ChartPieDemo } from "@/components/docs/primitives/chart-pie-demo";
import { ChartPosNegBarDemo } from "@/components/docs/primitives/chart-posneg-bar-demo";

export function ChartDemo() {
  return (
    <div className="grid w-full max-w-screen-2xl gap-4 *:data-[slot=card]:flex-1 @2xl:grid-cols-2 @6xl:grid-cols-3">
      <ChartAreaDemo />
      <ChartBarDemo />
      <ChartBarMixed />
      <ChartBandedDemo />
      <ChartPieDemo />
      <ChartPosNegBarDemo />
      <div className="@6xl:hidden">
        <ChartLineDemo />
      </div>
    </div>
  );
}
