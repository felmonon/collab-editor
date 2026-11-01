import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, PenLine } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#faf9f6] px-6 py-8 text-[#162333]">
      <Link
        href="/"
        className="mx-auto flex items-center gap-2.5 text-lg font-semibold"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#162333] text-white">
          <PenLine className="h-5 w-5" />
        </span>
        Collab Editor
      </Link>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#d5e2d8] bg-[#edf3ed] text-[#167d72]">
          <KeyRound className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Let’s get you back in.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#63707a]">
          If you registered with Google or GitHub, return to sign in and choose
          that same provider. You don’t need a separate Collab Editor password.
        </p>
        <div className="my-6 rounded-xl border border-[#e0e5dd] bg-white p-5">
          <h2 className="text-sm font-semibold">
            Forgot an email account password?
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#63707a]">
            Password reset emails aren’t available yet. Contact the person who
            runs this workspace for help recovering access.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#167d72] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#10665d]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <Link
          href="/demo"
          className="mt-5 inline-flex items-center justify-center gap-2 text-xs font-medium text-[#63707a] hover:text-[#167d72]"
        >
          Keep writing in a local draft <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </main>
  );
}
