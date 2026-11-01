"use client";

import Link from "next/link";
import { getProviders, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand";
import { Initials } from "@/components/documents/document-collection";
import {
  recoverExpiredSession,
  SESSION_RECOVERY_ERROR,
} from "@/lib/auth-session-client";
import {
  socialProviderNames,
  type SocialProviderId,
} from "@/lib/auth-providers";

type ConnectProvider = "google" | "github";
type AccountMethods = { providers: string[]; hasPassword: boolean };
type AccountLoad =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: AccountMethods };
type AvailableProviders = {
  status: "loading" | "ready" | "error";
  ids: string[];
};

const loginUrl = "/login?callbackUrl=%2Faccount";

function connectionErrorMessage(code: string) {
  if (code === "ConnectionExpired")
    return "This connection request expired. Start again from this page to connect your sign-in method.";
  if (code === "ConnectionSessionChanged")
    return "Your signed-in account changed during the connection. Check the account shown below, then start again if it’s the account you want to connect.";
  if (code === "OAuthAccountNotLinked")
    return "That sign-in account is already associated with another Collab account. No connection was added here. Use a different provider account, or contact support if you need help.";
  if (code === "AccessDenied")
    return "The connection wasn’t completed. Start again from this page while signed in, then approve the provider’s request.";
  return "We couldn’t finish connecting that sign-in method. Check the connected methods below, then try again. Your existing sign-in methods remain available.";
}

function ProviderIcon({ provider }: { provider: SocialProviderId }) {
  if (provider === "google")
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  if (provider === "apple")
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.76 3.08.82 1.18-.24 2.31-.94 3.57-.85 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function AccountLoading() {
  return (
    <main
      role="status"
      className="flex min-h-screen items-center justify-center gap-3 bg-[#f6f7fb] text-sm text-[#626977]"
    >
      <Loader2
        size={19}
        className="animate-spin text-[#315BEE]"
        aria-hidden="true"
      />{" "}
      Opening account settings…
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountGate />
    </Suspense>
  );
}

function AccountGate() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "unauthenticated") router.replace(loginUrl);
  }, [status, router]);
  if (status !== "authenticated" || !session?.user?.id)
    return <AccountLoading />;
  return <AccountSettings key={session.user.id} user={session.user} />;
}

function AccountSettings({
  user,
}: {
  user: { id: string; name?: string | null; email?: string | null };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<AccountLoad>({ status: "loading" });
  const [available, setAvailable] = useState<AvailableProviders>({
    status: "loading",
    ids: [],
  });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [connecting, setConnecting] = useState<ConnectProvider | null>(null);
  const [actionError, setActionError] = useState("");
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);
  const callbackError = searchParams.get("error");
  const error =
    actionError ||
    (callbackError && callbackError !== dismissedError
      ? connectionErrorMessage(callbackError)
      : "");
  const accountName = user.name || "Your account";

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch("/api/account/providers", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) await recoverExpiredSession("/account");
          return;
        }
        if (!response.ok) throw new Error("Account methods unavailable");
        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== "object" ||
          !("providers" in data) ||
          !Array.isArray(data.providers) ||
          !data.providers.every((provider) => typeof provider === "string") ||
          !("hasPassword" in data) ||
          typeof data.hasPassword !== "boolean"
        )
          throw new Error("Invalid account methods");
        if (active)
          setAccount({
            status: "ready",
            data: { providers: data.providers, hasPassword: data.hasPassword },
          });
      })
      .catch((error: unknown) => {
        if (active) {
          setAccount({ status: "error" });
          if (error instanceof Error && error.message === SESSION_RECOVERY_ERROR)
            setActionError(SESSION_RECOVERY_ERROR);
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadAttempt, router]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      active = false;
      setAvailable({ status: "error", ids: [] });
    }, 10000);
    getProviders()
      .then((providers) => {
        if (!providers) throw new Error("Provider discovery unavailable");
        if (active)
          setAvailable({
            status: "ready",
            ids: Object.values(providers)
              .filter((provider) => provider.type === "oauth")
              .map((provider) => provider.id),
          });
      })
      .catch(() => {
        if (active) setAvailable({ status: "error", ids: [] });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [loadAttempt]);

  function refreshMethods() {
    setAccount({ status: "loading" });
    setAvailable({ status: "loading", ids: [] });
    setActionError("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function connect(provider: ConnectProvider) {
    if (
      connecting ||
      account.status !== "ready" ||
      account.data.providers.includes(provider) ||
      available.status !== "ready" ||
      !available.ids.includes(provider)
    )
      return;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setConnecting(provider);
    setActionError("");
    setDismissedError(callbackError);
    try {
      const response = await fetch("/api/account/providers", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!activeRef.current || controller.signal.aborted) return;
      if (response.status === 401) {
        await recoverExpiredSession("/account");
        return;
      }
      if (!response.ok) throw new Error("Connection could not start");
      const result: unknown = await response.json();
      if (!activeRef.current || controller.signal.aborted) return;
      if (
        !result ||
        typeof result !== "object" ||
        !("ok" in result) ||
        result.ok !== true ||
        !("callbackUrl" in result) ||
        result.callbackUrl !== `/account?connect=${provider}`
      )
        throw new Error("Connection could not start");
      window.clearTimeout(timeout);
      const redirectResult: unknown = await signIn(
        provider,
        { callbackUrl: result.callbackUrl },
        provider === "google" ? { prompt: "select_account" } : undefined,
      );
      if (!activeRef.current) return;
      if (redirectResult && typeof redirectResult === "object") {
        if (
          "error" in redirectResult &&
          typeof redirectResult.error === "string" &&
          redirectResult.error
        )
          setActionError(connectionErrorMessage(redirectResult.error));
        else if ("ok" in redirectResult && redirectResult.ok === false)
          throw new Error("Connection could not start");
      }
    } catch (error) {
      if (activeRef.current)
        setActionError(
          error instanceof Error && error.message === SESSION_RECOVERY_ERROR
            ? SESSION_RECOVERY_ERROR
            : `We couldn’t start the ${socialProviderNames[provider]} connection. Please try again from this page.`,
        );
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      if (activeRef.current) setConnecting(null);
    }
  }

  const methods: SocialProviderId[] = [
    "google",
    "github",
    ...(account.status === "ready" && account.data.providers.includes("apple")
      ? ["apple" as const]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#171923] lg:pl-[232px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col bg-[#191b23] lg:flex">
        <Link
          href="/documents"
          aria-label="Collab Editor workspace"
          className="mx-6 mb-10 mt-7 w-fit"
        >
          <BrandLogo inverted />
        </Link>
        <nav aria-label="Workspace navigation" className="space-y-1 px-3">
          <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.13em] text-[#a5adbe]">
            Workspace
          </p>
          <Link
            href="/documents"
            className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-xs text-[#a5adbe] hover:bg-white/5 hover:text-white"
          >
            <FileText size={16} aria-hidden="true" />
            All documents
          </Link>
          <Link
            href="/account"
            aria-current="page"
            className="flex h-11 items-center gap-2.5 rounded-lg bg-[#30384f] px-3 text-xs font-medium text-[#dbe4ff]"
          >
            <Settings2
              size={16}
              className="text-[#8daaff]"
              aria-hidden="true"
            />
            Account settings
          </Link>
        </nav>
        <div className="mt-auto px-5 pb-6">
          <div className="flex items-center gap-2.5 border-t border-[#30333e] pt-5">
            <Initials name={accountName} inverted />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#dce1eb]">
                {accountName}
              </p>
              <p className="mt-1 truncate text-[11px] text-[#a5adbe]">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
      <header className="flex h-[65px] items-center justify-between gap-4 border-b border-[#e6e8ef] bg-white px-5 sm:px-8 lg:px-10">
        <Link
          href="/documents"
          aria-label="Collab Editor workspace"
          className="lg:hidden"
        >
          <BrandLogo />
        </Link>
        <div className="hidden items-center gap-2.5 text-xs lg:flex">
          <span className="text-[#626977]">Workspace</span>
          <ChevronRight
            size={13}
            className="text-[#a5adbe]"
            aria-hidden="true"
          />
          <span className="font-medium">Account settings</span>
        </div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#626977] hover:text-[#315BEE]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to documents
        </Link>
      </header>
      <main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#626977]">
          Your account
        </p>
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.045em] sm:text-[40px]">
          Sign-in methods
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[#626977]">
          Choose how you return to your workspace. Connect another sign-in
          method to this account and keep your documents together.
        </p>
        <section
          aria-label="Current account"
          className="mt-8 flex items-center gap-3.5 rounded-xl border border-[#e6e8ef] bg-white px-5 py-5 sm:px-6"
        >
          <Initials name={accountName} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold">{accountName}</p>
            <p className="mt-1 break-words text-xs text-[#626977]">
              {user.email || "No email address available"}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-[#626977] sm:flex">
            <ShieldCheck
              size={14}
              className="text-[#315BEE]"
              aria-hidden="true"
            />
            Current account
          </span>
        </section>
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900"
          >
            {error}
          </div>
        )}
        <section aria-labelledby="connected-services" className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="connected-services" className="text-sm font-semibold">
              Connected services
            </h2>
            <button
              type="button"
              disabled={
                Boolean(connecting) ||
                account.status === "loading" ||
                available.status === "loading"
              }
              onClick={refreshMethods}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#626977] hover:bg-[#eaf0ff] hover:text-[#315BEE] disabled:opacity-50"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Refresh status
            </button>
          </div>
          {account.status === "loading" ? (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-[#e6e8ef] bg-white px-6 py-9 text-sm text-[#626977]"
            >
              <Loader2
                size={17}
                className="animate-spin text-[#315BEE]"
                aria-hidden="true"
              />
              Checking your sign-in methods…
            </div>
          ) : account.status === "error" ? (
            <div
              role="alert"
              className="rounded-xl border border-[#e6e8ef] bg-white p-6 text-sm text-[#626977]"
            >
              <p>We couldn’t load your connected sign-in methods.</p>
              <button
                type="button"
                onClick={refreshMethods}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce2f1] px-4 text-xs font-semibold text-[#315BEE]"
              >
                <RefreshCw size={13} aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e6e8ef] bg-white">
              <div className="divide-y divide-[#e6e8ef]">
                {methods.map((provider) => {
                  const linked = account.data.providers.includes(provider);
                  const enabled =
                    available.status === "ready" &&
                    available.ids.includes(provider);
                  return (
                    <div
                      key={provider}
                      className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e6e8ef] bg-white">
                        <ProviderIcon provider={provider} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">
                          {socialProviderNames[provider]}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#626977]">
                          {linked
                            ? "Connected to this account"
                            : available.status === "loading"
                              ? "Checking availability…"
                              : available.status === "error"
                                ? "Availability couldn’t be checked"
                                : enabled
                                  ? "Add another way to sign in"
                                  : "Not available to connect right now"}
                        </p>
                      </div>
                      {linked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf2ff] px-3 py-1.5 text-[11px] font-medium text-[#315BEE]">
                          <Check size={12} aria-hidden="true" />
                          Connected
                        </span>
                      ) : provider !== "apple" && enabled ? (
                        <button
                          type="button"
                          disabled={Boolean(connecting)}
                          onClick={() => void connect(provider)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce2f1] px-3.5 text-xs font-semibold text-[#315BEE] transition-colors hover:border-[#b2c3fb] hover:bg-[#f1f4ff] disabled:opacity-50"
                        >
                          {connecting === provider ? (
                            <>
                              <Loader2
                                size={13}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                              Connecting…
                            </>
                          ) : (
                            <>
                              Connect {socialProviderNames[provider]}
                              <ArrowUpRight size={13} aria-hidden="true" />
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-3 border-t border-[#e6e8ef] bg-[#fafbfe] px-5 py-4 text-xs leading-6 text-[#626977] sm:px-6">
                <KeyRound
                  size={15}
                  className="mt-1 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-[#414653]">
                    {account.data.hasPassword
                      ? "Email and password is enabled"
                      : "This account uses social sign-in"}
                  </p>
                  <p>
                    {account.data.hasPassword
                      ? "You can also sign in using this account’s email and password."
                      : "Use one of your connected services to sign in."}
                  </p>
                </div>
              </div>
            </div>
          )}
          {available.status === "error" && (
            <p role="status" className="mt-3 text-xs leading-6 text-[#626977]">
              Available services couldn’t be checked. Your connected methods are
              listed above when available. Use Refresh status to try again.
            </p>
          )}
        </section>
        <div className="mt-7 flex items-start gap-3 px-1 text-xs leading-6 text-[#626977]">
          <Link2
            size={16}
            className="mt-1 shrink-0 text-[#315BEE]"
            aria-hidden="true"
          />
          <p className="max-w-lg">
            Connecting takes you to the provider to choose and authorize an
            account. A connection is shown here only after it has been saved. An
            account already connected to another Collab account can’t be moved
            from this page.
          </p>
        </div>
        <p className="mt-10 border-t border-[#e6e8ef] pt-5 text-xs text-[#626977]">
          Questions about your account?{" "}
          <a
            href="mailto:felmonon@gmail.com"
            className="font-medium text-[#315BEE] hover:underline"
          >
            Contact support
          </a>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Link href="/privacy" className="hover:text-[#315BEE]">
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
