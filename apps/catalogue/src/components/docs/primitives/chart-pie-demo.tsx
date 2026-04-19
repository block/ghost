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
} from "@ghost/ui";
import { TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

export const description = "A pie chart with padding angles and hover effects";

const chartData = [
  { name: "Desktop", value: 45, color: "var(--color-desktop)" },
  { name: "Mobile", value: 35, color: "var(--color-mobile)" },
  { name: "Tablet", value: 20, color: "var(--color-tablet)" },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  tablet: {
    label: "Tablet",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  payload,
  fill,
  value,
}: any) => {
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Extend line beyond the outer radius
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;

  // Text anchor based on which side of the pie we're on
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      {/* Label line */}
      <path
        d={`M${cx + outerRadius * cos},${
          cy + outerRadius * sin
        }L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1}
        fill="none"
      />
      {/* Label text */}
      <text
        x={ex + (cos >= 0 ? 10 : -10)}
        y={ey}
        textAnchor={textAnchor}
        fill="var(--foreground)"
        className="text-xs"
      >
        {payload.name} ({value}%)
      </text>
    </g>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={4}
    />
  );
};

export function ChartPieDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Distribution</CardTitle>
        <CardDescription>Traffic sources by device type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                cornerRadius={4}
                label={renderCustomizedLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none">
          Desktop usage up 5.2% <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Based on total visits in last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
