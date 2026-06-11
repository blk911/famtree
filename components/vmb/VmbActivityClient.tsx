"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";

export function VmbActivityClient() {
  const [summary, setSummary] = useState<TaikosActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taikos/activity", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as { ok: boolean; data?: TaikosActivitySummary };
      setSummary(res.ok && json.ok && json.data ? json.data : null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <VmbPageFrame
      title="Activity"
      subtitle="What happened in your salon — business stories, not debug logs."
    >
      {loading ? (
        <p className="vmb-page-state">Loading activity…</p>
      ) : summary ? (
        <ActivityTimeline summary={summary} />
      ) : (
        <p className="vmb-page-state">Connect your book to unlock activity.</p>
      )}
    </VmbPageFrame>
  );
}
