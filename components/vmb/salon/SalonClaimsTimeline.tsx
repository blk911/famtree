"use client";

import { useCallback, useEffect, useState } from "react";
import type { SalonClaimTimelineDto } from "@/lib/vmb/invites/sent-invite-dto";

export function SalonClaimsTimeline() {
  const [rows, setRows] = useState<SalonClaimTimelineDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/vmb/sent-invites", { cache: "no-store", credentials: "include" });
    const json = (await response.json()) as { ok?: boolean; error?: string; timeline?: SalonClaimTimelineDto[] };
    if (!response.ok || !json.ok) {
      setError(json.error ?? "Could not load sent invitations.");
      return;
    }
    setRows(json.timeline ?? []);
    setError(null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function redeem(id: string) {
    const response = await fetch(`/api/vmb/sent-invites/${encodeURIComponent(id)}/redeem`, { method: "POST", credentials: "include" });
    if (response.ok) await load();
  }

  if (error) return <p className="text-sm text-amber-800">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-stone-500">No sent invitations yet.</p>;
  return (
    <section>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Sent invite timeline</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map(({ sentInvite, claim }) => (
          <article key={sentInvite.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{sentInvite.recipientName}</strong>
              <span className="text-xs font-bold uppercase text-stone-500">{sentInvite.status}</span>
            </div>
            <p className="m-0 mt-1 text-sm text-stone-600">{sentInvite.inviteTypeLabel}</p>
            {claim ? <p className="m-0 mt-2 text-xs text-stone-500">Claimed {new Date(claim.claimedAt).toLocaleString()} · {claim.recipientContactSummary}</p> : null}
            {sentInvite.status === "claimed" ? <button type="button" className="mt-3 rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold" onClick={() => void redeem(sentInvite.id)}>Mark redeemed</button> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
