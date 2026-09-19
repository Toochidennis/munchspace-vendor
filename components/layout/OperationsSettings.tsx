"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

type ServiceOperationSetting = {
  serviceOperationId: string;
  key: string;
  label: string;
  preparationTime: number | null;
  allowPreOrders: boolean;
};

type Settings = {
  enableOnlineOrdering: boolean;
  autoAcceptOrders: boolean;
  preparationTime: number;
  enablePreOrders: boolean;
  minPreOrderTime: number;
  maxPreOrderTime: number;
  maxOrderPerDay: number;
  /** Kilometres by road. Zero means no limit. Null until an address is set. */
  deliveryRadius: number | null;
  timezone: string;
  serviceOperations: ServiceOperationSetting[];
  /** Shortest horizon that still reaches every opening day. */
  recommendedHorizonMinutes: number | null;
};

const LEAD_CHOICES = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
];

const HORIZON_CHOICES = [
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 4320, label: "3 days" },
  { minutes: 10080, label: "1 week" },
];

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      <p className="text-gray-500 text-sm mt-1 max-w-2xl">{description}</p>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-gray-100 last:border-b-0">
      <div className="max-w-xl">
        <Label htmlFor={id} className="text-base font-medium text-slate-800">
          {title}
        </Label>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function MinutesChoice({
  value,
  choices,
  onChange,
  disabled,
  minimum,
}: {
  value: number;
  choices: { minutes: number; label: string }[];
  onChange: (minutes: number) => void;
  disabled?: boolean;
  /** Choices below this cannot reach the next opening day, so they are shut off. */
  minimum?: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((choice) => (
        <button
          key={choice.minutes}
          type="button"
          disabled={
            disabled || (minimum != null && choice.minutes < minimum)
          }
          title={
            minimum != null && choice.minutes < minimum
              ? "Too short to reach your next opening day"
              : undefined
          }
          onClick={() => onChange(choice.minutes)}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-50 ${
            value === choice.minutes
              ? "border-munchprimary bg-munchprimary/10 text-munchprimary font-medium"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

export default function OperationsSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const businessId = getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/settings`,
        { method: "GET" },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Could not load your settings"),
        );
      }

      const body = await response.json();
      setSettings(body.data ?? body);
      setDirty(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load your settings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  };

  const updateOperation = (
    serviceOperationId: string,
    patch: Partial<ServiceOperationSetting>,
  ) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            serviceOperations: current.serviceOperations.map((operation) =>
              operation.serviceOperationId === serviceOperationId
                ? { ...operation, ...patch }
                : operation,
            ),
          }
        : current,
    );
    setDirty(true);
  };

  const save = async () => {
    if (!settings) return;

    if (settings.minPreOrderTime >= settings.maxPreOrderTime) {
      toast.error("The earliest pre-order time must be sooner than the latest");
      return;
    }

    try {
      setSaving(true);
      const businessId = getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            enableOnlineOrdering: settings.enableOnlineOrdering,
            autoAcceptOrders: settings.autoAcceptOrders,
            preparationTime: settings.preparationTime,
            enablePreOrders: settings.enablePreOrders,
            minPreOrderTime: settings.minPreOrderTime,
            maxPreOrderTime: settings.maxPreOrderTime,
            maxOrderPerDay: settings.maxOrderPerDay,
            ...(settings.deliveryRadius === null
              ? {}
              : { deliveryRadius: settings.deliveryRadius }),
            serviceOperations: settings.serviceOperations.map((operation) => ({
              serviceOperationId: operation.serviceOperationId,
              preparationTime: operation.preparationTime ?? undefined,
              allowPreOrders: operation.allowPreOrders,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Could not save your settings"),
        );
      }

      const body = await response.json();
      setSettings(body.data ?? body);
      setDirty(false);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card className="p-8 border-gray-100 shadow-none text-center">
        <p className="text-gray-600">We could not load your settings.</p>
        <Button onClick={load} className="mt-4 rounded-full w-fit mx-auto">
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-3 md:p-8 border-gray-100 shadow-none">
        <SectionHeading
          title="Ordering"
          description="How orders reach your kitchen. These already apply to every order you take."
        />

        <ToggleRow
          id="enable-online-ordering"
          title="Accept online orders"
          description="Turn this off and customers cannot check out with you at all. Your storefront stays visible."
          checked={settings.enableOnlineOrdering}
          onChange={(value) => update({ enableOnlineOrdering: value })}
        />

        <ToggleRow
          id="auto-accept-orders"
          title="Accept orders automatically"
          description="Paid orders go straight to your kitchen without waiting for you to confirm them."
          checked={settings.autoAcceptOrders}
          onChange={(value) => update({ autoAcceptOrders: value })}
        />

        <div className="py-4">
          <Label
            htmlFor="preparation-time"
            className="text-base font-medium text-slate-800"
          >
            Preparation time
          </Label>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Minutes from accepting an order to the food being ready. We send a
            rider to arrive as it is bagged, so a number that is too low means
            they wait and a number too high means the food does.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Input
              id="preparation-time"
              type="number"
              min={1}
              max={600}
              value={settings.preparationTime}
              onChange={(event) =>
                update({ preparationTime: Number(event.target.value) })
              }
              className="h-11 w-28 rounded-md"
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </div>
      </Card>

      <Card className="p-3 md:p-8 border-gray-100 shadow-none">
        <SectionHeading
          title="Pre-orders"
          description="Let customers book a time instead of ordering for right now. Their order reaches you when it is time to start cooking, not when they place it."
        />

        <ToggleRow
          id="enable-pre-orders"
          title="Take pre-orders"
          description="Customers can order while you are closed, for a time you are open."
          checked={settings.enablePreOrders}
          onChange={(value) => update({ enablePreOrders: value })}
        />

        {settings.enablePreOrders && (
          <div className="space-y-6 pt-6">
            <div>
              <Label className="text-base font-medium text-slate-800">
                Earliest a customer can book
              </Label>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                How much notice you need. Nothing closer than this is offered.
              </p>
              <MinutesChoice
                value={settings.minPreOrderTime}
                choices={LEAD_CHOICES}
                onChange={(minutes) => update({ minPreOrderTime: minutes })}
              />
            </div>

            <div>
              <Label className="text-base font-medium text-slate-800">
                How far ahead they can book
              </Label>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Nothing further out than this is offered.
              </p>
              <MinutesChoice
                value={settings.maxPreOrderTime}
                choices={HORIZON_CHOICES}
                minimum={settings.recommendedHorizonMinutes}
                onChange={(minutes) => update({ maxPreOrderTime: minutes })}
              />
              {settings.recommendedHorizonMinutes != null &&
                settings.recommendedHorizonMinutes > 1440 && (
                  <p className="mt-2 text-sm text-amber-700">
                    You are closed for up to{" "}
                    {Math.round(settings.recommendedHorizonMinutes / 1440)} days
                    at a stretch, so anything shorter leaves customers unable to
                    book at all for most of the week.
                  </p>
                )}
            </div>

            {settings.serviceOperations.length > 0 && (
              <div className="pt-2">
                <Label className="text-base font-medium text-slate-800">
                  By service type
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Leave preparation time empty to use your{" "}
                  {settings.preparationTime} minute default.
                </p>
                <div className="space-y-3">
                  {settings.serviceOperations.map((operation) => (
                    <div
                      key={operation.serviceOperationId}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
                    >
                      <span className="font-medium text-slate-700">
                        {operation.label || operation.key}
                      </span>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={600}
                          placeholder={String(settings.preparationTime)}
                          value={operation.preparationTime ?? ""}
                          onChange={(event) =>
                            updateOperation(operation.serviceOperationId, {
                              preparationTime:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                          className="h-10 w-24 rounded-md"
                        />
                        <span className="text-sm text-gray-500">min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-3 md:p-8 border-gray-100 shadow-none">
        <SectionHeading
          title="Capacity"
          description="The most you are willing to take on in one day."
        />
        <div className="flex items-center gap-3">
          <Input
            id="max-order-per-day"
            type="number"
            min={1}
            max={10000}
            value={settings.maxOrderPerDay}
            onChange={(event) =>
              update({ maxOrderPerDay: Number(event.target.value) })
            }
            className="h-11 w-32 rounded-md"
          />
          <span className="text-sm text-gray-500">orders per day</span>
        </div>
        <p className="text-sm text-gray-500 mt-3 max-w-xl">
          Once a day is full, its pre-order times stop being offered.
        </p>
      </Card>

      <Card className="p-3 md:p-8 border-gray-100 shadow-none">
        <SectionHeading
          title="Delivery range"
          description="How far you are willing to send an order, measured by road rather than in a straight line."
        />
        {settings.deliveryRadius === null ? (
          <p className="text-sm text-gray-500 max-w-xl">
            Set your restaurant address before choosing how far you deliver.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Input
                id="delivery-radius"
                type="number"
                min={0}
                max={100}
                value={settings.deliveryRadius}
                onChange={(event) =>
                  update({ deliveryRadius: Number(event.target.value) })
                }
                className="h-11 w-32 rounded-md"
              />
              <span className="text-sm text-gray-500">km</span>
            </div>
            <p className="text-sm text-gray-500 mt-3 max-w-xl">
              {settings.deliveryRadius === 0
                ? "No limit: you will be offered every delivery, however far away."
                : `An address further than ${settings.deliveryRadius}km by road cannot check out. Set this to 0 to lift the limit.`}
            </p>
          </>
        )}
      </Card>

      <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {dirty && (
            <span className="text-sm text-gray-500 mr-auto">
              You have unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            className="rounded-full border-gray-400 text-gray-700"
            onClick={load}
            disabled={saving || !dirty}
          >
            Discard
          </Button>
          <Button
            className="rounded-full bg-munchprimary hover:bg-munchprimaryDark"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
