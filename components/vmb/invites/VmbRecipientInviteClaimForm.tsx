"use client";

import Link from "next/link";
import { useState } from "react";
import type { RecipientInviteClaimView } from "@/lib/vmb/invites/submit-invite-claim";
import { buildRecipientInvitePath } from "@/lib/vmb/invites/recipient-invite-url";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  state: RecipientInvitePageState;
  claimView?: RecipientInviteClaimView;
};

export function VmbRecipientInviteClaimForm({ state, claimView }: Props) {
  if (state.status === "not_found") {
    return (
      <ClaimShell>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Invite unavailable</p>
        <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">We couldn&apos;t find this invite</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">
          This claim link may be incorrect or expired.
        </p>
      </ClaimShell>
    );
  }

  if (state.status === "expired") {
    return (
      <ClaimShell>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Invite expired</p>
        <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">This invite is no longer active</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">{state.message}</p>
      </ClaimShell>
    );
  }

  if (!claimView) return null;

  return <ClaimFormBody claimView={claimView} />;
}

function ClaimFormBody({ claimView }: { claimView: RecipientInviteClaimView }) {
  const [name, setName] = useState(claimView.knownRecipientName ?? "");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!consent) {
      setError("Please confirm how your contact info will be used.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vmb/invite-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId: claimView.inviteId,
          name: claimView.nameRequired ? name : claimView.knownRecipientName ?? name,
          contact,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not submit claim.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Could not submit claim.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <ClaimShell>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-emerald-700">Claim received</p>
        <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">You&apos;re on the list</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">
          The salon can follow up with next steps. No booking or payment was created.
        </p>
        <Link
          href={buildRecipientInvitePath(claimView.inviteId)}
          className="mt-6 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 no-underline hover:bg-white"
        >
          Back to invite
        </Link>
      </ClaimShell>
    );
  }

  return (
    <ClaimShell>
      <header className="space-y-2 text-center">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Claim invite</p>
        <h1 className="m-0 text-2xl font-extrabold text-stone-900">{claimView.salonDisplayName}</h1>
        <p className="m-0 text-sm text-stone-600">{claimView.primaryCta}</p>
      </header>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">Invite summary</p>
        <p className="m-0 mt-2 text-sm leading-relaxed text-stone-700">{claimView.inviteSummary}</p>
        {claimView.knownRecipientName ? (
          <p className="m-0 mt-3 text-xs text-stone-500">
            For: <span className="font-semibold text-stone-700">{claimView.knownRecipientName}</span>
          </p>
        ) : null}
      </section>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4 text-left">
        {claimView.nameRequired ? (
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-700">Your name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
              placeholder="First and last name"
            />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Mobile or email</span>
          <input
            type="text"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            required
            autoComplete="email tel"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
            placeholder="555-123-4567 or you@example.com"
          />
        </label>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5"
          />
          <span>We&apos;ll use this only to help the salon follow up on this invite.</span>
        </label>

        {error ? <p className="m-0 text-sm text-amber-800">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Claim this invite"}
        </button>
      </form>

      <Link
        href={buildRecipientInvitePath(claimView.inviteId)}
        className="mt-6 inline-flex text-sm font-semibold text-stone-600 no-underline hover:text-stone-900"
      >
        ← Back to invite
      </Link>
    </ClaimShell>
  );
}

function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-lg px-4 py-10 text-center"
      style={{ background: VMB_THEME.warmBg, color: VMB_THEME.ink, minHeight: "100vh" }}
    >
      {children}
    </main>
  );
}
