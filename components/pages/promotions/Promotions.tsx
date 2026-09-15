"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { readApiError, refreshAccessToken } from "@/app/lib/api";
import PromotionForm, {
  buildPayload,
  type PromotionFormValues,
} from "./PromotionForm";
import type { Promotion, PromotionStatus } from "./types";

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

const STATUS_STYLES: Record<PromotionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  EXPIRED: "bg-gray-100 text-gray-500 border-gray-200",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const shortDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

function describe(promotion: Promotion) {
  if (promotion.type === "FREE_DELIVERY") return "Free delivery";
  if (promotion.type === "PERCENTAGE") return `${promotion.value}% off`;
  return `${naira.format(promotion.value)} off`;
}

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const businessId = getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/promotions?limit=100`,
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Could not load your promotions"),
        );
      }

      const body = await response.json();
      setPromotions(body.data?.promotions ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load your promotions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values: PromotionFormValues) => {
    try {
      setSaving(true);
      const businessId = getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const base = `${API_BASE}/vendors/me/businesses/${businessId}/promotions`;
      const response = await authenticatedFetch(
        editing ? `${base}/${editing.id}` : base,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(buildPayload(values)),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Could not save the promotion"),
        );
      }

      toast.success(editing ? "Promotion updated" : "Promotion created");
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the promotion",
      );
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (promotion: Promotion, status: PromotionStatus) => {
    try {
      const businessId = getBusinessId();
      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/promotions/${promotion.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, "Could not update it"));
      }

      toast.success(status === "ACTIVE" ? "Promotion live" : "Promotion paused");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update it",
      );
    }
  };

  const remove = async (promotion: Promotion) => {
    try {
      setRemoving(true);
      const businessId = getBusinessId();
      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/promotions/${promotion.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, "Could not delete it"));
      }

      toast.success("Promotion deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete it",
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Discount codes your customers can use at checkout, and offers that
              apply on their own.
            </p>
          </div>
          <Button
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            New promotion
          </Button>
        </div>

        {loading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : promotions.length === 0 ? (
          <Card className="mt-8 border-gray-100 p-12 text-center shadow-none">
            <Tag className="mx-auto h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-800">
              No promotions yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Create a code to bring customers back, or an offer that applies to
              every qualifying order.
            </p>
            <Button
              className="mx-auto mt-5 w-fit rounded-full"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Create your first promotion
            </Button>
          </Card>
        ) : (
          <div className="mt-8 space-y-3">
            {promotions.map((promotion) => (
              <Card
                key={promotion.id}
                className="border-gray-100 p-4 shadow-none md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {promotion.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`font-normal ${STATUS_STYLES[promotion.status]}`}
                      >
                        {promotion.status.toLowerCase()}
                      </Badge>
                      {promotion.isAutoApply && (
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-blue-50 font-normal text-blue-700"
                        >
                          automatic
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">
                        {describe(promotion)}
                      </span>
                      {promotion.code && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                          {promotion.code}
                        </span>
                      )}
                      <span>
                        {shortDate.format(new Date(promotion.startsAt))} –{" "}
                        {shortDate.format(new Date(promotion.endsAt))}
                      </span>
                      {promotion.condition?.minOrderAmount ? (
                        <span>
                          min {naira.format(promotion.condition.minOrderAmount)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {promotion.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(promotion, "PAUSED")}
                      >
                        Pause
                      </Button>
                    )}
                    {(promotion.status === "PAUSED" ||
                      promotion.status === "DRAFT") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(promotion, "ACTIVE")}
                      >
                        Make live
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(promotion);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setDeleting(promotion)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this promotion?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{deleting?.name}</span>{" "}
            will stop working immediately and cannot be brought back. Orders
            that already used it are unaffected.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-full border-gray-400 text-gray-700"
              onClick={() => setDeleting(null)}
              disabled={removing}
            >
              Keep it
            </Button>
            <Button
              className="rounded-full bg-red-600 hover:bg-red-700"
              onClick={() => deleting && remove(deleting)}
              disabled={removing}
            >
              {removing ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PromotionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        onSubmit={save}
        saving={saving}
      />
    </div>
  );
}
