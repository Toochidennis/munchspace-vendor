/**
 * Where to send someone back to once they have authenticated.
 *
 * A vendor following an order link from email lands on a protected page with no
 * session. Every path out of that — the route gate in ClientWrapper, a 401 from
 * any of the per-page authenticatedFetch copies, an unusable refresh token —
 * ends in logout(), which replaced the URL with a bare /login. The destination
 * was gone before the login form rendered, so signing in always dropped them on
 * the dashboard instead of the order they clicked.
 */

const LOGIN_PATH = "/login";
const DEFAULT_TARGET = "/restaurant/dashboard";

/** Routes that exist to get a session. Returning to one after login loops. */
const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/impersonate",
  "/setup-your-store",
];

/**
 * Same-origin absolute paths only.
 *
 * `next` arrives from a query string, so anything a browser would read as a
 * host has to be refused or the login page becomes an open redirect: not just
 * "https://evil.com" but "//evil.com" and "/\evil.com", both of which are
 * protocol-relative URLs despite the leading slash.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;

  const path = value.split(/[?#]/)[0];
  if (AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`))) {
    return null;
  }

  return value;
}

/** The page being left, query string included, or null if it is not worth returning to. */
export function currentReturnTo(): string | null {
  if (typeof window === "undefined") return null;

  const { pathname, search } = window.location;
  return sanitizeReturnTo(`${pathname}${search}`);
}

export function loginUrlWithReturnTo(
  returnTo: string | null | undefined,
): string {
  const target = sanitizeReturnTo(returnTo);
  return target ? `${LOGIN_PATH}?next=${encodeURIComponent(target)}` : LOGIN_PATH;
}

/** Read back by the login form once credentials check out. */
export function postLoginTarget(fallback: string = DEFAULT_TARGET): string {
  if (typeof window === "undefined") return fallback;

  const next = new URLSearchParams(window.location.search).get("next");
  return sanitizeReturnTo(next) ?? fallback;
}
