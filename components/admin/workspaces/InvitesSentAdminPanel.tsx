"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export function InvitesSentAdminPanel() {
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/invite-drafts", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as { ok: boolean; data?: VmbInviteDraft[]; error?: string };
      if (!res.ok || !json.ok) {
        setDrafts([]);
        setError(json.error ?? "Sign in to a salon trial to view invite drafts.");
        return;
      }
      setDrafts(json.data ?? []);
    } catch {
      setDrafts([]);
      setError("Could not load invite drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sent = drafts.filter((draft) => draft.status === "sent");
  const approved = drafts.filter((draft) => draft.status === "approved");

  return (
    <div className="space-y-4">
      <InvitesWorkspaceBreadcrumb current="Sent Invites" />
      <header className="space-y-1">
        <h1 className="m-0 text-lg font-extrabold text-stone-900">Sent Invites</h1>
        <p className="m-0 max-w-2xl text-sm text-stone-600">
          Invite draft activity for the active salon trial. Full send workflow lives in the VMB
          product Invites page.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Loading invite drafts…</p> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Sent", value: sent.length },
            { label: "Approved", value: approved.length },
            { label: "All drafts", value: drafts.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
              <p className="m-0 text-xl font-extrabold text-stone-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && sent.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {sent.slice(0, 12).map((draft) => (
            <li key={draft.draftId} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
              <span className="font-bold text-stone-900">{draft.clientName ?? "Client"}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-600">{draft.inviteCategory}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && sent.length === 0 ? (
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
