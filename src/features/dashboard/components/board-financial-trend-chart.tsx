"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancialTrendPoint } from "@/features/reports/types";
import { formatMoney } from "@/utils/money";

const compactMoney = new Intl.NumberFormat("en-GH", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dayLabel = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("en-GH", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function BoardFinancialTrendChart({
  data,
  granularity,
}: {
  data: FinancialTrendPoint[];
  granularity: "day" | "month";
}) {
  const formatPeriod = (value: string) =>
    (granularity === "day" ? dayLabel : monthLabel).format(
      new Date(`${value}T00:00:00Z`),
    );

  return (
    <div
      className="h-[286px] min-w-0"
      role="img"
      aria-label="School revenue, expenses and net revenue across the selected reporting period. Accessible figures follow the chart."
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 700, height: 286 }}
      >
        <ComposedChart
          data={data}
          margin={{ top: 14, right: 12, left: -4, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border-default)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="periodStart"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickFormatter={formatPeriod}
            dy={8}
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickFormatter={(value: number) => compactMoney.format(value)}
            width={56}
          />
          <Tooltip
            labelFormatter={(value) =>
              fullDate.format(new Date(`${String(value)}T00:00:00Z`))
            }
            formatter={(value, name) => [
              typeof value === "number"
                ? formatMoney(value.toFixed(2))
                : "Unavailable",
              String(name),
            ]}
            contentStyle={{
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
          <Area
            type="monotone"
            dataKey="grossReceipts"
            name="School revenue"
            stroke="var(--brand-primary)"
            strokeWidth={2}
            fill="var(--brand-primary)"
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="var(--warning)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="operatingNet"
            name="Net revenue"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
