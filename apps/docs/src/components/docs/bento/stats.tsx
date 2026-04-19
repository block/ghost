"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
} from "@ghost/ui";
import { useState } from "react";
import { Bar, BarChart, Line, LineChart, Tooltip } from "recharts";

const data = [
  {
    revenue: 12500,
    subscription: 320,
  },
  {
    revenue: 15800,
    subscription: 380,
  },
  {
    revenue: 14200,
    subscription: 350,
  },
  {
    revenue: 16800,
    subscription: 420,
  },
  {
    revenue: 19200,
    subscription: 450,
  },
  {
    revenue: 17500,
    subscription: 410,
  },
  {
    revenue: 20300,
    subscription: 480,
  },
  {
    revenue: 22800,
    subscription: 520,
  },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
  subscription: {
    label: "Subscriptions",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  type?: "revenue" | "subscription";
}

const CustomTooltip = ({
  active,
  payload,
  label,
  type,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-background border p-3">
        <p className="text-sm font-medium">
          {type === "revenue" ? "$" : ""}
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function CardsStats() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleMouseEnter = (props: any) => {
    if (props && typeof props.index === "number") {
      setActiveIndex(props.index);
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full pb-0">
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="h-full min-h-[180px] w-full"
            >
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
                onMouseLeave={handleMouseLeave}
              >
                <Line
                  key="revenue-line"
                  type="monotone"
                  strokeWidth={2}
                  dataKey="revenue"
                  stroke="var(--border-strong)"
                  activeDot={{
                    r: 6,
                    stroke: "var(--border)",
                    strokeWidth: 2,
                    fill: "var(--background-inverse)",
                  }}
                  dot={(props: any) => {
                    const isActive = activeIndex === props.index;
                    return (
                      <circle
                        key={`dot-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={isActive ? 5 : 4}
                        stroke="var(--border-strong)"
                        strokeWidth={isActive ? 2.5 : 2}
                        fill="var(--background)"
                        className="transition-all duration-200"
                      />
                    );
                  }}
                  onMouseEnter={handleMouseEnter}
                />
                <Tooltip
                  content={<CustomTooltip type="revenue" />}
                  cursor={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="pt-4">
            <div className="text-2xl font-mono font-bold">$15,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="h-full min-h-[180px] w-full"
            >
              <BarChart
                data={data}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
                onMouseLeave={handleMouseLeave}
              >
                <Bar
                  key="subscription-bar"
                  dataKey="subscription"
                  fill="var(--background-inverse)"
                  radius={4}
                  onMouseEnter={(data) => handleMouseEnter(data)}
                  className={`transition-opacity duration-200 ${
                    activeIndex !== null ? "opacity-60" : ""
                  }`}
                />
                <Tooltip
                  content={<CustomTooltip type="subscription" />}
                  cursor={{
                    fill: "var(--border)",
                    opacity: 0.1,
                  }}
                />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="pt-4">
            <div className="text-2xl font-mono font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
