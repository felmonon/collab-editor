"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileText,
  Github,
  List,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/ui/brand";

const primaryLink =
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg bg-[#315BEE] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2449ce] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315BEE]";

function WorkspaceIllustration() {
  return (
    <figure className="relative mx-auto mt-12 max-w-[1240px] sm:mt-16">
      <div className="relative overflow-hidden rounded-2xl border border-[#e3e6f0] bg-[#eef0f8] p-3 sm:p-5 lg:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-32 h-96 w-72 rotate-[28deg] rounded-[40px] border border-[#cbd3f0]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-96 w-72 rotate-[28deg] rounded-[40px] border border-[#cbd3f0]"
        />
        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-xl border border-[#dfe3ee] bg-white shadow-[0_20px_60px_-30px_rgba(33,44,79,0.3)]"
        >
          <div className="flex h-12 items-center justify-between border-b border-[#e6e8ef] px-4 text-[10px] sm:h-14 sm:px-6 sm:text-xs">
            <div className="flex items-center gap-2.5 text-[#747985]">
              <BrandMark className="h-5 w-5" />
              <span className="hidden sm:inline">Design studio</span>
              <span className="hidden text-[#bdc2d1] sm:inline">/</span>
              <span className="font-medium text-[#373c49]">
                The next chapter
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <span className="hidden items-center gap-1.5 text-[#747985] sm:flex">
                <Check size={12} /> Saved
              </span>
              <div className="flex -space-x-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#e8dbd2] text-[9px] font-semibold text-[#805c47]">
                  AL
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#dfe5ff] text-[9px] font-semibold text-[#315BEE]">
                  MY
                </span>
              </div>
              <span className="rounded-md bg-[#315BEE] px-3 py-1.5 font-medium text-white">
                Share
              </span>
            </div>
          </div>
          <div className="flex">
            <div className="hidden w-[190px] shrink-0 border-r border-[#292e3d] bg-[#202431] p-4 text-[11px] text-[#d6dbea] md:block lg:w-[214px] lg:p-5">
              <div className="mb-6 flex items-center justify-between font-semibold">
                <span>Workspace</span>
                <ChevronDown size={12} />
              </div>
              <div className="mb-2 flex items-center gap-2.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[#aab2c6]">
                <Search size={13} /> Search documents
                <span className="ml-auto text-[9px]">⌘ K</span>
              </div>
              <div className="mb-7 flex items-center gap-2.5 px-2.5 py-2 text-[#a9bdff]">
                <Plus size={14} /> New document
              </div>
              <p className="mb-3 px-2.5 text-[9px] font-semibold uppercase tracking-widest text-[#969ba8]">
                Your documents
              </p>
              {[
                "The next chapter",
                "Ideas worth exploring",
                "Monday, together",
                "A few good notes",
              ].map((title, index) => (
                <div
                  key={title}
                  className={`mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-2.5 ${index === 0 ? "bg-[#343f62] font-medium text-[#dbe5ff]" : "text-[#aab2c6]"}`}
                >
                  <FileText size={13} />
                  <span className="truncate">{title}</span>
                </div>
              ))}
              <div className="mt-6 flex items-center gap-2.5 px-2.5 py-2 text-[#aab2c6]">
                <Users size={13} /> Shared with me
              </div>
              <div className="mt-16 border-t border-white/10 pt-4 text-[10px] text-[#aab2c6]">
                A little room to think.
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex h-11 items-center gap-5 border-b border-[#edf0f5] px-5 text-[11px] text-[#747985] sm:px-8">
                <span className="flex items-center gap-4">
                  Normal text <ChevronDown size={11} />
                </span>
                <span className="h-3 w-px bg-[#e6e8ef]" />
                <strong className="text-[#191b23]">B</strong>
                <em>I</em>
                <span className="underline">U</span>
                <span className="h-3 w-px bg-[#e6e8ef]" />
                <List size={14} />
                <Settings2 size={14} className="hidden sm:block" />
              </div>
              <div className="flex min-h-[410px] sm:min-h-[465px]">
                <div className="relative min-w-0 flex-1 px-6 pb-10 pt-8 sm:px-10 sm:pt-12 lg:px-14">
                  <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8b92a4]">
                    Project brief <span className="mx-2 text-[#c7ccda]">/</span>{" "}
                    A fresh perspective
                  </p>
                  <h2 className="max-w-md text-[31px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[38px] lg:text-[44px]">
                    Good things start
                    <br />
                    with a shared idea.
                  </h2>
                  <p className="mt-5 max-w-[430px] text-[12px] leading-[1.9] text-[#747985] sm:text-[13px]">
                    A question. A sketch. A thought you can’t shake.
                    <br className="hidden sm:block" /> Let’s give it somewhere
                    to go.
                  </p>
                  <div className="relative mt-5 max-w-[430px] border-l-2 border-[#315BEE] bg-[#f4f6ff] px-4 py-3 text-xs leading-6 text-[#52628c]">
                    Make something that moves the conversation forward.
                    <span className="absolute -bottom-4 right-3 flex items-start text-[#315BEE]">
                      <MousePointer2
                        size={18}
                        fill="currentColor"
                        stroke="white"
                      />
                      <span className="mt-3 rounded-r-md rounded-bl-md bg-[#315BEE] px-2 py-0.5 text-[9px] font-medium text-white">
                        Maya
                      </span>
                    </span>
                  </div>
                  <h3 className="mb-3 mt-7 text-[13px] font-semibold">
                    Where we go from here
                  </h3>
                  <div className="space-y-2 text-[11px] text-[#747985] sm:text-xs">
                    <p className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-[#969ba8]" />{" "}
                      Find the question worth asking.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-[#969ba8]" />{" "}
                      Bring a different perspective.
                    </p>
                    <p className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-[#969ba8]" />{" "}
                      Give the first draft a chance.
                      <span className="relative h-4 border-l-2 border-[#b47740]">
                        <span className="absolute -bottom-5 left-0 rounded-r-md rounded-bl-md bg-[#b47740] px-2 py-0.5 text-[9px] text-white">
                          Alex
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
                <div className="hidden w-36 shrink-0 py-12 pr-6 xl:block">
                  <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#969ba8]">
                    On this page
                  </p>
                  <div className="border-l border-[#e6e8ef] text-[10px] leading-5">
                    <p className="-ml-px border-l-2 border-[#315BEE] pb-3 pl-3 text-[#315BEE]">
                      Good things start
                      <br />
                      with a shared idea.
                    </p>
                    <p className="pl-3 text-[#969ba8]">
                      Where we go
                      <br />
                      from here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 flex items-center justify-between gap-4 px-1 text-[11px] text-[#686e7c]">
        <span>One place for the work in progress.</span>
        <span>Workspace illustration</span>
      </figcaption>
    </figure>
  );
}

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace("/documents");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-white text-[#191b23]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b border-[#edf0f5]">
        <div className="mx-auto flex h-[76px] max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Collab Editor home" className="shrink-0">
            <BrandLogo />
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-[13px] font-medium text-[#686e7c] md:flex"
          >
            <a
              href="#workspace"
              className="transition-colors hover:text-[#191b23]"
            >
              The workspace
            </a>
            <a
              href="#a-better-way"
              className="transition-colors hover:text-[#191b23]"
            >
              A better way to write
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-5">
            <Link
              href="/login"
              className="hidden whitespace-nowrap text-[13px] font-medium hover:text-[#315BEE] min-[375px]:inline"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#191b23] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#343847] sm:px-4"
            >
              Try editor <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main">
        <section
          id="workspace"
          className="mx-auto max-w-[1360px] scroll-mt-8 px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:px-12 lg:pt-24"
        >
          <div className="grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#686e7c]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#315BEE]" /> A
                space for shared thinking
              </p>
              <h1 className="text-[clamp(2.5rem,11.4vw,4rem)] lg:text-[clamp(4rem,7.2vw,6.6rem)] font-semibold leading-[0.99] tracking-[-0.065em]">
                Better ideas.
                <br />
                <span className="text-[#315BEE]">Written together.</span>
              </h1>
            </div>
            <div className="max-w-[365px] pb-1 lg:ml-auto">
              <p className="text-[16px] leading-[1.8] text-[#686e7c] sm:text-[17px]">
                A clear place for your notes, plans, and next big thing. Bring
                your words together. Give them room to grow.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link href="/demo" className={primaryLink}>
                  Try the editor <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="text-[13px] font-semibold hover:text-[#315BEE]"
                >
                  Create an account
                </Link>
              </div>
              <p className="mt-3.5 text-[11px] text-[#686e7c]">
                Open a local draft. No account needed.
              </p>
            </div>
          </div>
          <WorkspaceIllustration />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs text-[#686e7c] sm:mt-12 sm:gap-x-16">
            <span className="flex items-center gap-2">
              <FileText size={15} strokeWidth={1.7} /> Thoughtfully simple
              writing
            </span>
            <span className="flex items-center gap-2">
              <Users size={15} strokeWidth={1.7} /> A place to work together
            </span>
            <span className="flex items-center gap-2">
              <Check size={15} strokeWidth={1.7} /> Your work, saved as you go
            </span>
          </div>
        </section>
        <section
          id="a-better-way"
          className="scroll-mt-8 border-y border-[#e6e8ef] bg-[#f6f7fb]"
        >
          <div className="mx-auto grid max-w-[1360px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-24 lg:px-12">
            <div>
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#686e7c]">
                Less between you and the idea
              </p>
              <h2 className="max-w-lg text-[36px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[46px]">
                Everything you need
                <br />
                to find your flow.
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-7 text-[#686e7c]">
                From the first messy note to the draft you’re ready to share. A
                few thoughtful tools, right where you need them.
              </p>
              <Link
                href="/demo"
                className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold text-[#315BEE]"
              >
                Make a little progress <ArrowRight size={15} />
              </Link>
            </div>
            <div className="divide-y divide-[#e0e4ee]">
              {[
                {
                  title: "A page with possibilities.",
                  text: "Find the right words with headings, lists, quotes, and code. Switch to focus mode when it’s time to go a little deeper.",
                },
                {
                  title: "Good work welcomes company.",
                  text: "Share a document with registered collaborators. Choose who can edit, see who’s connected, and keep saved changes in sync.",
                },
                {
                  title: "Pick up the thread.",
                  text: "Keep your documents in one workspace, with automatic saving and draft recovery. Take a copy with you in Markdown.",
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className="flex gap-6 py-7 first:pt-0 last:pb-0"
                >
                  <span className="pt-1 font-mono text-[11px] text-[#9ba3b9]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.025em]">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-7 text-[#686e7c]">
                      {item.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="relative mx-auto max-w-[1264px] overflow-hidden rounded-2xl bg-[#191b23] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
            <div
              aria-hidden="true"
              className="absolute -right-12 top-8 hidden h-72 w-72 rotate-[-12deg] rounded-[32px] border border-white/15 sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute -right-2 top-20 hidden h-72 w-72 rotate-[-12deg] rounded-[32px] border border-white/15 sm:block"
            />
            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <p className="mb-5 flex items-center gap-2 text-xs font-medium text-[#a9b6df]">
                  <Sparkles size={14} /> Something good starts here.
                </p>
                <h2 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[50px]">
                  A fresh page.
                  <br />
                  Your next chapter.
                </h2>
              </div>
              <div className="lg:pr-24">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[#191b23] transition-colors hover:bg-[#eaf0ff]"
                >
                  Let’s start writing <ArrowUpRight size={17} />
                </Link>
                <p className="mt-3 text-xs text-[#a2a7b7]">
                  Try the editor before making an account.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#e6e8ef]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" aria-label="Collab Editor home">
            <BrandLogo />
          </Link>
          <p className="text-xs text-[#686e7c]">
            A little more room for your ideas.
          </p>
          <div className="flex items-center gap-6 text-xs text-[#686e7c]">
            <Link href="/login" className="hover:text-[#315BEE]">
              Sign in
            </Link>
            <a
              href="https://github.com/felmonon/collab-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#315BEE]"
            >
              <Github size={14} /> Source code
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
