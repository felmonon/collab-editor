"use client";

import { createSessionRecovery } from "./auth-session";

export { SESSION_RECOVERY_ERROR, SIGN_OUT_ERROR } from "./auth-session";

export const recoverExpiredSession = createSessionRecovery({
  endSession: async (callbackUrl, signal) => {
    // Use NextAuth's CSRF-protected sign-out endpoint, with abortable requests.
    // A full navigation after verification clears the stale React session cache
    // without an intermediate session update racing private-page auth guards.
    const csrfResponse = await fetch("/api/auth/csrf", {
      cache: "no-store",
      signal,
    });
    if (!csrfResponse.ok) throw new Error("Session reset unavailable");
    const csrf: unknown = await csrfResponse.json();
    if (
      !csrf || typeof csrf !== "object" ||
      !("csrfToken" in csrf) || typeof csrf.csrfToken !== "string" ||
      !csrf.csrfToken
    )
      throw new Error("Session reset unavailable");
    const response = await fetch("/api/auth/signout", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl, json: "true" }),
    });
    if (!response.ok) throw new Error("Session reset unavailable");
  },
  readSession: async (signal) => {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("Session reset could not be verified");
    return response.json();
  },
  replace: (url) => window.location.replace(url),
  origin: () => window.location.origin,
});

export function signOutSafely() {
  return recoverExpiredSession("/documents", { expired: false });
}
