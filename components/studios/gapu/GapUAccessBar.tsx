"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { GAP_U_SLUG } from "@/lib/studios/gapu";

type Props = {
  isAuthenticated: boolean;
  isMember?: boolean;
};

export function GapUAccessBar({ isAuthenticated, isMember = false }: Props) {
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
      const res = await fetch(`/api/studios/${GAP_U_SLUG}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, note, relationship }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setStatus(data.message ?? "Request sent.");
      setModalOpen(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="gapu-access-bar">
        <div>
          <p className="gapu-access-label">Invite-only · trusted access</p>
          <p className="gapu-access-desc">
            Gap U is a living private Studio — not an open forum or public social feed. Members join
            through steward review and AIH invite rules.
          </p>
        </div>
        {isMember ? (
          <Link href="/aihsafe" className="gapu-btn gapu-btn-primary">
            Open member Space
          </Link>
        ) : (
          <button type="button" className="gapu-btn gapu-btn-primary" onClick={() => setModalOpen(true)}>
            Request access
          </button>
        )}
        {!isAuthenticated ? (
          <p className="gapu-access-hint">
            <Link href="/login">Sign in</Link> if you already have an invite.
          </p>
        ) : null}
      </div>
      {status ? <p className="gapu-access-status">{status}</p> : null}

      {modalOpen ? (
        <div className="gapu-modal-backdrop" onClick={() => setModalOpen(false)} role="presentation">
          <div
            className="gapu-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="gapu-modal-title">Request access to Gap U</h3>
            <p className="gapu-modal-sub">
              Parents, tutors, and family stewards review each request. Student access follows
              guardian rules.
            </p>
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Relationship (parent, tutor, student…)"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Why would you like to join?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button
              type="button"
              className="gapu-btn gapu-btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={busy || !name.trim() || !email.trim()}
              onClick={() => void submitRequest()}
            >
              {busy ? "Sending…" : "Submit request"}
            </button>
          </div>
        </div>
      ) : null}
    </>
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
