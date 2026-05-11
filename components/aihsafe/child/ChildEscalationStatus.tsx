"use client";
// AIH Safe — child-facing view of their own pending guardian approval requests.
// Shows a card per pending escalation so the child knows what's awaiting a guardian decision.

import { useState, useEffect, useCallback } from "react";
import { listMyEscalations } from "@/components/aihsafe/common/apiClient";
import type { ApprovalRequestDTO } from "@/types/aihsafe/dto";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hrs  = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hrs > 0 ? `${hrs}h left` : `${mins}m left`;
}

export function ChildEscalationStatus() {
  const [items, setItems] = useState<ApprovalRequestDTO[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await listMyEscalations("pending");
      if (r.kind === "ok") setItems(r.data.items);
      else setError(true);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
        Couldn&apos;t load your pending requests.{" "}
        <button
          type="button"
          onClick={load}
          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}
        >
          Retry
        </button>
      </p>
    );
  }

  if (items === null) {
    return <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>
        No requests are waiting for approval right now.
      </p>
    );
  }

  return (
    <div>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            border:       "1px solid #fde68a",
            borderRadius: 12,
            padding:      "14px 16px",
            marginBottom: 10,
            background:   "#fffbeb",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>⏳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917", marginBottom: 3 }}>
                Waiting for guardian approval
              </div>
              <div style={{ fontSize: 13, color: "#57534e" }}>
                {item.contextSummary}
              </div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 5 }}>
                {timeLeft(item.expiresAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
