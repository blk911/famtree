"use client";

import Link from "next/link";
import { PersonalInvitePreview } from "@/components/vmb/cards/PersonalInvitePreview";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  state: RecipientInvitePageState;
};

export function VmbRecipientInviteLanding({ state }: Props) {
  if (state.status === "not_found") {
    return (
      <main
        className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center"
        style={{ color: VMB_THEME.ink }}
      >
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Invite unavailable</p>
        <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">We couldn&apos;t find this invite</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">
          The link may be incorrect or the invite may have been removed. Contact your salon if you
          believe this is a mistake.
        </p>
      </main>
    );
  }

  if (state.status === "expired") {
    return (
      <main
        className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center"
        style={{ color: VMB_THEME.ink }}
      >
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Invite expired</p>
        <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">This invite is no longer active</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">{state.message}</p>
      </main>
    );
  }

  const { view } = state;

  return (
    <main
      className="mx-auto max-w-xl px-4 py-8"
      style={{ background: VMB_THEME.warmBg, color: VMB_THEME.ink, minHeight: "100vh" }}
    >
      <header className="mb-6 space-y-1 text-center">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Private invite</p>
        <h1 className="m-0 text-xl font-extrabold text-stone-900">{view.salonDisplayName}</h1>
      </header>

      <PersonalInvitePreview model={view.previewModel} />

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href={view.claimHref}
          className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-stone-800"
        >
          Claim this invite
        </Link>
        <p className="m-0 text-center text-xs text-stone-500">
          Claiming is coming soon — your salon will confirm next steps.
        </p>
      </div>
    </main>
  );
}
