"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CloudCheck,
  FileText,
  Github,
  Heading2,
  List,
  MousePointer2,
  PenLine,
  Users,
} from "lucide-react";

const primaryLink =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#167d72] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#10665d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#167d72]";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/documents");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#162333]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b border-[#162333]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Collab Editor home"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#162333] text-white">
              <PenLine className="h-5 w-5" />
            </span>
            <span className="whitespace-nowrap text-lg">
              collab
              <span className="hidden font-normal text-[#69737b] min-[440px]:inline">
                {" "}
                / editor
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm text-[#5b6670] md:flex"
          >
            <a href="#features" className="hover:text-[#167d72]">
              The workspace
            </a>
            <a href="#how-it-works" className="hover:text-[#167d72]">
              How it works
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-medium hover:text-[#167d72]"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className={`${primaryLink} whitespace-nowrap px-3 sm:px-5`}
            >
              Try editor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-24">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#167d72]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#167d72]" /> A
              little space for big ideas
            </p>
            <h1
              className="max-w-xl text-[3.3rem] leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-[4.5rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Good work
              <br />
              starts with
              <br />
              <em className="font-normal text-[#167d72]">a shared page.</em>
            </h1>
            <p className="mb-8 mt-7 max-w-md text-lg leading-relaxed text-[#63707a]">
              A calm place to write, shape your thinking, and work on documents
              together. Less friction. More room for the idea.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/demo" className={`${primaryLink} px-6 py-3.5`}>
                Open the editor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 px-1 py-3 text-sm font-semibold hover:text-[#167d72]"
              >
                Create an account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-[#748087]">
              <Check className="h-3.5 w-3.5" /> Try a local draft. No account
              needed.
            </p>
            <a
              href="#features"
              className="mt-12 inline-flex items-center gap-3 text-xs font-medium text-[#63707a] hover:text-[#167d72]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#162333]/15">
                <ArrowDown className="h-3.5 w-3.5" />
              </span>{" "}
              A closer look at your workspace
            </a>
          </div>

          <div className="relative min-w-0 lg:py-7">
            <div
              className="absolute -right-2 bottom-0 left-4 top-3 rounded-2xl bg-[#e6ebe6] sm:-right-5 sm:left-8 lg:bottom-2 lg:top-0"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-xl border border-[#dce1dd] bg-white shadow-[0_18px_50px_-25px_rgba(22,35,51,0.25)]">
              <div className="flex items-center justify-between border-b border-[#e9edeb] px-4 py-3.5 text-[11px] sm:px-5">
                <span className="flex items-center gap-2 font-medium">
                  <FileText className="h-3.5 w-3.5 text-[#167d72]" /> The next
                  chapter
                </span>
                <span className="rounded border border-[#e2e7e4] bg-[#f7f9f7] px-2 py-1 text-[#68766e]">
                  Example document
                </span>
              </div>
              <div
                aria-hidden="true"
                className="flex items-center gap-5 border-b border-[#e9edeb] px-5 py-3 text-xs text-[#64716d]"
              >
                <span>
                  Normal text <span className="ml-3 text-[#b2bab6]">⌄</span>
                </span>
                <span className="h-4 w-px bg-[#e3e8e4]" />
                <strong className="text-[#162333]">B</strong>
                <em>I</em>
                <span className="underline">U</span>
                <span className="h-4 w-px bg-[#e3e8e4]" />
                <List className="h-3.5 w-3.5" />
                <Heading2 className="h-3.5 w-3.5" />
              </div>
              <div className="relative px-6 py-8 sm:px-10 sm:py-10">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#87918a]">
                  Project brief · A fresh beginning
                </p>
                <h2
                  className="mb-5 text-3xl tracking-tight sm:text-4xl"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Make something
                  <br />
                  worth sharing.
                </h2>
                <p className="max-w-sm text-[13px] leading-7 text-[#64706b]">
                  Every great project begins with a thought. A rough sketch. A
                  question that deserves a better answer.
                </p>
                <div className="relative mt-5 max-w-sm border-l-2 border-[#167d72] bg-[#f1f6f2] px-4 py-3">
                  <p className="text-[13px] leading-6 text-[#36594f]">
                    Let’s make room for the ideas we haven’t had yet.
                  </p>
                </div>
                <h3 className="mb-3 mt-7 text-sm font-semibold">
                  A few things to explore
                </h3>
                <ul className="space-y-2.5 text-xs text-[#64706b]">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-[#167d72] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>{" "}
                    Start with a shared purpose
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded-sm border border-[#b7c6bd]" />{" "}
                    Give the first draft a little room to breathe
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded-sm border border-[#b7c6bd]" />{" "}
                    Make it better, together
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-between border-t border-[#e9edeb] bg-[#fcfdfb] px-5 py-3 text-[10px] text-[#849087]">
                <span>One page. A world of possibility.</span>
                <PenLine className="h-3 w-3" />
              </div>
            </div>
            <div className="absolute -bottom-4 right-3 flex items-center gap-3 rounded-lg border border-[#dce1dd] bg-white px-4 py-3 shadow-sm sm:-right-6 sm:bottom-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf4ee] text-[#167d72]">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Better, together.</p>
                <p className="mt-0.5 text-[10px] text-[#7b867f]">
                  A workspace for shared thinking.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-6 border-y border-[#162333]/10 bg-white"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#167d72]">
                  Thoughtfully simple
                </p>
                <h2
                  className="text-3xl tracking-tight sm:text-4xl"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Stay in the flow.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#63707a]">
                The essentials for taking a document from a first thought to
                something you’re ready to share.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 md:gap-10">
              {[
                {
                  icon: PenLine,
                  title: "Make every word count",
                  text: "Headings, lists, quotes, and code blocks. Give your ideas structure with a familiar, focused editor.",
                },
                {
                  icon: MousePointer2,
                  title: "See the work take shape",
                  text: "Shared document rooms and live presence help connected collaborators work on the same page.",
                },
                {
                  icon: CloudCheck,
                  title: "Pick up where you left off",
                  text: "Your account keeps your documents together. Automatic saving helps you return to your latest work.",
                },
              ].map((feature) => (
                <article
                  key={feature.title}
                  className="border-t border-[#e2e8e3] pt-6"
                >
                  <feature.icon
                    className="mb-5 h-6 w-6 text-[#167d72]"
                    strokeWidth={1.5}
                  />
                  <h3 className="mb-3 text-base font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-[#63707a]">
                    {feature.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#167d72]">
                From thought to document
              </p>
              <h2
                className="text-3xl leading-tight tracking-tight sm:text-4xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                The hardest part?
                <br />
                The first sentence.
              </h2>
              <Link
                href="/demo"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#167d72]"
              >
                We’ll give you a blank page <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ol className="grid gap-7 sm:grid-cols-3">
              {[
                {
                  title: "Take it for a spin",
                  text: "Open the demo and try writing right away. Your demo draft stays in this browser.",
                },
                {
                  title: "Make it your space",
                  text: "Create an account to save documents and organize your work in one place.",
                },
                {
                  title: "Keep the ideas moving",
                  text: "Write, revise, and return when inspiration strikes. Your workspace is ready.",
                },
              ].map((step, index) => (
                <li key={step.title}>
                  <span className="mb-5 block border-b border-[#162333]/15 pb-4 font-mono text-sm text-[#167d72]">
                    0{index + 1}
                  </span>
                  <h3 className="mb-2 text-sm font-semibold">{step.title}</h3>
                  <p className="text-sm leading-7 text-[#63707a]">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#162333]/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-xs text-[#7b858c] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Collab Editor — a little more room to think.</span>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-[#167d72]">
              Try the editor
            </Link>
            <Link href="/login" className="hover:text-[#167d72]">
              Sign in
            </Link>
            <a
              href="https://github.com/felmonon/collab-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#167d72]"
            >
              <Github className="h-3.5 w-3.5" /> View source
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
