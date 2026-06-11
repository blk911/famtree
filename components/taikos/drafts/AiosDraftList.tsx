"use client";

import { useEffect, useState } from "react";
import { AiosDraftCard } from "@/components/taikos/drafts/AiosDraftCard";
import type { TaikosDraftListItem } from "@/lib/taikos/drafts/types";

type Props = {
  refreshKey?: number;
  limit?: number;
};

export function AiosDraftList({ refreshKey = 0, limit = 5 }: Props) {
  const [drafts, setDrafts] = useState<TaikosDraftListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/taikos/drafts?limit=${limit}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: Array<{
            draftId: string;
            title: string;
            draftType: TaikosDraftListItem["draftType"];
            status: TaikosDraftListItem["status"];
            createdAt: string;
            estimatedValue: number;
          }>;
        };
        if (!cancelled && res.ok && json.ok && json.data) {
          const open = json.data.filter((d) => d.status !== "archived" && d.status !== "cancelled");
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
        }
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

  if (loading || drafts.length === 0) return null;

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
