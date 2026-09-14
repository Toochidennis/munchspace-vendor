"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, LoaderCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import { refreshAccessToken, getApiErrorMessage } from "@/app/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

interface Review {
  id: string;
  rating: number | null;
  comment: string | null;
  submittedAt: string;
  customerName: string | null;
  order: { id: string; code: string } | null;
}

const FILTERS = [
  { value: 0, label: "All" },
  { value: 5, label: "5" },
  { value: 4, label: "4" },
  { value: 3, label: "3" },
  { value: 2, label: "2" },
  { value: 1, label: "1" },
];

async function authenticatedFetch(url: string): Promise<Response> {
  if (typeof window === "undefined") {
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }

  let token = getAccessToken();
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      await logout();
      throw new Error("Session expired");
    }
    token = getAccessToken();
  }

  return fetch(url, {
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (rating) params.set("rating", String(rating));

      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/reviews?${params}`,
      );
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getApiErrorMessage(body, "Could not load reviews.", res.status));
        setReviews([]);
        return;
      }

      setReviews(body?.data?.data ?? []);
      setSummary(
        body?.data?.summary ?? { averageRating: 0, totalReviews: 0 },
      );
      setTotalPages(body?.data?.meta?.totalPages || 1);
    } catch {
      setError("Could not load reviews. Please try again.");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, rating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-rubik">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What customers said about your store.
        </p>
      </div>

      <Card className="p-5 shadow-none border-gray-200 flex items-center gap-5">
        <div>
          <p className="text-4xl font-bold leading-none">
            {summary.averageRating.toFixed(1)}
          </p>
        </div>
        <div className="space-y-1">
          <Stars rating={Math.round(summary.averageRating)} size={16} />
          <p className="text-xs text-muted-foreground">
            {summary.totalReviews} review
            {summary.totalReviews === 1 ? "" : "s"}
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setRating(filter.value);
              setPage(1);
            }}
            className={cn(
              "h-9 px-4 rounded-full text-sm border transition-colors",
              rating === filter.value
                ? "bg-munchprimary text-white border-munchprimary"
                : "bg-white text-slate-600 border-gray-200 hover:border-gray-300",
            )}
          >
            {filter.label}
            {filter.value > 0 && (
              <Star size={11} className="inline ml-1 -mt-0.5 fill-current" />
            )}
          </button>
        ))}
      </div>

      {error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="link" className="text-munchprimary mt-1" onClick={fetchReviews}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-5 shadow-none border-gray-200 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-medium text-slate-900">
            {rating ? "No reviews with this rating" : "No reviews yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {rating
              ? "Try another rating."
              : "Reviews appear here once customers rate their orders."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5 shadow-none border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {review.rating !== null && <Stars rating={review.rating} />}
                    <span className="text-sm font-medium text-slate-900">
                      {review.customerName ?? "Anonymous"}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(review.submittedAt), "d MMM yyyy")}
                  </p>
                  {review.order && (
                    <Link
                      href={`/restaurant/orders/${review.order.id}`}
                      className="text-xs text-munchprimary hover:underline whitespace-nowrap"
                    >
                      {review.order.code}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            className="h-8 shadow-none"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft size={14} />
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shadow-none"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
