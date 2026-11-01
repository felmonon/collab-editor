import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Privacy — Collab Editor",
  description:
    "How Collab Editor uses account information, documents, and browser storage.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#191b23]">
      <header className="border-b border-[#e6e8ef] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Collab Editor home">
            <BrandLogo />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#626977] hover:text-[#315BEE]"
          >
            Sign in <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-[#626977] hover:text-[#315BEE]"
        >
          <ArrowLeft size={13} /> Back to home
        </Link>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#626977]">
          About your information
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Privacy at Collab.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#626977]">
          Collab Editor is a workspace for writing and sharing documents. This
          notice describes the information the app handles and how to request
          help with your data.
        </p>
        <p className="mt-3 text-xs text-[#626977]">Updated November 1, 2026</p>
        <div className="mt-10 space-y-8 border-t border-[#e6e8ef] pt-8 text-sm leading-7 text-[#626977]">
          <section aria-labelledby="account-data">
            <h2
              id="account-data"
              className="mb-3 text-lg font-semibold tracking-tight text-[#191b23]"
            >
              Account and sign-in information
            </h2>
            <p>
              When you create an account, we store your name, email address, and
              profile image when provided. Social sign-in through Google, Apple,
              or GitHub is used to identify you and sign you into Collab Editor.
              Authentication records include the provider and account
              identifiers, and may include provider-issued access, ID, or
              refresh tokens and their expiry information.
            </p>
            <p className="mt-3">
              These providers are used for identity and sign-in. Collab Editor
              does not request access to your Google Drive files or Gmail
              messages. We do not receive your social provider’s password. If
              you register with an email and password, the app stores a password
              hash rather than the password itself.
            </p>
          </section>
          <section aria-labelledby="document-data">
            <h2
              id="document-data"
              className="mb-3 text-lg font-semibold tracking-tight text-[#191b23]"
            >
              Documents and collaboration
            </h2>
            <p>
              We store document titles, content, ownership, edit times, sharing
              permissions, and saved version history to provide your workspace,
              saving, and collaboration features. Document owners choose which
              registered accounts can view or edit their documents. People with
              access can see the shared content; participant names and live
              presence are shown during collaboration. Access lists show
              collaborators’ names, email addresses, and permissions.
            </p>
          </section>
          <section aria-labelledby="browser-data">
            <h2
              id="browser-data"
              className="mb-3 text-lg font-semibold tracking-tight text-[#191b23]"
            >
              Cookies and browser storage
            </h2>
            <p>
              Cookies support sign-in sessions and authentication security. The
              demo saves its draft in your browser’s local storage. Unsaved
              account-document drafts use tab session storage for recovery when
              available. The browser also holds interface choices such as
              filters and view settings. You can clear browser storage through
              your browser settings; doing so can remove local drafts and sign
              you out.
            </p>
          </section>
          <section aria-labelledby="service-providers">
            <h2
              id="service-providers"
              className="mb-3 text-lg font-semibold tracking-tight text-[#191b23]"
            >
              Where information is processed
            </h2>
            <p>
              The app uses Vercel for web hosting, Supabase for its database,
              and Render for the live collaboration service. These services
              process information as part of running the app. When you choose
              social sign-in, your chosen identity provider also processes the
              authentication request under its own privacy practices.
            </p>
          </section>
          <section aria-labelledby="deletion">
            <h2
              id="deletion"
              className="mb-3 text-lg font-semibold tracking-tight text-[#191b23]"
            >
              Deleting documents and requesting account deletion
            </h2>
            <p>
              Owners can delete documents from the workspace. This permanently
              removes the document, its sharing records, and its version history
              from the app’s database. It does not remove copies other people
              have already downloaded or local drafts in a browser.
            </p>
            <p className="mt-3">
              Account deletion is handled by request; there is no self-service
              account deletion control. For privacy questions or a request to
              delete your account and associated data, email{" "}
              <a
                href="mailto:felmonon@gmail.com"
                className="font-medium text-[#315BEE] underline decoration-[#315BEE]/30 underline-offset-4"
              >
                felmonon@gmail.com
              </a>{" "}
              from the address associated with your account. We may need to
              verify account ownership before acting on a request. This notice
              does not specify a backup-deletion schedule.
            </p>
          </section>
        </div>
      </main>
      <footer className="border-t border-[#e6e8ef] px-6 py-6 text-center text-xs text-[#626977]">
        Collab Editor ·{" "}
        <a href="mailto:felmonon@gmail.com" className="hover:text-[#315BEE]">
          Privacy contact
        </a>
      </footer>
    </div>
  );
}
