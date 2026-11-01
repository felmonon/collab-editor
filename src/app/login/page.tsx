"use client";

import { getProviders, signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Loader2,
  MousePointer2,
} from "lucide-react";
import { OAuthButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand";

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
      className="flex min-h-screen items-center justify-center bg-[#f6f7fb]"
      role="status"
    >
      <Loader2 className="h-7 w-7 animate-spin text-[#315BEE]" />
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
    <main className="flex min-h-screen bg-white text-[#191b23]">
      <aside className="sticky top-0 hidden h-screen min-h-[760px] w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-[#191b23] p-10 text-white lg:flex xl:p-14">
        <Link
          href="/"
          aria-label="Collab Editor home"
          className="relative z-10 w-fit"
        >
          <BrandLogo inverted />
        </Link>
        <div className="relative z-10 my-10 max-w-lg">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9ba9d0]">
            Make space for the next idea
          </p>
          <h2 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.055em] xl:text-[58px]">
            A little space.
            <br />
            <span className="text-[#a6baff]">A lot of possibility.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#a0a5b6]">
            A place for your notes, your plans, and the people who make them
            better.
          </p>
          <div aria-hidden="true" className="relative ml-2 mt-12 mr-5 max-w-sm">
            <div className="absolute inset-0 translate-x-6 -translate-y-3 rotate-[5deg] rounded-xl border border-white/20 bg-[#315BEE]" />
            <div className="relative rotate-[-3deg] rounded-xl bg-white p-7 text-[#191b23] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] xl:p-8">
              <div className="mb-7 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-medium text-[#747985]">
                  <FileText size={13} /> The next chapter
                </span>
                <span className="h-2 w-2 rounded-full bg-[#315BEE]" />
              </div>
              <p className="text-[27px] font-semibold leading-[1.15] tracking-[-0.04em]">
                Good things start
                <br />
                with a shared idea.
              </p>
              <p className="mt-4 text-xs leading-6 text-[#747985]">
                A question. A fresh perspective.
                <br />A little room to see where it goes.
              </p>
              <div className="relative mt-5 border-l-2 border-[#315BEE] bg-[#f0f3ff] px-3 py-2.5 text-xs text-[#536da9]">
                Let’s make something of it.
                <span className="absolute -bottom-4 right-3 flex items-start text-[#315BEE]">
                  <MousePointer2 size={19} fill="currentColor" stroke="white" />
                  <span className="mt-3 rounded-r-md rounded-bl-md bg-[#315BEE] px-2 py-1 text-[9px] text-white">
                    Maya
                  </span>
                </span>
              </div>
              <div className="mt-7 flex items-center gap-1.5 border-t border-[#edf0f5] pt-4 text-[9px] text-[#969ba8]">
                <Check size={11} /> An illustration of ideas coming together
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/demo"
          className="relative z-10 inline-flex w-fit items-center gap-2 text-xs font-medium text-[#c8cddd] transition-colors hover:text-white"
        >
          Take a look around first <ArrowUpRight size={14} />
        </Link>
        <div
          aria-hidden="true"
          className="absolute -bottom-56 -left-32 h-[530px] w-[420px] rotate-[25deg] rounded-[60px] border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-64 -left-20 h-[530px] w-[420px] rotate-[25deg] rounded-[60px] border border-white/10"
        />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col px-6 py-7 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Collab Editor home" className="lg:hidden">
            <BrandLogo />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#686e7c] transition-colors hover:text-[#191b23]"
          >
            <ArrowLeft size={13} /> Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[384px] flex-1 flex-col justify-center py-12 sm:py-14">
          <div className="mb-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#686e7c]">
              Your writing space
            </p>
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.045em] sm:text-[36px]">
              {isLogin ? "Welcome back." : "Your next chapter."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#686e7c]">
              {isLogin
                ? "Pick up a thought. Make something of it."
                : "Create an account. Give your ideas a home."}
            </p>
          </div>
          {providers.some(
            (provider) => provider === "google" || provider === "github",
          ) && (
            <>
              <div className="mb-6 space-y-2.5">
                {(["google", "github"] as const)
                  .filter((provider) => providers.includes(provider))
                  .map((provider) => (
                    <OAuthButton
                      key={provider}
                      type="button"
                      provider={provider}
                      size="md"
                      onClick={() => handleOAuth(provider)}
                      loading={oauthLoading === provider}
                      disabled={busy}
                    />
                  ))}
              </div>
              <div className="mb-6 flex items-center gap-4 text-[10px] text-[#686e7c]">
                <span className="h-px flex-1 bg-[#e6e8ef]" />
                or continue with email
                <span className="h-px flex-1 bg-[#e6e8ef]" />
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
              className="mb-5 rounded-lg border border-[#cbd6ff] bg-[#f0f3ff] px-4 py-3 text-sm leading-6 text-[#315BEE]"
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
                  className="text-xs font-medium text-[#686e7c] hover:text-[#315BEE]"
                >
                  Trouble signing in?
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#315BEE] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2449ce] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315BEE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in…" : "Creating your account…"}
                </>
              ) : (
                <>
                  {isLogin ? "Sign in" : "Create account"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-xs leading-6 text-[#686e7c]">
            {isLogin ? "New to Collab Editor?" : "Already have an account?"}{" "}
            <button
              type="button"
              disabled={busy}
              onClick={switchMode}
              className="font-semibold text-[#315BEE] hover:underline disabled:opacity-60"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#e6e8ef] pt-5 text-[11px] text-[#686e7c]">
            <span>Just looking around?</span>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1 font-medium text-[#686e7c] hover:text-[#315BEE]"
            >
              Try the editor <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <p className="text-center text-[10px] text-[#686e7c]">
          A little more room for your ideas.
        </p>
      </div>
    </main>
  );
}
