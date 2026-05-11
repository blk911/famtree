"use client";
// AIH Safe — guardian inbox: list pending approvals, approve or deny each one.
// Handles the full normalized envelope on resolve (200 success, 403 governance denial).
// 202 is not expected here (guardians don't need their own approval to approve).

import { useState, useEffect, useCallback } from "react";
import {
  listApprovals,
  resolveApproval,
  type AihEscalated,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { ApprovalRequestDTO } from "@/types/aihsafe/dto";

// Human-friendly labels for action kinds
const ACTION_LABELS: Record<string, string> = {
  "family_unit.created":    "Create a family group",
  "trust_unit.formed":      "Create a trusted space",
  "trust_unit.member_added":"Join a trusted space",
  "invite.sent_child":      "Send an invite",
  "membership.granted":     "Join a space",
};

function actionLabel(kind: string): string {
  return ACTION_LABELS[kind] ?? kind;
}

function timeLeft(expiresAt: string): string {
  const ms   = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hrs  = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hrs > 0 ? `${hrs}h left` : `${mins}m left`;
}

export function GuardianInbox() {
  const [items,      setItems]      = useState<ApprovalRequestDTO[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);
  const [notices,    setNotices]    = useState<Record<string, AihEscalated | AihDenied>>({});
  const [done,       setDone]       = useState<Record<string, "approved" | "denied">>({});

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await listApprovals("pending");
      if (r.kind === "ok") setItems(r.data.items);
      else setFetchError(true);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(requestId: string, action: "approve" | "deny") {
    setBusy(requestId);
    setNotices(n => { const c = { ...n }; delete c[requestId]; return c; });
    const r = await resolveApproval(requestId, action);
    setBusy(null);
    if (r.kind === "ok") {
      setDone(d => ({ ...d, [requestId]: action === "approve" ? "approved" : "denied" }));
    } else if (r.kind === "denied" || r.kind === "pending") {
      setNotices(n => ({ ...n, [requestId]: r }));
    }
  }

  if (fetchError) {
    return (
      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
        Couldn&apos;t load approvals. Check your connection.{" "}
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
    return <p style={{ fontSize: 13, color: "#a8a29e" }}>Loading…</p>;
  }

  const pending = items.filter(i => !done[i.id]);

  if (pending.length === 0 && Object.keys(done).length === 0) {
    return (
      <p style={{ fontSize: 14, color: "#78716c" }}>
        Your inbox is clear. Nothing needs your approval right now.
      </p>
    );
  }

  return (
    <div>
      {pending.length === 0 && (
        <p style={{ fontSize: 13, color: "#059669", marginBottom: 16 }}>
          ✓ All caught up — no pending requests.
        </p>
      )}

      {pending.map(item => {
        const isBusy    = busy === item.id;
        const resolved  = done[item.id];
        const notice    = notices[item.id];

        return (
          <div
            key={item.id}
            style={{
              border:       `1px solid ${resolved ? "#d1fae5" : "#e7e5e4"}`,
              borderRadius: 14,
              padding:      "16px 18px",
              marginBottom: 12,
              background:   resolved ? "#f0fdf4" : "#fff",
              opacity:      resolved ? 0.7 : 1,
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1c1917" }}>
                  {actionLabel(item.actionKind)}
                </div>
                {item.contextSummary && item.contextSummary !== actionLabel(item.actionKind) && (
                  <div style={{ fontSize: 13, color: "#1c1917", marginTop: 1 }}>
                    {item.contextSummary}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#78716c", marginTop: 2 }}>
                  Requested by <strong>{item.requestorName || item.requestorId}</strong>
                  {" · "}{timeLeft(item.expiresAt)}
                </div>
              </div>
              {resolved && (
                <span
                  style={{
                    fontSize:     12,
                    fontWeight:   700,
                    color:        resolved === "approved" ? "#059669" : "#dc2626",
                    background:   resolved === "approved" ? "#d1fae5" : "#fee2e2",
                    borderRadius: 8,
                    padding:      "4px 10px",
                  }}
                >
                  {resolved === "approved" ? "✓ Approved" : "✗ Denied"}
                </span>
              )}
            </div>

            {/* Action buttons */}
            {!resolved && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleResolve(item.id, "approve")}
                  disabled={isBusy}
                  style={{
                    padding:      "8px 18px",
                    borderRadius: 9,
                    border:       "none",
                    background:   isBusy ? "#d1fae5" : "#059669",
                    color:        "#fff",
                    fontWeight:   700,
                    fontSize:     13,
                    cursor:       isBusy ? "not-allowed" : "pointer",
                    opacity:      isBusy ? 0.6 : 1,
                  }}
                >
                  {isBusy ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(item.id, "deny")}
                  disabled={isBusy}
                  style={{
                    padding:      "8px 18px",
                    borderRadius: 9,
                    border:       "1px solid #fca5a5",
                    background:   "#fff",
                    color:        "#dc2626",
                    fontWeight:   600,
                    fontSize:     13,
                    cursor:       isBusy ? "not-allowed" : "pointer",
                    opacity:      isBusy ? 0.6 : 1,
                  }}
                >
                  Deny
                </button>
              </div>
            )}

            {notice && (
              <DecisionNotice
                result={notice}
                onDismiss={() => setNotices(n => { const c = { ...n }; delete c[item.id]; return c; })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
