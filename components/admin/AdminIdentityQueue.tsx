"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";

type Ack = {
  id: string;
  response: string | null;
  invitee: { id: string; firstName: string; lastName: string; email: string };
};

type QueueRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  hasConflict: boolean;
  changeName: boolean;
  changeEmail: boolean;
  changePhone: boolean;
  prevFirstName: string | null;
  prevLastName: string | null;
  prevEmail: string | null;
  prevPhone: string | null;
  proposedFirstName: string | null;
  proposedLastName: string | null;
  proposedEmail: string | null;
  proposedPhone: string | null;
  requesterNote: string;
  requester: { id: string; firstName: string; lastName: string; email: string };
  acknowledgments: Ack[];
};

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
} as const;

export function AdminIdentityQueue() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch("/api/admin/identity-changes");
    const json = await res.json();
    if (!res.ok) {
      setErr(json?.error ?? "Could not load queue.");
      setRows([]);
      return;
    }
    setRows(json.requests ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/identity-changes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          adminNote: notes[id]?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error ?? "Action failed.");
        return;
      }
      setNotes((n) => {
        const next = { ...n };
        delete next[id];
        return next;
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (rows === null) {
    return (
      <div style={{ ...card, padding: "18px 22px", display: "flex", alignItems: "center", gap: "10px", color: "#78716c", fontSize: "14px" }}>
        <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
        Loading identity queue…
      </div>
    );
  }

  return (
    <section style={card}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f5f4f0", display: "flex", alignItems: "center", gap: "10px" }}>
        <ClipboardList style={{ width: 18, height: 18, color: "#6366f1", flexShrink: 0 }} />
        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#1c1917", flex: 1 }}>Identity change queue</h2>
        <button
          type="button"
          onClick={() => load()}
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#6366f1",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div style={{ padding: "12px 20px", fontSize: "13px", color: "#b91c1c", background: "#fef2f2" }}>{err}</div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: "24px", fontSize: "14px", color: "#a8a29e", textAlign: "center" }}>No requests awaiting admin review.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r, index) => {
            const loading = busyId === r.id;
            return (
              <div
                key={r.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: index < rows.length - 1 ? "1px solid #f5f4f0" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#1c1917" }}>
                      {r.requester.firstName} {r.requester.lastName}
                    </div>
                    <div style={{ fontSize: "13px", color: "#78716c" }}>{r.requester.email}</div>
                  </div>
                  {r.hasConflict && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        alignSelf: "flex-start",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "#fef3c7",
                        color: "#92400e",
                      }}
                    >
                      Conflict / admin path
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "12px", color: "#57534e", lineHeight: 1.55 }}>
                  {r.changeName && r.proposedFirstName && r.proposedLastName && (
                    <div>
                      <strong>Name:</strong> {r.prevFirstName} {r.prevLastName} → {r.proposedFirstName} {r.proposedLastName}
                    </div>
                  )}
                  {r.changeEmail && r.proposedEmail && (
                    <div>
                      <strong>Email:</strong> {r.prevEmail} → {r.proposedEmail}
                    </div>
                  )}
                  {r.changePhone && (
                    <div>
                      <strong>Mobile:</strong> {r.prevPhone || "—"} →{" "}
                      {r.proposedPhone === null || r.proposedPhone === "" ? "(clear)" : r.proposedPhone}
                    </div>
                  )}
                  <div style={{ marginTop: "6px", fontStyle: "italic", color: "#78716c" }}>
                    Member note: &ldquo;{r.requesterNote}&rdquo;
                  </div>
                </div>

                {r.acknowledgments.length > 0 && (
                  <div style={{ fontSize: "11px", color: "#78716c" }}>
                    <strong style={{ color: "#44403c" }}>Invitee responses:</strong>{" "}
                    {r.acknowledgments
                      .map((a) => `${a.invitee.firstName} ${a.invitee.lastName}: ${a.response ?? "pending"}`)
                      .join(" · ")}
                  </div>
                )}

                <textarea
                  placeholder="Optional note (stored on the request)"
                  value={notes[r.id] ?? ""}
                  disabled={loading}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    border: "1px solid #e7e5e4",
                    padding: "8px 10px",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => patch(r.id, "approve")}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#166534",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: loading ? "wait" : "pointer",
                      opacity: loading ? 0.75 : 1,
                    }}
                  >
                    {loading ? "…" : "Approve & apply"}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => patch(r.id, "reject")}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "10px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: loading ? "wait" : "pointer",
                      opacity: loading ? 0.75 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
