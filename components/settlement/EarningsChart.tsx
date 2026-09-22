"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

export type EarningsPoint = {
  date: string;
  gross: number;
  net: number;
  fee: number;
};

/**
 * Validated against the dataviz six checks on the light surface:
 * worst adjacent CVD ΔE 24.7, normal-vision ΔE 33.6, both above their floors.
 */
const SERIES = {
  net: "#2a78d6",
  fee: "#eb6834",
  previous: "#8d8c86",
  surface: "#ffffff",
};

const naira = (value: number) => `₦${value.toLocaleString()}`;

const compactNaira = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
};

const labelFor = (iso: string, granularity: "day" | "week" | "month") =>
  format(parseISO(iso), granularity === "month" ? "MMM yyyy" : "d MMM");

export function EarningsChart({
  current,
  previous,
  granularity,
}: {
  current: EarningsPoint[];
  previous: EarningsPoint[];
  granularity: "day" | "week" | "month";
}) {
  // The comparison window has its own dates, so it aligns by position and
  // carries its own label into the tooltip rather than borrowing this one's.
  const data = current.map((point, i) => ({
    label: labelFor(point.date, granularity),
    net: point.net,
    fee: point.fee,
    gross: point.gross,
    previousNet: previous[i]?.net ?? null,
    previousLabel: previous[i] ? labelFor(previous[i].date, granularity) : null,
  }));

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
        No earnings in this period yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} stroke="#f1f1ef" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#8d8c86", fontSize: 12 }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#8d8c86", fontSize: 12 }}
          tickFormatter={compactNaira}
          width={64}
        />
        <Tooltip
          cursor={{ fill: "#00000008" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as (typeof data)[number];

            return (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
                <p className="mb-2 font-semibold text-gray-900">{label}</p>
                <Row color={SERIES.net} name="You earned" value={row.net} />
                <Row color={SERIES.fee} name="Platform fee" value={row.fee} />
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <Row name="Gross sales" value={row.gross} bold />
                  {row.previousNet !== null && (
                    <Row
                      color={SERIES.previous}
                      name={`Previous (${row.previousLabel})`}
                      value={row.previousNet}
                    />
                  )}
                </div>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-gray-500">{value}</span>
          )}
        />
        <Bar
          dataKey="net"
          name="You earned"
          stackId="earnings"
          fill={SERIES.net}
          stroke={SERIES.surface}
          strokeWidth={2}
          maxBarSize={40}
        />
        <Bar
          dataKey="fee"
          name="Platform fee"
          stackId="earnings"
          fill={SERIES.fee}
          stroke={SERIES.surface}
          strokeWidth={2}
          maxBarSize={40}
          radius={[4, 4, 0, 0]}
        />
        <Line
          dataKey="previousNet"
          name="Previous period"
          type="monotone"
          stroke={SERIES.previous}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Row({
  color,
  name,
  value,
  bold,
}: {
  color?: string;
  name: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="flex items-center gap-2 text-gray-500">
        {color && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {name}
      </span>
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-700"}>
        {naira(value)}
      </span>
    </div>
  );
}
