"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosQueueItem, TaikosQueueSummary } from "@/lib/taikos/queue/types";

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  ready: "Ready",
  blocked: "Blocked",
  executed: "Completed",
  cancelled: "Archived",
  failed: "Blocked",
};

export function VmbQueueCenterClient() {
  const [summary, setSummary] = useState<TaikosQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taikos/queue", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as { ok: boolean; data?: TaikosQueueSummary };
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

  const grouped = useMemo(() => {
    const items = summary?.allItems ?? [];
    return {
      queued: items.filter((i) => i.status === "queued"),
      ready: items.filter((i) => i.status === "ready"),
      blocked: items.filter((i) => i.status === "blocked" || i.status === "failed"),
      completed: items.filter((i) => i.status === "executed"),
    };
  }, [summary]);

  async function patchQueue(queueId: string, action: "remove" | "archive" | "ready" | "execute") {
    setMessage(null);
    const res = await fetch(`/api/taikos/queue/${queueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string; data?: { message?: string } };
    if (!res.ok || !json.ok) {
      setMessage(json.error ?? "Queue action failed");
      return;
    }
    setMessage(json.data && "message" in json.data ? String(json.data.message) : "Updated queue.");
    await load();
  }

  function renderSection(title: string, items: TaikosQueueItem[]) {
    if (items.length === 0) return null;
    return (
      <section className="vmb-queue-center__section">
        <h3 className="taikos-section-title">{title}</h3>
        <div className="vmb-queue-center__list">
          {items.map((item) => (
            <article key={item.queueId} className="taikos-queue-card">
              <div className="taikos-queue-card__head">
                <h4>{item.draftTitle}</h4>
                <span className="taikos-queue-card__status">{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              {item.goalTitle ? <p className="taikos-queue-card__goal">Goal: {item.goalTitle}</p> : null}
              <p className="taikos-queue-card__value">
                Est. value: <strong>${item.estimatedValue.toLocaleString()}</strong>
              </p>
              <div className="taikos-queue-card__actions">
                <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={() => void patchQueue(item.queueId, "execute")}>
                  Preview Execution
                </button>
                {item.status === "queued" ? (
                  <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={() => void patchQueue(item.queueId, "ready")}>
                    Mark Ready
                  </button>
                ) : null}
                <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--ghost" onClick={() => void patchQueue(item.queueId, "archive")}>
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <VmbPageFrame
      title="Queue"
      subtitle="Single source of truth for future execution — management only, no sends."
    >
      {message ? <p className="vmb-queue-center__message">{message}</p> : null}
      {loading ? (
        <p className="vmb-page-state">Loading queue…</p>
      ) : summary && summary.totalItems > 0 ? (
        <div className="vmb-queue-center">
          {renderSection("Queued", grouped.queued)}
          {renderSection("Ready", grouped.ready)}
          {renderSection("Blocked", grouped.blocked)}
          {renderSection("Completed", grouped.completed)}
        </div>
      ) : (
        <p className="vmb-page-state">Queue is empty — approve drafts and add them from Today or Opportunities.</p>
      )}
    </VmbPageFrame>
  );
}
