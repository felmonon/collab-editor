import { safeSignInDestination } from "./auth-providers";

export const SESSION_RECOVERY_ERROR =
  "Your sign-in has expired, but we couldn’t reset the session. Check your connection and try again.";
export const SIGN_OUT_ERROR =
  "You couldn’t be signed out. Check your connection and try again.";

export function createSessionRecovery({
  endSession,
  readSession,
  replace,
  origin,
  timeoutMs = 10000,
}: {
  endSession: (returnUrl: string, signal: AbortSignal) => Promise<unknown>;
  readSession: (signal: AbortSignal) => Promise<unknown>;
  replace: (url: string) => void;
  origin: () => string;
  timeoutMs?: number;
}) {
  let pending: Promise<void> | null = null;

  return (
    destination: string,
    options: { expired?: boolean } = {},
  ): Promise<void> => {
    if (pending) return pending;
    const returnTo = safeSignInDestination(destination, origin());
    const expired = options.expired !== false;
    const loginUrl = expired
      ? `/login?reason=session-expired&callbackUrl=${encodeURIComponent(returnTo)}`
      : "/login";
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Session reset timed out"));
      }, timeoutMs);
    });
    const operation = Promise.resolve()
      .then(() => endSession(loginUrl, controller.signal))
      .then(() => {
        controller.signal.throwIfAborted();
        return readSession(controller.signal);
      })
      .then((session) => {
        controller.signal.throwIfAborted();
        // Confirm the server has cleared the session before discarding the
        // client cache. Error payloads must never be treated as signed out.
        if (
          session !== null &&
          (!session || typeof session !== "object" ||
            Array.isArray(session) || Object.keys(session).length !== 0)
        )
          throw new Error("Session remains active");
        replace(loginUrl);
      });
    const attempt = Promise.race([operation, timeout])
      .catch(() => {
        throw new Error(expired ? SESSION_RECOVERY_ERROR : SIGN_OUT_ERROR);
      })
      .finally(() => {
        clearTimeout(timer);
        // The editor's unsaved-changes prompt can cancel location.replace().
        // Only share an in-flight attempt; a later retry must remain possible.
        if (pending === attempt) pending = null;
      });
    pending = attempt;
    return attempt;
  };
}
