// app/lib/api.ts (remains as previously provided)
import { getAccessToken, logout, setAccessToken } from "@/app/lib/auth";
import { isSessionRenewable } from "@/app/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

async function rawFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  return fetch(`${API_BASE}${endpoint}`, { ...options, headers });
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  let response = await rawFetch(endpoint, options);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setAccessToken(newToken);
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      };
      response = await rawFetch(endpoint, {
        ...options,
        headers: retryHeaders,
      });
    } else {
      logout();
    }
  }
  return response;
}

export async function refreshAccessToken(): Promise<string | null> {
  const cookies = document.cookie.split("; ");
  const refreshCookie = cookies.find((row) => row.startsWith("refreshToken="));
  const refreshToken = refreshCookie ? refreshCookie.split("=")[1] : null;

  if (!refreshToken) {
    logout();
    return null;
  }

  // Sessions are bounded rather than renewed indefinitely — see lib/session.
  if (!isSessionRenewable()) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error("Refresh failed");
    const res = await response.json();
    const { accessToken, refreshToken: newRefreshToken } = res.data;

    setAccessToken(accessToken);
    if (newRefreshToken) {
      document.cookie = `refreshToken=${newRefreshToken}; path=/; secure; samesite=strict; max-age=${
        60 * 60 * 24 * 30
      }`;
    }
    return accessToken;
  } catch (err) {
    console.error("Refresh failed:", err);
    logout();
    return null;
  }
}

/**
 * Pulls the human-readable reason out of an API error response.
 *
 * The API answers every failure with the same envelope:
 *
 *   { success: false, statusCode: 400, error: "Business name already taken" }
 *
 * and for validation failures `error` is an array of strings. There is no
 * `message` field on it — anywhere. Reading `body.message` therefore always
 * yields undefined, which is why so many screens showed their own generic
 * fallback and swallowed what the server actually said.
 *
 * Falls back to copy chosen by status code, so a caller never has to invent
 * wording for the cases that are the same everywhere.
 */
export function getApiErrorMessage(
  body: unknown,
  fallback = "Something went wrong. Please try again.",
  status?: number,
): string {
  const envelope = body as { error?: unknown; statusCode?: number } | null;
  const error = envelope?.error;
  // The envelope carries its own statusCode, so a caller holding only the
  // parsed body still gets status-appropriate wording.
  status = status ?? envelope?.statusCode;

  if (typeof error === "string" && error.trim()) return error.trim();

  if (Array.isArray(error)) {
    const parts = error.filter(
      (entry): entry is string => typeof entry === "string" && !!entry.trim(),
    );
    if (parts.length) return parts.join(" ");
  }

  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
    case 409:
      return "That conflicts with something that already exists.";
    case 413:
      return "That file is too large.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return status && status >= 500
        ? "Something went wrong on our end. Please try again shortly."
        : fallback;
  }
}

/**
 * Reads an error message straight off a failed Response. Safe to call on a
 * body that is empty or not JSON.
 */
export async function readApiError(
  response: Response,
  fallback?: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  return getApiErrorMessage(body, fallback, response.status);
}
