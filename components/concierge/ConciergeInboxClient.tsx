"use client";

import { useState } from "react";
import Link from "next/link";

type LeadRow = {
  id: string;
  status: string;
  phone: string | null;
  email: string | null;
  igHandle: string | null;
};

type MsgPreview = { role: string; content: string };

export type InboxSession = {
  id: string;
  contextKey: string;
  funnelStage: string;
  status: string;
  visitorToken: string;
  summaryLine: string | null;
  takeoverUserId: string | null;
  updatedAt: string;
  messages: MsgPreview[];
  leads: LeadRow[];
};

export function ConciergeInboxClient(props: {
  studios: { slug: string; name: string }[];
  sessions: InboxSession[];
  currentUserId: string;
}) {
  const { studios, currentUserId } = props;
  const [sessions, setSessions] = useState(props.sessions);

  const toggleTakeover = async (sessionId: string, enable: boolean) => {
    const res = await fetch("/api/concierge/takeover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, enable }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Takeover failed");
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, takeoverUserId: enable ? currentUserId : null } : s,
      ),
    );
  };

  return (
    <div style={{ padding: "28px 22px 48px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
          Concierge inbox
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#78716c", lineHeight: 1.55 }}>
          Live AI-led chats on your public studio slugs ({studios.map((s) => s.slug).join(", ")}). Takeover pauses AI replies until you release (handoff wiring comes next).
        </p>
        <Link href="/studios" style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
          ← Back to Studios surface
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div
          style={{
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid #ece9e3",
            background: "white",
            color: "#78716c",
            fontSize: "14px",
          }}
        >
          No concierge threads yet — visits to{" "}
          <code style={{ fontSize: "12px", color: "#1c1917" }}>/studios/&lt;your-slug&gt;</code> will land here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sessions.map((s) => {
            const lastUser = s.messages.find((m) => m.role === "user");
            const preview = s.summaryLine ?? lastUser?.content?.slice(0, 140) ?? "—";
            const lead = s.leads[0];
            const liveYou = s.takeoverUserId === currentUserId;

            return (
              <div
                key={s.id}
                style={{
                  padding: "16px 18px",
                  borderRadius: "14px",
                  border: "1px solid #ece9e3",
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#a8a29e" }}>
                      STUDIO / {s.contextKey}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#1c1917", marginTop: "4px" }}>
                      {s.funnelStage.replace(/_/g, " ")} · {s.status}
                      {liveYou && (
                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "#15803d", fontWeight: 800 }}>
                          YOU ARE LIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "13px", color: "#57534e", marginTop: "8px", lineHeight: 1.45 }}>
                      {preview}
                      {preview.length >= 140 ? "…" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => toggleTakeover(s.id, !liveYou)}
                      style={{
                        border: "1px solid #1c1917",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontWeight: 800,
                        background: liveYou ? "#fef3c7" : "#1c1917",
                        color: liveYou ? "#92400e" : "white",
                        cursor: "pointer",
                      }}
                    >
                      {liveYou ? "Release takeover" : "Takeover thread"}
                    </button>
                    <span style={{ fontSize: "11px", color: "#a8a29e" }}>
                      Updated {new Date(s.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {lead && (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #f5f5f4",
                      fontSize: "12px",
                      color: "#44403c",
                    }}
                  >
                    <strong style={{ fontWeight: 800 }}>Lead:</strong>{" "}
                    {[lead.email, lead.phone, lead.igHandle].filter(Boolean).join(" · ") || "Captured"}
                    <span style={{ marginLeft: "8px", color: "#78716c" }}>({lead.status})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
