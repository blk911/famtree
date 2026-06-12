"use client";

import { useEffect, useState } from "react";
import { AiosDraftCard } from "@/components/taikos/drafts/AiosDraftCard";
import { fetchTaikosJson } from "@/lib/taikos/fetch-taikos-json";
import type { TaikosDraftListItem } from "@/lib/taikos/drafts/types";

type Props = {
  refreshKey?: number;
  limit?: number;
};

export function AiosDraftList({ refreshKey = 0, limit = 5 }: Props) {
  const [drafts, setDrafts] = useState<TaikosDraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setUnavailable(false);
      try {
        const outcome = await fetchTaikosJson<
          Array<{
            draftId: string;
            title: string;
            draftType: TaikosDraftListItem["draftType"];
            status: TaikosDraftListItem["status"];
            createdAt: string;
            estimatedValue: number;
          }>
        >(`/api/taikos/drafts?limit=${limit}`);

        if (cancelled) return;

        if (outcome.authBlocked) {
          setDrafts([]);
          setUnavailable(true);
          return;
        }

        if (outcome.ok && outcome.data) {
          const open = outcome.data.filter((d) => d.status !== "archived" && d.status !== "cancelled");
          setDrafts(
            open.slice(0, limit).map((d) => ({
              draftId: d.draftId,
              title: d.title,
              draftType: d.draftType,
              status: d.status,
              createdAt: d.createdAt,
              estimatedValue: d.estimatedValue,
            })),
          );
          return;
        }

        setDrafts([]);
      } catch {
        if (!cancelled) setDrafts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, limit]);

  if (loading) return null;
  if (unavailable) {
    return (
      <section className="aios-draft-list" aria-label="Recent drafts">
        <p className="aios-draft-list__unavailable">Drafts unavailable. Please refresh or sign back in.</p>
      </section>
    );
  }
  if (drafts.length === 0) return null;

  return (
    <section className="aios-draft-list" aria-label="Recent drafts">
      <h4 className="aios-draft-list__title">Recent Drafts</h4>
      <div className="aios-draft-list__items">
        {drafts.map((draft) => (
          <AiosDraftCard key={draft.draftId} draft={draft} compact />
        ))}
      </div>
    </section>
  );
}
