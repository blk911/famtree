"use client";

import { useEffect, useState } from "react";
import type { TaikosActionLogEntry } from "@/lib/taikos/actions/types";

type Props = {
  refreshKey?: number;
};

export function AiosActionLog({ refreshKey = 0 }: Props) {
  const [entries, setEntries] = useState<TaikosActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/taikos/actions/log?limit=8", {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as { ok: boolean; data?: TaikosActionLogEntry[] };
        if (!cancelled && res.ok && json.ok && json.data) {
          setEntries(json.data);
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <section className="aios-action-log" aria-label="Recent recorded actions">
      <h4 className="aios-action-log__title">Recorded actions</h4>
      <ul className="aios-action-log__list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span className="aios-action-log__label">{entry.actionLabel}</span>
            <span className="aios-action-log__meta">
              {entry.payloadSummary} · {new Date(entry.timestamp).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
