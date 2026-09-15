"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { readApiError, refreshAccessToken } from "@/app/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();
  }

  const headers: HeadersInit = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...init.headers,
  };

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();

    response = await fetch(url, {
      ...init,
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

type Preorder = {
  orderId: string;
  orderCode: string;
  placedAt: string;
  scheduledFor: string | null;
  releaseAt: string | null;
  status: string;
  fulfillmentType: string | null;
  totalAmount: number;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const timeOfDay = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayHeading = new Intl.DateTimeFormat("en-NG", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

const dateOnly = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function relativeDay(iso: string) {
  const target = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // The date rides along so a vendor reading a board of bookings knows which
  // Sunday is meant.
  if (target.toDateString() === today.toDateString()) {
    return `Today · ${dateOnly.format(target)}`;
  }
  if (target.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow · ${dateOnly.format(target)}`;
  }
  return dayHeading.format(target);
}

export default function Preorders() {
  const [orders, setOrders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const businessId = getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/orders?group=scheduled&limit=100`,
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Could not load your preorders"),
        );
      }

      const body = await response.json();
      const rows: Preorder[] = body.data?.data ?? body.data ?? [];

      setOrders(
        [...rows].sort((a, b) =>
          (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""),
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load your preorders",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const byDay = new Map<string, Preorder[]>();

    for (const order of orders) {
      if (!order.scheduledFor) continue;
      const key = dayKey(order.scheduledFor);
      byDay.set(key, [...(byDay.get(key) ?? []), order]);
    }

    return [...byDay.entries()];
  }, [orders]);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">Preorders</h1>
        <p className="text-gray-600 text-sm mt-2 max-w-2xl">
          Orders customers have booked for a later time. They are paid for and
          waiting.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-900">
            There is nothing to do here. Each booking moves to your Orders board
            by itself, in time for you to start cooking — you accept it there,
            the way you would any other order.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : grouped.length === 0 ? (
          <Card className="mt-8 border-gray-100 shadow-none p-12 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-800">
              No bookings yet
            </h2>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              When a customer books a time with you, it will appear here until
              it is due.
            </p>
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            {grouped.map(([day, dayOrders]) => (
              <section key={day}>
                <div className="flex items-baseline justify-between border-b border-gray-200 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {relativeDay(dayOrders[0].scheduledFor as string)}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {dayOrders.length}{" "}
                    {dayOrders.length === 1 ? "booking" : "bookings"}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {dayOrders.map((order) => (
                    <Card
                      key={order.orderId}
                      className="border-gray-100 shadow-none p-4 md:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-16">
                            <p className="text-xl font-semibold text-gray-900 tabular-nums">
                              {timeOfDay.format(
                                new Date(order.scheduledFor as string),
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">due</p>
                          </div>
                          <div className="h-10 w-px bg-gray-200" />
                          <div>
                            <p className="font-medium text-slate-800">
                              {order.orderCode}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {order.fulfillmentType
                                ? order.fulfillmentType
                                    .toLowerCase()
                                    .replace(/_/g, " ")
                                : "—"}{" "}
                              · {naira.format(order.totalAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {order.releaseAt && (
                            <Badge
                              variant="secondary"
                              className="font-normal text-gray-600"
                            >
                              reaches you{" "}
                              {timeOfDay.format(new Date(order.releaseAt))}
                            </Badge>
                          )}
                          <Link href={`/restaurant/orders/${order.orderId}`}>
                            <Button variant="outline" size="sm">
                              View details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
