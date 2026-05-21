"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { StudioDraftContentDTO } from "@/types/studios/builder";

type Props = {
  slug: string;
  content: StudioDraftContentDTO;
  isAuthenticated: boolean;
  isMember: boolean;
  isOwner: boolean;
  trustUnitId: string | null;
};

export function PublishedStudioExtras({
  slug,
  content,
  isAuthenticated,
  isMember,
  isOwner,
  trustUnitId,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [relationship, setRelationship] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitRequest() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/studios/${slug}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, note, relationship }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setStatus("Request sent — the steward will review it.");
      setModalOpen(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ maxWidth: 720, margin: "32px auto", padding: "0 20px" }}>
      {content.benefits.visible ? (
        <div style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.9)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>{content.benefits.title}</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#57534e" }}>{content.benefits.body}</p>
        </div>
      ) : null}
      {content.howItWorks.visible ? (
        <div style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.9)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>{content.howItWorks.title}</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#57534e" }}>{content.howItWorks.body}</p>
        </div>
      ) : null}

      <div
        style={{
          padding: 20,
          borderRadius: 18,
          background: "rgba(28,25,23,0.04)",
          border: "1px solid rgba(28,25,23,0.08)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#78716c" }}>Private member network</p>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#44403c" }}>
            Public preview only — membership is invite-only through AIH.
          </p>
        </div>
        {isMember || isOwner ? (
          <Link
            href={trustUnitId ? `/aihsafe?space=${trustUnitId}` : "/aihsafe"}
            style={{
              padding: "10px 18px",
              borderRadius: 14,
              background: "#44403c",
              color: "#fafaf9",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Open member Space
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "10px 18px",
              borderRadius: 14,
              border: "none",
              background: "#44403c",
              color: "#fafaf9",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {content.requestAccessCopy.ctaLabel}
          </button>
        )}
      </div>

      {status ? (
        <p role="status" style={{ marginTop: 12, fontSize: 13, color: "#57534e" }}>
          {status}
        </p>
      ) : null}

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              padding: 22,
              borderRadius: 18,
              background: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>
              {content.requestAccessCopy.headline}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#78716c" }}>
              {content.requestAccessCopy.body}
            </p>
            {!isAuthenticated ? (
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                <Link href="/login">Sign in</Link> for faster steward review, or submit as a guest.
              </p>
            ) : null}
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Relationship (optional)"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Short note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button
              type="button"
              disabled={busy || !name.trim() || !email.trim()}
              onClick={() => void submitRequest()}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "#44403c",
                color: "#fff",
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Sending…" : "Submit request"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginBottom: 8,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d6d3d1",
  fontSize: 13,
  boxSizing: "border-box",
};
