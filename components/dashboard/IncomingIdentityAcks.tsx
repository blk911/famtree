"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

type Item = {
  acknowledgmentId: string;
  requestId: string;
  expiresAt: string;
  requesterNote: string;
  proposed: {
    changeName: boolean;
    changeEmail: boolean;
    changePhone: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  previous: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  requester: { id: string; firstName: string; lastName: string; email: string };
};

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
} as const;

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function IncomingIdentityAcks() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/identity-change/incoming");
    const json = await res.json();
    if (!res.ok) return;
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (requestId: string, accept: boolean) => {
    setActing(requestId);
    try {
      const res = await fetch(`/api/identity-change/${requestId}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) await load();
    } finally {
      setActing(null);
    }
  };

  if (items === null) {
    return (
      <div style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", gap: "10px", color: "#78716c", fontSize: "13px" }}>
        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
        Checking acknowledgments…
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section style={card}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f5f4f0", display: "flex", alignItems: "center", gap: "10px" }}>
        <ShieldCheck style={{ width: 18, height: 18, color: "#92400e", flexShrink: 0 }} />
        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#1c1917", flex: 1 }}>Identity change — your acknowledgment</h2>
        <Link href="/settings" style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
          Settings →
        </Link>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {items.map((row) => {
          const loading = acting === row.requestId;
          const name =
            row.proposed.changeName && row.proposed.firstName && row.proposed.lastName
              ? `${row.proposed.firstName} ${row.proposed.lastName}`
              : null;
          return (
            <div
              key={row.acknowledgmentId}
              style={{
                border: "1px solid #fef3c7",
                background: "#fffbeb",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c1917" }}>
                {row.requester.firstName} {row.requester.lastName}
                <span style={{ fontWeight: 500, color: "#78716c", marginLeft: "8px", fontSize: "12px" }}>
                  asks you to acknowledge updates · reply by {fmtShort(row.expiresAt)}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#57534e", lineHeight: 1.5 }}>
                {name && (
                  <div>
                    <strong>Name:</strong> {row.previous.firstName} {row.previous.lastName} → {name}
                  </div>
                )}
                {row.proposed.changeEmail && row.proposed.email && (
                  <div>
                    <strong>Email:</strong> {row.previous.email} → {row.proposed.email}
                    <span style={{ display: "block", fontSize: "11px", color: "#92400e", marginTop: "4px" }}>
                      An admin still approves email changes before they apply.
                    </span>
                  </div>
                )}
                {row.proposed.changePhone && (
                  <div>
                    <strong>Mobile:</strong>{" "}
                    {row.previous.phone || "—"} →{" "}
                    {row.proposed.phone === null || row.proposed.phone === "" ? "(clear)" : row.proposed.phone}
                  </div>
                )}
                <div style={{ marginTop: "8px", fontStyle: "italic", color: "#78716c" }}>
                  &ldquo;{row.requesterNote}&rdquo;
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => respond(row.requestId, true)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "9px",
                    border: "none",
                    background: "#166534",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "…" : "Yes, acknowledged"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => respond(row.requestId, false)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "9px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#991b1b",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  No
                </button>
              </div>
              <p style={{ fontSize: "11px", color: "#78716c", margin: 0 }}>
                A “no” still forwards the request to an admin for review — use it when you cannot confirm the change.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
