"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SalonClaimTimelineDto } from "@/lib/vmb/invites/sent-invite-dto";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export function InvitesClaimsAdminPanel() {
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
        setError(json.error ?? "Sign in to a salon trial to view canonical claims.");
        return;
      }
      setTimeline(json.timeline ?? []);
    } catch {
      setTimeline([]);
      setError("Could not load canonical claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const claims = timeline.filter((row) => row.claim);

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current="Claims" />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">Claims tracking</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">
          Canonical recipient claims from SentInvite records. Legacy event logs are analytics only.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading canonical claims…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && !error ? (
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">Claims</p>
          <p className="m-0 text-xl font-extrabold text-stone-900">{claims.length}</p>
        </div>
      ) : null}

      {!loading && !error && claims.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {claims.slice(0, 20).map(({ sentInvite, claim }) => (
            <li key={sentInvite.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-bold text-stone-900">
                  {claim ? new Date(claim.claimedAt).toLocaleString() : "Claimed"}
                </span>
                <span className="text-stone-300">·</span>
                <span className="text-stone-700">{sentInvite.inviteTypeLabel}</span>
                <span className="text-stone-300">·</span>
                <span className="text-stone-500">{sentInvite.status}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-stone-600">
                <span>{claim?.clientName ?? sentInvite.recipientName}</span>
                {claim?.recipientContactSummary ? <span className="text-stone-300">·</span> : null}
                {claim?.recipientContactSummary ? <span>{claim.recipientContactSummary}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && claims.length === 0 ? (
        <p className="text-sm text-stone-500">No canonical invite claims recorded yet for this trial.</p>
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
