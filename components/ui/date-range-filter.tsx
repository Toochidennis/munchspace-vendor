"use client";

import * as React from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Every preset the API's DateRangePreset enum accepts. The screens used to
 * hardcode five of these inline, so the other five were unreachable from the
 * admin — a monthly reconciliation could not be expressed at all.
 */
export const DATE_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_week", label: "Last week" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
] as const;

export type DateRangePresetValue = (typeof DATE_RANGE_PRESETS)[number]["value"];

/**
 * What a screen holds in state and turns into query parameters.
 *
 * `preset` null with no dates is All time — the listing endpoints deliberately
 * declare `range` optional and return every date when it is absent, which the
 * admin previously had no way to ask for.
 */
export type DateRangeSelection = {
  preset: DateRangePresetValue | null;
  startDate?: Date;
  endDate?: Date;
};

export const ALL_TIME: DateRangeSelection = { preset: null };

/**
 * Mirrors resolveDateRangeFromPreset on the server, so the span painted on the
 * calendars is the span the request will actually cover. Kept in step with
 * src/shared/domain/date-range/range-preset.util.ts.
 */
export function resolvePreset(
  preset: DateRangePresetValue,
  now: Date = new Date(),
): { start: Date; end: Date } {
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: now };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "last_week": {
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    }
    case "last_7_days":
      return { start: startOfDay(subDays(now, 7)), end: now };
    case "last_90_days":
      return { start: startOfDay(subDays(now, 90)), end: now };
    case "last_6_months":
      return { start: startOfDay(subMonths(now, 6)), end: now };
    case "this_month":
      return { start: startOfMonth(now), end: now };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "this_year":
      return { start: startOfYear(now), end: now };
    case "last_30_days":
    default:
      return { start: startOfDay(subDays(now, 30)), end: now };
  }
}

/**
 * The one place a selection becomes query parameters, so every screen sends the
 * same thing. A custom range sends both dates or neither — the API rejects a
 * half-open pair — and All time sends nothing at all.
 */
export function applyDateRangeParams(
  params: URLSearchParams,
  selection: DateRangeSelection,
): URLSearchParams {
  if (selection.startDate && selection.endDate) {
    params.set("startDate", selection.startDate.toISOString());
    params.set("endDate", selection.endDate.toISOString());
  } else if (selection.preset) {
    params.set("range", selection.preset);
  }
  return params;
}

/**
 * The inverse of {@link applyDateRangeParams}, so a filtered list can live in
 * the URL and come back intact when the browser navigates back to it.
 *
 * A custom pair wins over a preset, matching how the server reads the same
 * parameters. An unrecognised preset falls back rather than throwing: the query
 * string is user-editable and a typo should not blank the page.
 */
export function readDateRangeParams(
  params: URLSearchParams | ReadonlyURLSearchParamsLike,
  fallback: DateRangeSelection = ALL_TIME,
): DateRangeSelection {
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { preset: null, startDate: start, endDate: end };
    }
  }

  const range = params.get("range");
  if (range) {
    if (range === ALL_TIME_URL_VALUE) return ALL_TIME;

    const known = DATE_RANGE_PRESETS.find((p) => p.value === range);
    if (known) return { preset: known.value };

    // The query string is user-editable; a typo should fall back rather than
    // blank the page.
    return fallback;
  }

  // No date parameters at all is a bare URL, not a choice — the screen's own
  // default applies. All time is written explicitly for exactly this reason.
  return fallback;
}

/**
 * Writes the selection for the address bar rather than for the API.
 *
 * The difference is All time: the API expresses it by sending nothing, which
 * in a URL is indistinguishable from never having chosen. Here it is named, so
 * navigating back to a list restores All time instead of the default.
 */
export function applyDateRangeUrlParams(
  params: URLSearchParams,
  selection: DateRangeSelection,
): URLSearchParams {
  if (selection.startDate && selection.endDate) {
    params.set("startDate", selection.startDate.toISOString());
    params.set("endDate", selection.endDate.toISOString());
  } else if (selection.preset) {
    params.set("range", selection.preset);
  } else {
    params.set("range", ALL_TIME_URL_VALUE);
  }
  return params;
}

const ALL_TIME_URL_VALUE = "all_time";

/** Both URLSearchParams and Next's ReadonlyURLSearchParams satisfy this. */
type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
  has(name: string): boolean;
};

export function describeSelection(selection: DateRangeSelection): string {
  if (selection.startDate && selection.endDate) {
    return `${format(selection.startDate, "d MMM yyyy")} – ${format(selection.endDate, "d MMM yyyy")}`;
  }
  if (!selection.preset) return "All time";

  return (
    DATE_RANGE_PRESETS.find((p) => p.value === selection.preset)?.label ??
    "Select range"
  );
}

const toInputValue = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");

export function DateRangeFilter({
  value,
  onChange,
  align = "start",
  className,
  triggerClassName,
  allowAllTime = true,
}: {
  value: DateRangeSelection;
  onChange: (next: DateRangeSelection) => void;
  align?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
  /**
   * Off for endpoints whose query DTO still declares `range` with a default —
   * analytics, and admin payments. There, omitting the parameter does not mean
   * all dates: the server quietly substitutes 30 days, so offering All time
   * would show a window that disagrees with its own label.
   */
  allowAllTime?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(
    value.startDate && value.endDate
      ? { from: value.startDate, to: value.endDate }
      : undefined,
  );

  // The calendars show the active selection whenever the popover is reopened,
  // including the span a preset covers, so what is highlighted is always what
  // the current list was fetched with.
  React.useEffect(() => {
    if (!open) return;

    if (value.startDate && value.endDate) {
      setDraft({ from: value.startDate, to: value.endDate });
    } else if (value.preset) {
      const { start, end } = resolvePreset(value.preset);
      setDraft({ from: start, to: end });
    } else {
      setDraft(undefined);
    }
  }, [open, value]);

  const isCustom = Boolean(value.startDate && value.endDate);
  const canApplyCustom = Boolean(draft?.from && draft?.to);

  const choosePreset = (preset: DateRangePresetValue | null) => {
    onChange(preset ? { preset } : ALL_TIME);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draft?.from || !draft?.to) return;
    onChange({
      preset: null,
      startDate: startOfDay(draft.from),
      endDate: endOfDay(draft.to),
    });
    setOpen(false);
  };

  const editBound = (which: "from" | "to", raw: string) => {
    if (!raw) return;
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setDraft((prev) => ({ ...prev, [which]: parsed }) as DateRange);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 justify-between gap-2 rounded border-slate-200 bg-white font-normal text-slate-700",
            className,
            triggerClassName,
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            {describeSelection(value)}
          </span>
          <ChevronDown size={16} className="text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="z-[150] w-auto rounded border-slate-200 p-0 shadow-lg"
      >
        <div className="flex">
          <div className="max-h-[340px] w-[172px] shrink-0 overflow-y-auto border-r border-slate-100 py-2">
            {DATE_RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => choosePreset(preset.value)}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm transition-colors",
                  value.preset === preset.value
                    ? "bg-munchprimary/10 font-medium text-munchprimary"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {preset.label}
              </button>
            ))}

            <div className="my-2 border-t border-slate-100" />

            {allowAllTime && (
            <button
              onClick={() => choosePreset(null)}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm transition-colors",
                !value.preset && !isCustom
                  ? "bg-munchprimary/10 font-medium text-munchprimary"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              All time
            </button>
            )}
            <div
              className={cn(
                "px-4 py-2 text-left text-sm",
                isCustom
                  ? "bg-munchprimary/10 font-medium text-munchprimary"
                  : "text-slate-400",
              )}
            >
              Custom
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-end gap-3">
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">Start</label>
                <Input
                  type="date"
                  value={toInputValue(draft?.from)}
                  max={toInputValue(new Date())}
                  onChange={(e) => editBound("from", e.target.value)}
                  className="h-9 w-[150px] rounded border-slate-200 text-sm"
                />
              </div>
              <span className="pb-2 text-slate-300">–</span>
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">End</label>
                <Input
                  type="date"
                  value={toInputValue(draft?.to)}
                  max={toInputValue(new Date())}
                  onChange={(e) => editBound("to", e.target.value)}
                  className="h-9 w-[150px] rounded border-slate-200 text-sm"
                />
              </div>
            </div>

            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from}
              // Nothing has happened in the future, so offering those days only
              // ever produces an empty result.
              disabled={{ after: new Date() }}
              numberOfMonths={2}
              autoFocus
            />

            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-9 rounded border-slate-200 px-5 font-normal text-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={applyCustom}
                disabled={!canApplyCustom}
                className="h-9 rounded bg-munchprimary px-5 font-medium text-white hover:bg-munchprimaryDark"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
