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
import { formatMoney } from "@/utils/money";
import type { FinancialTrendPoint } from "@/features/reports/types";

const compactMoney = new Intl.NumberFormat("en-GH", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const shortMonth = new Intl.DateTimeFormat("en-GH", {
  month: "short",
  timeZone: "UTC",
});
const longMonth = new Intl.DateTimeFormat("en-GH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function CollectionChart({
  data,
}: {
  data: FinancialTrendPoint[];
}) {
  return (
    <div
      className="h-[248px] min-w-0"
      role="img"
      aria-label="Monthly gross receipts for the selected reporting period. Accessible figures follow the chart."
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 600, height: 248 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 16, right: 10, left: -8, bottom: 0 }}
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
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickFormatter={(value: string) =>
              shortMonth.format(new Date(`${value}T00:00:00Z`))
            }
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickFormatter={(value: number) => compactMoney.format(value)}
            width={52}
          />
          <Tooltip
            labelFormatter={(value) =>
              longMonth.format(new Date(`${String(value)}T00:00:00Z`))
            }
            formatter={(value) => [
              typeof value === "number"
                ? formatMoney(value.toFixed(2))
                : "Unavailable",
              "Gross receipts",
            ]}
            contentStyle={{
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="grossReceipts"
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
