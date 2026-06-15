"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { VmbInviteEvent } from "@/lib/vmb/invites/invite-event-types";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export function InvitesClaimsAdminPanel() {
  const [events, setEvents] = useState<VmbInviteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ types: "invite_claimed" });
      const res = await fetch(`/api/vmb/invite-events?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as { ok: boolean; data?: VmbInviteEvent[]; error?: string };
      if (!res.ok || !json.ok) {
        setEvents([]);
        setError(json.error ?? "Sign in to a salon trial to view claim events.");
        return;
      }
      setEvents(json.data ?? []);
    } catch {
      setEvents([]);
      setError("Could not load claim events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current="Claims" />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">Claims tracking</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">
          Recipient claim submissions for the active salon trial — contact details are stored as safe
          summaries only.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading claim events…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && !error ? (
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">Claims</p>
          <p className="m-0 text-xl font-extrabold text-stone-900">{events.length}</p>
        </div>
      ) : null}

      {!loading && !error && events.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {events.slice(0, 20).map((event) => (
            <li key={event.eventId} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-bold text-stone-900">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
                {event.payload.salonDisplayName ? (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-700">{event.payload.salonDisplayName}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-stone-600">
                {event.payload.inviteId ? (
                  <span className="font-mono text-[10px] text-stone-500">{event.payload.inviteId}</span>
                ) : null}
                {event.payload.clientName ? (
                  <>
                    <span className="text-stone-300">·</span>
                    <span>{event.payload.clientName}</span>
                  </>
                ) : null}
                {event.payload.recipientContactSummary ? (
                  <>
                    <span className="text-stone-300">·</span>
                    <span>{event.payload.recipientContactSummary}</span>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="text-sm text-stone-500">No claim events recorded yet for this trial.</p>
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
