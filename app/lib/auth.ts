import Cookies from "js-cookie";

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
const TTL_MS = 60 * 2000 * 1000;
export function setAccessToken(token: string | null) {
  if (token) {
    const item = {
      value: token,
      expiry: Date.now() + TTL_MS,
    };
    localStorage.setItem("accessToken", JSON.stringify(item));
  } else {
    localStorage.removeItem("accessToken");
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
  setAccessToken(null); // Clear access token from localStorage
  setBusinessId(null);
  hasBusiness(null);

  // Extract refresh token from cookie to send to backend
  const cookies = document.cookie.split("; ");
  const refreshCookie = cookies.find((row) => row.startsWith("refreshToken="));
  const refreshToken = refreshCookie ? refreshCookie.split("=")[1] : null;

  // Clear refresh token cookie client-side
  document.cookie =
    "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  if (refreshToken) {
    try {
      await fetch("https://dev.api.munchspace.io/api/v1/auth/token/revoke", {
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
