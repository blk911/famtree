"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { InviteEventType, VmbInviteEvent } from "@/lib/vmb/invites/invite-event-types";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

type Props = {
  title: string;
  description: string;
  breadcrumb: string;
  eventTypes: InviteEventType[];
  emptyMessage: string;
};

export function InvitesEventsAdminPanel({
  title,
  description,
  breadcrumb,
  eventTypes,
  emptyMessage,
}: Props) {
  const [events, setEvents] = useState<VmbInviteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ types: eventTypes.join(",") });
      const res = await fetch(`/api/vmb/invite-events?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as { ok: boolean; data?: VmbInviteEvent[]; error?: string };
      if (!res.ok || !json.ok) {
        setEvents([]);
        setError(json.error ?? "Sign in to a salon trial to view invite events.");
        return;
      }
      setEvents(json.data ?? []);
    } catch {
      setEvents([]);
      setError("Could not load invite events.");
    } finally {
      setLoading(false);
    }
  }, [eventTypes]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current={breadcrumb} />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">{title}</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">{description}</p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading invite events…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && !error ? (
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">Events</p>
          <p className="m-0 text-xl font-extrabold text-stone-900">{events.length}</p>
        </div>
      ) : null}

      {!loading && !error && events.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {events.slice(0, 20).map((event) => (
            <li key={event.eventId} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <span className="font-bold text-stone-900">{event.eventType.replace(/_/g, " ")}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-600">{new Date(event.occurredAt).toLocaleString()}</span>
              {event.payload.clientName ? (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="text-stone-600">{event.payload.clientName}</span>
                </>
              ) : null}
              {event.payload.draftId ? (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="font-mono text-[10px] text-stone-500">{event.payload.draftId}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="text-sm text-stone-500">{emptyMessage}</p>
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
