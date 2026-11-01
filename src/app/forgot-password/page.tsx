import Link from "next/link";
import { ArrowLeft, ArrowUpRight, KeyRound } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f6f7fb] text-[#191b23]">
      <header className="border-b border-[#e6e8ef] bg-white px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Collab Editor home" className="inline-block">
          <BrandLogo />
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-6 py-14">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl border border-[#dce3ff] bg-[#eaf0ff] text-[#315BEE]">
          <KeyRound size={22} strokeWidth={1.6} />
        </div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#686e7c]">
          A little help getting back
        </p>
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.045em] sm:text-[40px]">
          Let’s find your way in.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#686e7c]">
          Use the same sign-in method you chose when you created your account.
        </p>
        <div className="my-8 divide-y divide-[#e6e8ef] rounded-xl border border-[#e6e8ef] bg-white px-5 sm:px-6">
          <div className="py-5">
            <h2 className="text-sm font-semibold">
              Signed up with Google, Apple, or GitHub?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#686e7c]">
              Choose that provider on the sign-in page. You don’t need a
              separate Collab Editor password.
            </p>
          </div>
          <div className="py-5">
            <h2 className="text-sm font-semibold">
              Forgot your account password?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#686e7c]">
              Password reset emails aren’t available yet. For help with access,
              email support from the address associated with your account.
            </p>
            <a
              href="mailto:felmonon@gmail.com?subject=Collab%20Editor%20account%20access"
              className="focus-ring mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-semibold text-[#315BEE] hover:underline"
            >
              Contact support <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <p className="mt-1 break-all text-xs leading-6 text-[#686e7c]">
              felmonon@gmail.com
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#315BEE] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2449ce]"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
        <Link
          href="/demo"
          className="mt-5 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#686e7c] hover:text-[#315BEE]"
        >
          Keep writing in a local draft <ArrowUpRight size={13} />
        </Link>
      </div>
      <p className="px-6 pb-7 text-center text-[10px] text-[#686e7c]">
        A little more room for your ideas.
      </p>
    </main>
  );
}
