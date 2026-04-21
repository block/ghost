"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "ghost-ui";
import { TrendingUp } from "lucide-react";
import { ComposedChart, Line, XAxis, YAxis } from "recharts";

export const description = "A banded chart showing range";

const chartData = [
  { month: "Jan", upper: 86, lower: 23 },
  { month: "Feb", upper: 105, lower: 45 },
  { month: "Mar", upper: 137, lower: 58 },
  { month: "Apr", upper: 173, lower: 68 },
  { month: "May", upper: 109, lower: 45 },
  { month: "Jun", upper: 144, lower: 67 },
];

const chartConfig = {
  upper: {
    label: "Upper Band",
    color: "var(--chart-1)",
  },
  lower: {
    label: "Lower Band",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartBandedDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banded Chart</CardTitle>
        <CardDescription>Showing range variations over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} hide />
            <Line
              type="monotone"
              dataKey="upper"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{
                fill: "var(--chart-1)",
                strokeWidth: 2,
                stroke: "var(--background)",
                r: 4,
              }}
              activeDot={{
                fill: "var(--chart-1)",
                strokeWidth: 2,
                stroke: "var(--background)",
                r: 6,
              }}
            />
            <Line
              type="monotone"
              dataKey="lower"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={{
                fill: "var(--chart-2)",
                strokeWidth: 2,
                stroke: "var(--background)",
                r: 4,
              }}
              activeDot={{
                fill: "var(--chart-2)",
                strokeWidth: 2,
                stroke: "var(--background)",
                r: 6,
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none">
              Range increased by 12% <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
