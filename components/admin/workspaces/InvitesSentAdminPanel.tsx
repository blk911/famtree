"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SalonClaimTimelineDto } from "@/lib/vmb/invites/sent-invite-dto";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export function InvitesSentAdminPanel() {
  const [timeline, setTimeline] = useState<SalonClaimTimelineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/sent-invites", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; timeline?: SalonClaimTimelineDto[]; error?: string };
      if (!res.ok || !json.ok) {
        setTimeline([]);
        setError(json.error ?? "Sign in to a salon trial to view sent invites.");
        return;
      }
      setTimeline(json.timeline ?? []);
    } catch {
      setTimeline([]);
      setError("Could not load sent invites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sent = timeline.filter((row) => row.sentInvite.status === "sent" || row.sentInvite.status === "opened");
  const claimed = timeline.filter((row) => row.sentInvite.status === "claimed");
  const redeemed = timeline.filter((row) => row.sentInvite.status === "redeemed");

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current="Sent Invites" />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">Sent Invites</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">
          Canonical SentInvite records for the active salon trial. Drafts are not public claim links.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading sent invites…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Sent", value: sent.length },
            { label: "Claimed", value: claimed.length },
            { label: "Redeemed", value: redeemed.length },
            { label: "All sent invites", value: timeline.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
              <p className="m-0 text-xl font-extrabold text-stone-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && timeline.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {timeline.slice(0, 12).map(({ sentInvite, claim }) => (
            <li key={sentInvite.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <span className="font-bold text-stone-900">{sentInvite.recipientName}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-600">{sentInvite.inviteTypeLabel}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-500">{sentInvite.status}</span>
              {claim ? (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="text-stone-500">Claimed {new Date(claim.claimedAt).toLocaleString()}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && timeline.length === 0 ? (
        <p className="text-sm text-stone-500">No sent invites yet for this trial.</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/vmb/invites"
          className="rounded-md bg-stone-900 px-3 py-2 text-xs font-semibold text-white no-underline hover:bg-stone-800"
        >
          Open operator invites
        </Link>
        <Link
          href={INVITES_ADMIN_ROUTES.hub}
          className="rounded-md border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 no-underline hover:bg-stone-50"
        >
          Back to operating center
        </Link>
      </div>
    </div>
  );
}
