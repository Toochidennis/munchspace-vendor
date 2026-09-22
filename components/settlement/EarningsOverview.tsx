"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DateRangeFilter,
  applyDateRangeParams,
  type DateRangeSelection,
} from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { EarningsChart, type EarningsPoint } from "./EarningsChart";

type Trend = { value: number; trend: number };

type TopItem = {
  menuItemId: string;
  name: string;
  totalSold: number;
  revenue: number;
};

type OverviewResponse = {
  summary: {
    grossSales: Trend;
    netEarnings: Trend;
    platformFees: Trend;
    orders: Trend;
    averagePerOrder: Trend;
  };
  chart: {
    granularity: "day" | "week" | "month";
    current: EarningsPoint[];
    previous: EarningsPoint[];
  };
  topItems: TopItem[];
};

const naira = (value: number) => `₦${value.toLocaleString()}`;

export function EarningsOverview({
  businessId,
  apiBase,
  fetcher,
}: {
  businessId: string;
  apiBase: string;
  fetcher: (url: string) => Promise<Response>;
}) {
  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [range, setRange] = React.useState<DateRangeSelection>({
    preset: "last_30_days",
  });

  React.useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const params = applyDateRangeParams(new URLSearchParams(), range);
        const res = await fetcher(
          `${apiBase}/vendors/me/businesses/${businessId}/analytics/earnings?${params.toString()}`,
        );
        const json = await res.json();
        if (!cancelled && json.success && json.data) setData(json.data);
      } catch (error) {
        console.error("Failed to fetch earnings overview:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [businessId, apiBase, fetcher, range]);

  const summary = data?.summary;

  const tiles = [
    { label: "Gross sales", trend: summary?.grossSales },
    { label: "You earned", trend: summary?.netEarnings },
    { label: "Platform fees", trend: summary?.platformFees },
    { label: "Orders", trend: summary?.orders, isCount: true },
    { label: "Average per order", trend: summary?.averagePerOrder },
  ];

  const topRevenue = data?.topItems[0]?.revenue ?? 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            How much you have made, and what is making it. Each figure is
            compared against the period before it.
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          allowAllTime={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="space-y-2 rounded-xl border border-gray-100 bg-white p-5"
          >
            <p className="text-xs font-medium text-gray-500">{tile.label}</p>
            {isLoading || !tile.trend ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold text-gray-900">
                  {tile.isCount
                    ? tile.trend.value.toLocaleString()
                    : naira(tile.trend.value)}
                </p>
                <TrendPill value={tile.trend.trend} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Earnings over time</h3>
          {data && (
            <span className="text-xs text-gray-400">
              by {data.chart.granularity}
            </span>
          )}
        </div>
        {isLoading || !data ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <EarningsChart
            current={data.chart.current}
            previous={data.chart.previous}
            granularity={data.chart.granularity}
          />
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <h3 className="mb-1 font-semibold text-gray-900">
          What earned the most
        </h3>
        <p className="mb-5 text-sm text-gray-500">
          Your highest-earning items for this period.
        </p>

        {isLoading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data.topItems.length ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No completed orders in this period yet.
          </p>
        ) : (
          <div className="space-y-4">
            {data.topItems.map((item) => (
              <div key={item.menuItemId} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-gray-900">
                    {naira(item.revenue)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#2a78d6]"
                      style={{
                        width: `${topRevenue > 0 ? Math.max(2, (item.revenue / topRevenue) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {item.totalSold.toLocaleString()} sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendPill({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-gray-400">no change</span>;
  }

  const isUp = value > 0;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
      )}
    >
      <ArrowUp size={11} className={cn(!isUp && "rotate-180")} />
      {Math.abs(value)}%
    </span>
  );
}
