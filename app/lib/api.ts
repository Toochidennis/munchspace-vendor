// app/lib/api.ts (remains as previously provided)
import { getAccessToken, logout, setAccessToken } from "@/app/lib/auth";

const API_BASE = "https://api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

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

  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ refreshToken }),
    });
    // console.log("res", refreshToken);

    if (!response.ok) throw new Error("Refresh failed");
    const res = await response.json();
    const { accessToken, refreshToken: newRefreshToken } = res;

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
