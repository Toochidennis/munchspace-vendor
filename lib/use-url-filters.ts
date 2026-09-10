"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps a screen's filters in the address bar instead of in component state.
 *
 * Filters used to live in useState, so opening a row and coming back mounted a
 * fresh list at its defaults — the selection was never anywhere that could
 * survive the unmount. Holding it in the URL means the browser restores it on
 * back, and a filtered view can be linked to or handed to someone else.
 *
 * The whole filter set is read and written as one object. Per-key hooks read
 * stale parameters when a handler changes two things at once — picking a date
 * and resetting to page one, say — and the second write drops the first.
 *
 * Writes use `replace`, not `push`: each keystroke in a search box would
 * otherwise become a history entry the reader has to walk back through.
 */
export function useUrlFilters<T>(config: {
  /** Reads the filter object out of the query string. */
  parse: (params: URLSearchParams) => T;
  /** Writes it back. Only write what differs from the default, so a plain URL stays plain. */
  serialize: (value: T, params: URLSearchParams) => void;
}): [T, (next: T | ((previous: T) => T)) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Held in a ref so the setter is stable and always writes against the
  // parameters as they are now, not as they were when it was created.
  const configRef = React.useRef(config);
  configRef.current = config;

  const queryString = searchParams.toString();

  const value = React.useMemo(
    () => configRef.current.parse(new URLSearchParams(queryString)),
    [queryString],
  );

  const valueRef = React.useRef(value);
  valueRef.current = value;

  const setValue = React.useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (previous: T) => T)(valueRef.current)
          : next;

      const params = new URLSearchParams();
      configRef.current.serialize(resolved, params);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  return [value, setValue];
}

/** Reads a positive integer, falling back when the parameter is absent or junk. */
export function readNumberParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const raw = params.get(key);
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
