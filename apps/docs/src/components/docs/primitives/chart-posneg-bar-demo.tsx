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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

export const description = "A bar chart showing positive and negative values";

const chartData = [
  { month: "Jan", value: 8.2 },
  { month: "Feb", value: -4.5 },
  { month: "Mar", value: 6.8 },
  { month: "Apr", value: -3.2 },
  { month: "May", value: 9.4 },
  { month: "Jun", value: -5.1 },
];

const chartConfig = {
  value: {
    label: "Growth Rate",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const CustomBar = (props: any) => {
  const { fill, x, y, width, height, value } = props;
  const isNegative = value < 0;
  const barFill = isNegative
    ? "var(--background-danger)"
    : "var(--background-success)";

  // For negative values, we want to start from the zero line and go up
  const barHeight = Math.abs(height);
  const barY = isNegative ? y - barHeight : y;

  return (
    <g>
      <rect
        x={x}
        y={barY}
        width={width}
        height={barHeight}
        fill={barFill}
        rx={4}
        ry={4}
      />
    </g>
  );
};

export function ChartPosNegBarDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Rate</CardTitle>
        <CardDescription>Monthly growth rate variations</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 10,
              left: 0,
              bottom: 0,
            }}
            barSize={32}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={30}
              domain={[-10, 10]}
              ticks={[-10, -5, 0, 5, 10]}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={2} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="value" shape={<CustomBar />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none">
          Net positive trend <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing monthly growth rate changes
        </div>
      </CardFooter>
    </Card>
  );
}
