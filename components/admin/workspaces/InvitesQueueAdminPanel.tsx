"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";
import { RecipientInviteUrlCopy } from "@/components/admin/workspaces/RecipientInviteUrlCopy";

export function InvitesQueueAdminPanel() {
  const [summary, setSummary] = useState<TaikosQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/taikos/queue", { cache: "no-store", credentials: "include" });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setSummary(null);
        setError("Queue API unavailable in this session.");
        return;
      }
      const json = (await res.json()) as { ok: boolean; data?: TaikosQueueSummary; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setSummary(null);
        setError(json.error ?? "Could not load queue summary.");
        return;
      }
      setSummary(json.data);
    } catch {
      setSummary(null);
      setError("Could not load queue summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = summary?.allItems ?? [];
  const queued = items.filter((item) => item.status === "queued").length;
  const ready = items.filter((item) => item.status === "ready").length;
  const blocked = items.filter((item) => item.status === "blocked" || item.status === "failed").length;
  const completed = items.filter((item) => item.status === "executed").length;

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current="Invite Queue" />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">Invite Queue</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">
          Read-only admin view of the tAIkOS execution queue. Approve and send actions stay in the
          salon operator shell.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading queue…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Queued", value: queued },
            { label: "Ready", value: ready },
            { label: "Blocked", value: blocked },
            { label: "Completed", value: completed },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
              <p className="m-0 text-xl font-extrabold text-stone-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && summary && items.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.slice(0, 12).map((item) => (
            <li key={item.queueId} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <span className="font-bold text-stone-900">{item.draftTitle}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-600">{item.status}</span>
              {item.inviteCard?.recipientName ? (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="text-stone-500">{item.inviteCard.recipientName}</span>
                </>
              ) : null}
              {item.draftId ? <RecipientInviteUrlCopy inviteId={item.draftId} /> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && (!summary || items.length === 0) ? (
        <p className="text-sm text-stone-500">No queue items yet — approve invites from Today to populate the queue.</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/vmb/queue"
          className="rounded-md bg-stone-900 px-3 py-2 text-xs font-semibold text-white no-underline hover:bg-stone-800"
        >
          Open operator queue
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
