"use client";

import { getProviders, signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  PenLine,
} from "lucide-react";
import { OAuthButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};
type Field = keyof FormData;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#faf9f6]"
      role="status"
    >
      <Loader2 className="h-7 w-7 animate-spin text-[#167d72]" />
      <span className="sr-only">Loading sign in</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );
  const [providers, setProviders] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = loading || oauthLoading !== null;
  const callback = searchParams.get("callbackUrl");
  const callbackUrl =
    callback === "/documents" || callback?.startsWith("/documents/")
      ? callback
      : "/documents";
  const callbackError = searchParams.get("error");
  const oauthError =
    callbackError === "OAuthAccountNotLinked"
      ? "This email already uses a different sign-in method. Please use the method you originally registered with."
      : callbackError
        ? "We couldn’t complete sign in. Please try again or use your email and password."
        : "";

  useEffect(() => {
    let active = true;
    getProviders()
      .then((available) => {
        if (active) setProviders(Object.keys(available || {}));
      })
      .catch(() => {
        /* Email sign-in remains available if provider discovery fails. */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  function updateField(field: Field, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === "password" ? { confirmPassword: undefined } : {}),
    }));
    setFormError("");
  }

  function validateForm() {
    const nextErrors: Partial<Record<Field, string>> = {};
    if (!emailRegex.test(formData.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (!formData.password) nextErrors.password = "Enter your password.";
    if (!isLogin) {
      if (formData.name.trim().length < 2)
        nextErrors.name = "Enter a name with at least 2 characters.";
      if (formData.name.trim().length > 80)
        nextErrors.name = "Keep your name to 80 characters or fewer.";
      if (formData.password.length < 8)
        nextErrors.password = "Choose a password with at least 8 characters.";
      if (new TextEncoder().encode(formData.password).length > 72)
        nextErrors.password =
          "This password is too long. Please choose a shorter one.";
      if (formData.confirmPassword !== formData.password)
        nextErrors.confirmPassword = "Your passwords don’t match.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return false;
    }
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validateForm()) return;
    setLoading(true);
    setFormError("");
    setNotice("");
    const email = formData.email.trim().toLowerCase();
    let accountCreated = false;
    try {
      if (!isLogin) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email,
            password: formData.password,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFormError(
            typeof data.error === "string"
              ? data.error
              : "We couldn’t create your account. Please try again.",
          );
          return;
        }
        accountCreated = true;
      }
      const result = await signIn("credentials", {
        email,
        password: formData.password,
        redirect: false,
        callbackUrl,
      });
      if (result?.ok && !result.error) {
        router.replace(callbackUrl);
        router.refresh();
      } else if (accountCreated) {
        setIsLogin(true);
        setNotice(
          "Your account is ready. Please sign in to open your workspace.",
        );
      } else {
        setFormError(
          "We couldn’t sign you in. Check your email and password, or use the sign-in method you registered with.",
        );
      }
    } catch {
      if (accountCreated) {
        setIsLogin(true);
        setNotice(
          "Your account was created. Please sign in when your connection is back.",
        );
      } else {
        setFormError(
          "We couldn’t reach the server. Check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (busy) return;
    setOauthLoading(provider);
    setFormError("");
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setFormError(
        `We couldn’t connect to ${provider === "google" ? "Google" : "GitHub"}. Please try again.`,
      );
    } finally {
      setOauthLoading(null);
    }
  }

  function switchMode() {
    setIsLogin(!isLogin);
    setErrors({});
    setFormError("");
    setNotice("");
    setFormData((previous) => ({
      ...previous,
      password: "",
      confirmPassword: "",
    }));
  }

  return (
    <main className="flex min-h-screen bg-[#faf9f6] text-[#162333]">
      <aside className="hidden w-[45%] flex-col justify-between border-r border-[#e1e5df] bg-[#edf1eb] p-10 lg:flex xl:p-14">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 text-lg font-semibold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#162333] text-white">
            <PenLine className="h-5 w-5" />
          </span>
          collab
          <span className="-ml-1 font-normal text-[#69737b]"> / editor</span>
        </Link>
        <div className="my-12 max-w-sm">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#167d72]">
            Your ideas belong here
          </p>
          <h2
            className="text-5xl leading-[1.1] tracking-[-0.04em] xl:text-6xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            A fresh page.
            <br />
            <em className="font-normal text-[#167d72]">A clear mind.</em>
          </h2>
          <p className="mt-6 text-base leading-7 text-[#63736b]">
            Bring your notes, plans, and next big idea into one thoughtful
            workspace.
          </p>
          <div className="mt-9 rotate-[-2deg] rounded-lg border border-[#dce3d9] bg-white p-7 shadow-[0_12px_30px_-20px_rgba(22,35,51,0.25)]">
            <FileText
              className="mb-5 h-5 w-5 text-[#167d72]"
              strokeWidth={1.5}
            />
            <p
              className="mb-4 text-xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Everything starts with an idea.
            </p>
            <p className="text-xs leading-6 text-[#738077]">
              A place to capture it.
              <br />
              The tools to give it shape.
              <br />
              Room to make it better, together.
            </p>
            <div className="mt-5 flex items-center gap-1.5 border-t border-[#e9ede5] pt-4 text-[10px] text-[#167d72]">
              <Check className="h-3 w-3" /> Ready when you are
            </div>
          </div>
        </div>
        <Link
          href="/demo"
          className="flex w-fit items-center gap-2 text-sm font-medium text-[#52665a] hover:text-[#167d72]"
        >
          Just looking? Try the editor <ArrowRight className="h-4 w-4" />
        </Link>
      </aside>

      <div className="flex flex-1 flex-col px-6 py-7 sm:px-10">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-xs text-[#63707a] hover:text-[#167d72]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167d72]">
              {isLogin
                ? "Your workspace is waiting"
                : "Make room for your next idea"}
            </p>
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {isLogin ? "Welcome back." : "Let’s get you started."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#63707a]">
              {isLogin
                ? "Sign in to pick up where you left off."
                : "Create your account to save and organize your documents."}
            </p>
          </div>

          {providers.some(
            (provider) => provider === "google" || provider === "github",
          ) && (
            <>
              <div className="mb-5 space-y-3">
                {(["google", "github"] as const)
                  .filter((provider) => providers.includes(provider))
                  .map((provider) => (
                    <OAuthButton
                      key={provider}
                      type="button"
                      provider={provider}
                      onClick={() => handleOAuth(provider)}
                      loading={oauthLoading === provider}
                      disabled={busy}
                    />
                  ))}
              </div>
              <div className="mb-5 flex items-center gap-4 text-[11px] text-[#7c878e]">
                <span className="h-px flex-1 bg-[#e2e6e1]" />
                or with your email
                <span className="h-px flex-1 bg-[#e2e6e1]" />
              </div>
            </>
          )}

          {(formError || oauthError) && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {formError || oauthError}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mb-5 rounded-lg border border-[#c8ded2] bg-[#edf6ef] px-4 py-3 text-sm leading-6 text-[#27684b]"
            >
              {notice}
            </p>
          )}

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
            aria-busy={busy}
          >
            {!isLogin && (
              <Input
                id="full-name"
                label="Your name"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                error={errors.name}
                autoComplete="name"
                maxLength={80}
                required
                disabled={busy}
                placeholder="Alex Morgan"
              />
            )}
            <Input
              id="email"
              label="Email address"
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
              maxLength={254}
              spellCheck={false}
              required
              disabled={busy}
              placeholder="you@example.com"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={(event) => updateField("password", event.target.value)}
              error={errors.password}
              autoComplete={isLogin ? "current-password" : "new-password"}
              hint={!isLogin ? "Use at least 8 characters." : undefined}
              showPasswordToggle
              required
              disabled={busy}
            />
            {!isLogin && (
              <Input
                id="confirm-password"
                label="Confirm password"
                type="password"
                value={formData.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
                error={errors.confirmPassword}
                autoComplete="new-password"
                showPasswordToggle
                required
                disabled={busy}
              />
            )}
            {isLogin && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#167d72] hover:underline"
                >
                  Trouble signing in?
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#167d72] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#10665d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#167d72] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {isLogin ? "Signing in…" : "Creating your account…"}
                </>
              ) : (
                <>
                  {isLogin ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-xs leading-6 text-[#63707a]">
            {isLogin ? "New to Collab Editor?" : "Already have an account?"}{" "}
            <button
              type="button"
              disabled={busy}
              onClick={switchMode}
              className="font-semibold text-[#167d72] hover:underline disabled:opacity-60"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-8 border-t border-[#e2e6e1] pt-5 text-center text-xs text-[#7c878e]">
            Want to explore first?{" "}
            <Link
              href="/demo"
              className="font-medium text-[#167d72] hover:underline"
            >
              Try a local draft
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
