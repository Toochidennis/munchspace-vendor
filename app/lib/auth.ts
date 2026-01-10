// app/lib/auth.ts (Updated for localStorage persistence of access token)
const TTL_MS = 30 * 60 * 1000;
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
  // console.log("item str", itemStr)
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

  // Extract refresh token from cookie to send to backend
  const cookies = document.cookie.split("; ");
  const refreshCookie = cookies.find((row) => row.startsWith("refreshToken="));
  const refreshToken = refreshCookie ? refreshCookie.split("=")[1] : null;

  // Clear refresh token cookie client-side
  document.cookie =
    "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  if (refreshToken) {
    try {
      await fetch("https://api.munchspace.io/api/v1/auth/token/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key":
            "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==",
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

  // Final redirect to login
  window.location.href = "/login";
}
