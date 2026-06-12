"use client";

import { useState } from "react";
import { countDraftFetch } from "@/lib/taikos/debug/draft-fetch-count";
import Link from "next/link";
import { AiosDraftBadge } from "@/components/taikos/drafts/AiosDraftBadge";
import { draftDetailHref } from "@/lib/taikos/drafts/draft-router";
import type { TaikosDraftListItem } from "@/lib/taikos/drafts/types";

type Props = {
  drafts: TaikosDraftListItem[];
  onRefresh?: () => void;
};

export function TodayDraftPanel({ drafts, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  if (drafts.length === 0) return null;

  async function archiveDraft(draftId: string) {
    setBusy(true);
    try {
      countDraftFetch();
      await fetch(`/api/taikos/drafts/${draftId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle(draftId: string) {
    setBusy(true);
    try {
      countDraftFetch();
      await fetch(`/api/taikos/drafts/${draftId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setEditingId(null);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="taikos-today-drafts">
      <div className="vmb-today__section-head">
        <h3 className="taikos-section-title">Recent Drafts</h3>
        <Link href="/vmb/campaigns" className="vmb-today__link">
          All drafts
        </Link>
      </div>
      <div className="taikos-today-drafts__list">
        {drafts.slice(0, 5).map((draft) => (
          <article key={draft.draftId} className="taikos-today-drafts__item">
            <div className="taikos-today-drafts__head">
              <h4>{draft.title}</h4>
              <AiosDraftBadge draftType={draft.draftType} status={draft.status} />
            </div>
            {editingId === draft.draftId ? (
              <div className="taikos-today-drafts__edit">
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
                <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void saveTitle(draft.draftId)}>
                  Save
                </button>
                <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="taikos-today-drafts__actions">
                <Link href={draftDetailHref(draft.draftType, draft.draftId)} className="taikos-opp-card__cta taikos-opp-card__cta--secondary">
                  View
                </Link>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--secondary"
                  onClick={() => {
                    setEditingId(draft.draftId);
                    setTitle(draft.title);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={busy}
                  onClick={() => void archiveDraft(draft.draftId)}
                >
                  Archive
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
