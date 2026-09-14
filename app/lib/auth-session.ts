// The v2 auth protocol. Screens read `next.action` and render it rather than
// deciding the order of steps themselves.

import { getApiErrorMessage } from "@/app/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

/**
 * `.../api/v1` -> `.../api/v2/auth`. Both halves matter: dropping `/auth`, or a
 * trailing slash on the variable, 404s as though nothing were deployed.
 */
function resolveAuthBase(): string {
  const override = process.env.NEXT_PUBLIC_AUTH_BASE_URL;
  if (override) return override.replace(/\/+$/, "");

  const base = API_BASE.replace(/\/+$/, "");
  const versioned = base.replace(/\/v\d+$/, "/v2");

  if (versioned === base && base && process.env.NODE_ENV !== "production") {
    console.warn(
      `[auth] NEXT_PUBLIC_BASE_URL ("${base}") has no version segment, so the ` +
        "v2 auth base could not be derived. Set NEXT_PUBLIC_AUTH_BASE_URL.",
    );
  }

  return `${versioned}/auth`;
}

export const AUTH_BASE = resolveAuthBase();

export const AUTH_SESSION_HEADER = "x-auth-session";

export type AuthFactor = "PASSWORD" | "OTP";
export type AuthIntent = "SIGNUP" | "LOGIN" | "RECOVERY" | "STEP_UP";
export type NextAction = "SUBMIT_FACTOR" | "SET_PASSWORD" | "NONE";

export type AuthSessionNext = {
  action: NextAction;
  availableFactors: AuthFactor[];
  pendingFactors: AuthFactor[];
  satisfiedFactors: AuthFactor[];
};

/** What the server returns for every session step. */
export type AuthSessionState = {
  status: "PENDING" | "COMPLETED";
  intent: AuthIntent;
  expiresAt: string;
  next: AuthSessionNext;

  /** Present only on the call that starts a session. */
  sessionToken?: string;

  /** Present only once a sign-in or signup has completed. */
  accessToken?: string;
  refreshToken?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  vendor?: {
    firstName: string;
    lastName: string;
    displayName: string;
    hasBusiness: boolean;
    businessId: string | null;
  };
  admin?: unknown;
  customer?: boolean;
  rider?: unknown;
};

export type MessageResponse = { message: string };

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status: number };

export function isComplete(
  state: AuthSessionState,
): state is AuthSessionState & { accessToken: string; refreshToken: string } {
  return (
    state.status === "COMPLETED" && !!state.accessToken && !!state.refreshToken
  );
}

/** Errors come back as values so the screens stay linear. */
async function call<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    sessionToken?: string;
    accessToken?: string;
  } = {},
): Promise<AuthResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  };

  if (init.sessionToken) headers[AUTH_SESSION_HEADER] = init.sessionToken;
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;

  let response: Response;

  try {
    response = await fetch(`${AUTH_BASE}${path}`, {
      method: init.method ?? "POST",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Network error. Please check your connection and try again.",
    };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: getApiErrorMessage(
        body,
        "Something went wrong. Please try again.",
        response.status,
      ),
    };
  }

  return { ok: true, data: (body as { data: T })?.data };
}

// ── starting a session ────────────────────────────────────────────────────

export type SignupInput = {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password?: string;
  birthMonth?: number;
  birthDay?: number;
};

export function startSignup(input: SignupInput) {
  return call<AuthSessionState>("/sessions/signup", { body: input });
}

export function startLogin(identifier: string) {
  return call<AuthSessionState>("/sessions/login", { body: { identifier } });
}

/** Answers the same either way, so the screen must not branch on the result. */
export function startRecovery(identifier: string) {
  return call<MessageResponse>("/sessions/recovery", { body: { identifier } });
}

export function startStepUp(accessToken: string) {
  return call<AuthSessionState>("/sessions/step-up", { accessToken });
}

// ── moving a session along ────────────────────────────────────────────────

export function submitPassword(sessionToken: string, password: string) {
  return call<AuthSessionState>("/sessions/factors/password", {
    sessionToken,
    body: { password },
  });
}

export function requestCode(sessionToken: string) {
  return call<MessageResponse>("/sessions/factors/otp/request", {
    sessionToken,
    body: {},
  });
}

export function submitCode(sessionToken: string, code: string) {
  return call<AuthSessionState>("/sessions/factors/otp/verify", {
    sessionToken,
    body: { code },
  });
}

/** Finishes a recovery or a step-up. Refused until the session is satisfied. */
export function setPassword(sessionToken: string, newPassword: string) {
  return call<MessageResponse>("/sessions/password", {
    sessionToken,
    body: { newPassword },
  });
}

export function readSession(sessionToken: string) {
  return call<AuthSessionState>("/sessions/current", {
    method: "GET",
    sessionToken,
  });
}

export function abandonSession(sessionToken: string) {
  return call<MessageResponse>("/sessions/current", {
    method: "DELETE",
    sessionToken,
  });
}

// ── tokens ────────────────────────────────────────────────────────────────

export type TokenPair = { accessToken: string; refreshToken?: string };

export function refreshTokens(refreshToken: string) {
  return call<TokenPair>("/tokens/refresh", { body: { refreshToken } });
}

export function revokeToken(refreshToken: string, accessToken?: string) {
  return call<MessageResponse>("/tokens/revoke", {
    body: { refreshToken },
    accessToken,
  });
}

// ── composed flows ────────────────────────────────────────────────────────

/**
 * Follows `next.action` rather than assuming the order, so a change to step-up
 * policy asks for a code instead of failing obscurely.
 */
export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult<MessageResponse>> {
  const started = await startStepUp(accessToken);
  if (!started.ok) return started;

  const sessionToken = started.data.sessionToken;
  if (!sessionToken) {
    return {
      ok: false,
      status: 0,
      message: "Could not start a verification session. Please try again.",
    };
  }

  let state = started.data;

  if (state.next.action === "SUBMIT_FACTOR") {
    if (!state.next.pendingFactors.includes("PASSWORD")) {
      return {
        ok: false,
        status: 0,
        message:
          "This account needs a verification code to change its password. Please use the forgot-password link instead.",
      };
    }

    const proven = await submitPassword(sessionToken, currentPassword);
    if (!proven.ok) return proven;
    state = proven.data;
  }

  if (state.next.action !== "SET_PASSWORD") {
    return {
      ok: false,
      status: 0,
      message: "Verification is not complete. Please try again.",
    };
  }

  return setPassword(sessionToken, newPassword);
}
