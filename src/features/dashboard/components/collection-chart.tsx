"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { demoTrend } from "../demo-data";
import { formatMoney } from "@/utils/money";

export default function CollectionChart() {
  return (
    <div
      className="h-[248px] min-w-0"
      role="img"
      aria-label="Synthetic monthly collections from January to August. Accessible figures follow the chart."
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 600, height: 248 }}
      >
        <AreaChart
          data={demoTrend}
          margin={{ top: 16, right: 10, left: -14, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border-default)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickFormatter={(value: number) => `${value / 1000}k`}
            domain={[0, 30000]}
            tickCount={4}
          />
          <Tooltip
            formatter={(value) => [
              typeof value === "number"
                ? formatMoney(value.toFixed(2))
                : "Unavailable",
              "Demo collections",
            ]}
            contentStyle={{
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--brand-primary)"
            strokeWidth={2}
            fill="var(--brand-primary)"
            fillOpacity={0.07}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
