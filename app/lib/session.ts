/**
 * How long a vendor may stay signed in, regardless of activity.
 *
 * The refresh token lives 30 days server-side, so a client that refreshes
 * whenever the 2-hour access token lapses would keep one session alive for a
 * month. Bounding it here means refreshing is allowed freely inside the window
 * and refused outside it, which ends the session and sends the vendor back to
 * sign in — long enough to cover a full trading day without re-authenticating
 * mid-service.
 *
 * Bounding it on the client is a usability measure, not a security control —
 * the refresh token remains valid until the server revokes or expires it.
 */
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

const SESSION_ENDS_KEY = "sessionEndsAt";

/**
 * Starts the session clock. Called once when credentials are exchanged, never
 * on refresh, so refreshing extends nothing.
 *
 * `durationMs` exists for sessions that are not ordinary sign-ins: an
 * impersonation token is minted for around 30 minutes and issues no refresh
 * token, so pinning its session to the usual 12 hours would leave the app
 * believing a long-dead token was good.
 */
export function startSession(durationMs: number = MAX_SESSION_MS) {
  if (typeof window === "undefined") return;
  const bounded = Math.min(Math.max(durationMs, 0), MAX_SESSION_MS);
  localStorage.setItem(SESSION_ENDS_KEY, String(Date.now() + bounded));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_ENDS_KEY);
}

/**
 * Whether the session may still be extended.
 *
 * A missing marker is treated as expired: it means the session predates this
 * check or the entry was cleared, and re-authenticating is the safe answer.
 */
export function isSessionRenewable(): boolean {
  if (typeof window === "undefined") return false;

  const endsAt = Number(localStorage.getItem(SESSION_ENDS_KEY));
  if (!Number.isFinite(endsAt) || endsAt <= 0) return false;

  return Date.now() < endsAt;
}

/** Expiry to stamp on stored tokens, so nothing outlives the session. */
export function sessionExpiry(): number {
  if (typeof window === "undefined") return Date.now() + MAX_SESSION_MS;

  const endsAt = Number(localStorage.getItem(SESSION_ENDS_KEY));
  return Number.isFinite(endsAt) && endsAt > 0
    ? endsAt
    : Date.now() + MAX_SESSION_MS;
}

/**
 * When a JWT says it expires, in epoch ms, or null if it cannot be read.
 *
 * Read from the token rather than taken on trust from a query parameter, so a
 * tampered or stale link cannot buy itself a longer session than the server
 * actually granted. This is not verification — the server still rejects a
 * token it did not sign; it only stops the client believing a lie about
 * lifetime.
 */
export function readTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp;

    return typeof exp === "number" && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}
