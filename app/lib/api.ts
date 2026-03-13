// app/lib/api.ts (remains as previously provided)
import { getAccessToken, logout, setAccessToken } from "@/app/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_MUNCHSPACE_API_BASE || "";
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
  // console.log("refresh token", refreshToken)

  if (!refreshToken) return null;

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
    return null;
  }
}
