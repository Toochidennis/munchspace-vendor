"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Promotion, PromotionType } from "./types";

/** Money is sent in kobo but read back in naira, so only one way converts. */
const toKobo = (naira: string) => Math.round(Number(naira || 0) * 100);
const fromNaira = (naira: number | null) => (naira == null ? "" : String(naira));

function toDateInput(iso: string | undefined) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export type PromotionFormValues = {
  name: string;
  description: string;
  code: string;
  type: PromotionType;
  value: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  maxRedemptionsPerUser: string;
  isAutoApply: boolean;
  minOrderAmount: string;
  minItemQuantity: string;
  customerFirstOrder: boolean;
};

const EMPTY: PromotionFormValues = {
  name: "",
  description: "",
  code: "",
  type: "PERCENTAGE",
  value: "",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  maxRedemptionsPerUser: "",
  isAutoApply: false,
  minOrderAmount: "",
  minItemQuantity: "",
  customerFirstOrder: false,
};

export function buildPayload(values: PromotionFormValues) {
  const condition: Record<string, unknown> = {};
  if (values.minOrderAmount) {
    condition.minOrderAmount = toKobo(values.minOrderAmount);
  }
  if (values.minItemQuantity) {
    condition.minItemQuantity = Number(values.minItemQuantity);
  }
  if (values.customerFirstOrder) condition.customerFirstOrder = true;

  return {
    name: values.name.trim(),
    ...(values.description.trim()
      ? { description: values.description.trim() }
      : {}),
    ...(values.code.trim() ? { code: values.code.trim().toUpperCase() } : {}),
    type: values.type,
    target: "ORDER",
    // Percentage is a plain number; a flat amount is money, so it goes as kobo.
    value:
      values.type === "FLAT_AMOUNT"
        ? toKobo(values.value)
        : values.type === "FREE_DELIVERY"
          ? 0
          : Number(values.value),
    startsAt: new Date(`${values.startsAt}T00:00:00`).toISOString(),
    endsAt: new Date(`${values.endsAt}T23:59:59`).toISOString(),
    ...(values.maxRedemptions
      ? { maxRedemptions: Number(values.maxRedemptions) }
      : {}),
    ...(values.maxRedemptionsPerUser
      ? { maxRedemptionsPerUser: Number(values.maxRedemptionsPerUser) }
      : {}),
    isAutoApply: values.isAutoApply,
    ...(Object.keys(condition).length ? { condition } : {}),
  };
}

export default function PromotionForm({
  open,
  onOpenChange,
  editing,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Promotion | null;
  onSubmit: (values: PromotionFormValues) => Promise<void>;
  saving: boolean;
}) {
  const [values, setValues] = useState<PromotionFormValues>(EMPTY);

  useEffect(() => {
    if (!open) return;

    if (!editing) {
      setValues(EMPTY);
      return;
    }

    setValues({
      name: editing.name,
      description: editing.description ?? "",
      code: editing.code ?? "",
      type: editing.type,
      value: editing.type === "FREE_DELIVERY" ? "" : String(editing.value),
      startsAt: toDateInput(editing.startsAt),
      endsAt: toDateInput(editing.endsAt),
      maxRedemptions: editing.maxRedemptions
        ? String(editing.maxRedemptions)
        : "",
      maxRedemptionsPerUser: editing.maxRedemptionsPerUser
        ? String(editing.maxRedemptionsPerUser)
        : "",
      isAutoApply: editing.isAutoApply,
      minOrderAmount: fromNaira(editing.condition?.minOrderAmount ?? null),
      minItemQuantity: editing.condition?.minItemQuantity
        ? String(editing.condition.minItemQuantity)
        : "",
      customerFirstOrder: editing.condition?.customerFirstOrder ?? false,
    });
  }, [open, editing]);

  const set = <K extends keyof PromotionFormValues>(
    key: K,
    value: PromotionFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!values.name.trim()) return toast.error("Give the promotion a name");
    if (!values.code.trim() && !values.isAutoApply) {
      return toast.error(
        "Add a code, or switch on automatic so customers can get it",
      );
    }
    if (values.type === "PERCENTAGE") {
      const percent = Number(values.value);
      if (!percent || percent < 1 || percent > 100) {
        return toast.error("Percentage must be between 1 and 100");
      }
    }
    if (values.type === "FLAT_AMOUNT" && Number(values.value) <= 0) {
      return toast.error("Enter how much comes off the order");
    }
    if (!values.startsAt || !values.endsAt) {
      return toast.error("Choose the dates it runs between");
    }
    if (new Date(values.endsAt) < new Date(values.startsAt)) {
      return toast.error("The end date has to be after the start date");
    }

    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit promotion" : "New promotion"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <Label htmlFor="promo-name">Name</Label>
            <Input
              id="promo-name"
              value={values.name}
              placeholder="Weekend 20% off"
              onChange={(e) => set("name", e.target.value)}
              className="mt-1.5 h-11"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only you see this. Customers see the code.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="promo-type">Discount</Label>
              <Select
                value={values.type}
                onValueChange={(v) => set("type", v as PromotionType)}
              >
                <SelectTrigger id="promo-type" className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                  <SelectItem value="FLAT_AMOUNT">Fixed amount off</SelectItem>
                  <SelectItem value="FREE_DELIVERY">Free delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {values.type === "FREE_DELIVERY" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
                <p className="text-sm text-amber-900">
                  The rider is still paid the full delivery fee, and it comes
                  out of what you earn on the order.
                </p>
              </div>
            )}

            {values.type !== "FREE_DELIVERY" && (
              <div>
                <Label htmlFor="promo-value">
                  {values.type === "PERCENTAGE" ? "Percent off" : "Amount off"}
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  {values.type === "FLAT_AMOUNT" && (
                    <span className="text-gray-500">₦</span>
                  )}
                  <Input
                    id="promo-value"
                    type="number"
                    min={1}
                    max={values.type === "PERCENTAGE" ? 100 : undefined}
                    value={values.value}
                    onChange={(e) => set("value", e.target.value)}
                    className="h-11"
                  />
                  {values.type === "PERCENTAGE" && (
                    <span className="text-gray-500">%</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              value={values.code}
              placeholder="WEEKEND20"
              onChange={(e) =>
                set("code", e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              className="mt-1.5 h-11 font-mono uppercase"
              disabled={values.isAutoApply}
            />
            <p className="mt-1 text-xs text-gray-500">
              Letters, numbers, hyphens and underscores. Has to be unique across
              MunchSpace.
            </p>
          </div>

          <div className="flex items-start justify-between gap-6 rounded-lg border border-gray-200 p-4">
            <div>
              <Label htmlFor="promo-auto" className="font-medium">
                Apply automatically
              </Label>
              <p className="mt-1 text-sm text-gray-500">
                Every qualifying order gets it without typing a code.
              </p>
            </div>
            <Switch
              id="promo-auto"
              checked={values.isAutoApply}
              onCheckedChange={(v) => set("isAutoApply", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="promo-starts">Starts</Label>
              <Input
                id="promo-starts"
                type="date"
                value={values.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="promo-ends">Ends</Label>
              <Input
                id="promo-ends"
                type="date"
                value={values.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 p-4">
            <p className="font-medium text-slate-800">Limits</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="promo-max">Total uses</Label>
                <Input
                  id="promo-max"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={values.maxRedemptions}
                  onChange={(e) => set("maxRedemptions", e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label htmlFor="promo-max-user">Uses per customer</Label>
                <Input
                  id="promo-max-user"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={values.maxRedemptionsPerUser}
                  onChange={(e) => set("maxRedemptionsPerUser", e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label htmlFor="promo-min-order">Minimum order</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-gray-500">₦</span>
                  <Input
                    id="promo-min-order"
                    type="number"
                    min={0}
                    placeholder="Any"
                    value={values.minOrderAmount}
                    onChange={(e) => set("minOrderAmount", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="promo-min-items">Minimum items</Label>
                <Input
                  id="promo-min-items"
                  type="number"
                  min={1}
                  placeholder="Any"
                  value={values.minItemQuantity}
                  onChange={(e) => set("minItemQuantity", e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 border-t border-gray-100 pt-4">
              <Label htmlFor="promo-first" className="font-normal">
                First orders only
              </Label>
              <Switch
                id="promo-first"
                checked={values.customerFirstOrder}
                onCheckedChange={(v) => set("customerFirstOrder", v)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            className="rounded-full border-gray-400 text-gray-700"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-munchprimary hover:bg-munchprimaryDark"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Create promotion"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
