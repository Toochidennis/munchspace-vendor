import Cookies from "js-cookie";
import { clearSession, sessionExpiry } from "@/app/lib/session";

// Same base every other request uses. Hardcoding dev here meant logout hit
// dev no matter which environment the app was pointed at.
const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";

export function setFirstName(name: string | null) {
  if (name) {
    const item = {
      value: name,
      expiry: Date.now() + 60 * 2000 * 10000,
    };
    localStorage.setItem("firstName", JSON.stringify(item));
  } else {
    localStorage.removeItem("firstName");
  }
}

export function getFirstName(): string | null {
  const itemStr = localStorage.getItem("firstName");
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem("firstName");
      return null; // Expired
    }
    return item.value;
  } catch (error) {
    localStorage.removeItem("firstName");
    return null;
  }
}

export function setDisplayName(name: string | null) {
  if (name) {
    const item = {
      value: name,
      expiry: Date.now() + 60 * 2000 * 10000,
    };
    localStorage.setItem("displayName", JSON.stringify(item));
  } else {
    localStorage.removeItem("displayName");
  }
}

export function getDisplayName(): string | null {
  const itemStr = localStorage.getItem("displayName");
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem("displayName");
      return null; // Expired
    }
    return item.value;
  } catch (error) {
    localStorage.removeItem("displayName");
    return null;
  }
}

export function setBusinessId(id: string | null) {
  if (id) {
    const item = {
      value: id,
      expiry: Date.now() + 60 * 2000 * 10000,
    };
    localStorage.setItem("businessId", JSON.stringify(item));
    Cookies.set("businessId", id, {
      expires: COOKIE_EXPIRY_DAYS,
      path: "/",
      sameSite: "lax",
    });
  } else {
    localStorage.removeItem("businessId");
    Cookies.remove("businessId");
  }
}

const COOKIE_EXPIRY_DAYS = 1388;

export function hasBusiness(value: boolean | null) {
  if (value !== null) {
    // Cookies handles the stringification and expiry natively
    Cookies.set("hasBusiness", value.toString(), {
      expires: COOKIE_EXPIRY_DAYS,
      path: "/",
      sameSite: "lax",
    });
  } else {
    Cookies.remove("hasBusiness");
  }
}

export function getHasBusiness(): string | null {
  const value = Cookies.get("hasBusiness");

  if (!value) return null;

  // Browser cookies automatically handle expiration,
  // so we don't need the manual Date.now() check here.
  return value;
}

export function getBusinessId(): string | null {
  const itemStr = localStorage.getItem("businessId");
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem("businessId");
      return null; // Expired
    }
    return item.value;
  } catch (error) {
    localStorage.removeItem("businessId");
    return null;
  }
}

// app/lib/auth.ts (Updated for localStorage persistence of access token)
// Tokens are stamped with the session's own end, so a stored token never looks
// valid for longer than the session it belongs to — including an impersonation
// session, which is far shorter than a normal sign-in.
export function setAccessToken(token: string | null) {
  if (token) {
    const expiry = sessionExpiry();
    const item = {
      value: token,
      expiry,
    };
    localStorage.setItem("accessToken", JSON.stringify(item));
    Cookies.set("accessToken", token, {
      expires: new Date(expiry),
      path: "/",
      sameSite: "lax",
    });
  } else {
    localStorage.removeItem("accessToken");
    Cookies.remove("accessToken");
  }
}

export function getAccessToken(): string | null {
  const itemStr = localStorage.getItem("accessToken");
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem("accessToken");
      return null; // Expired
    }
    return item.value;
  } catch (error) {
    localStorage.removeItem("accessToken");
    return null;
  }
}

export async function logout() {
  const accessToken = getAccessToken();
  clearSession();
  setAccessToken(null); // Clear access token from localStorage
  setBusinessId(null);
  hasBusiness(null);
  // Set when an admin impersonates a vendor, and read by the sidebar. Left
  // behind, it shows admin affordances to whoever signs in next on this
  // browser until their own login overwrites it.
  localStorage.removeItem("admin");

  // Extract refresh token from cookie to send to backend
  const cookies = document.cookie.split("; ");
  const refreshCookie = cookies.find((row) => row.startsWith("refreshToken="));
  const refreshToken = refreshCookie ? refreshCookie.split("=")[1] : null;

  // Clear refresh token and access token cookies client-side
  document.cookie =
    "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie =
    "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/token/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }), // Optional: include if backend requires it
        },
        body: JSON.stringify({ refreshToken }),
      });
      // Ignore response – even if it fails, we continue with client-side cleanup
    } catch (err) {
      console.error("Backend token revocation failed:", err);
      // Proceed with logout regardless
    }
  }

  // Clear browser history to prevent back navigation
  // Push new states to overwrite history stack
  for (let i = 0; i < window.history.length; i++) {
    window.history.pushState(null, "", "/login");
  }

  // Redirect to login (use replace to clear current history entry)
  window.location.replace("/login");
}
