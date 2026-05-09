"use client";
// AIH Safe — send an invite + list sent invites.
// The invite can be scoped to a trust unit or family unit (at least one required).
// Handles 201 (sent), 202 (guardian approval needed for minor invite), 403 (denied).

import { useState, useEffect, useCallback } from "react";
import {
  sendInvite,
  listInvites,
  listTrustUnits,
  listFamilyUnits,
  type AihEscalated,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { InviteDTO, TrustUnitDTO, FamilyUnitDTO } from "@/types/aihsafe/dto";

const RELATIONSHIPS = [
  "parent", "child", "sibling", "spouse", "so", "frnd", "other",
] as const;

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "Parent", child: "Child", sibling: "Sibling",
  spouse: "Spouse", so: "Partner", frnd: "Friend", other: "Other",
};

const AGE_TIER_HINTS = [
  { value: "",        label: "Not specified" },
  { value: "child",   label: "Child (under 10)" },
  { value: "preteen", label: "Preteen (10–12)" },
  { value: "teen",    label: "Teen (13–17)" },
  { value: "adult",   label: "Adult (18+)" },
];

const inputStyle: React.CSSProperties = {
  width:        "100%",
  padding:      "10px 13px",
  borderRadius: 10,
  border:       "1px solid #d6d3d1",
  fontSize:     14,
  background:   "#fafaf9",
  outline:      "none",
  boxSizing:    "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" };

const primaryBtn: React.CSSProperties = {
  background:   "#1c1917",
  color:        "#fff",
  borderRadius: 10,
  padding:      "10px 22px",
  border:       "none",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};

// Status badge
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#d97706", ACCEPTED: "#059669", REGISTERED: "#059669",
  EXPIRED: "#78716c", CANCELLED: "#dc2626",
};

export function InvitePanel() {
  const [email,        setEmail]        = useState("");
  const [relationship, setRelationship] = useState<string>("frnd");
  const [ageTierHint,  setAgeTierHint]  = useState("");
  const [trustUnitId,  setTrustUnitId]  = useState("");
  const [familyUnitId, setFamilyUnitId] = useState("");

  const [busy,    setBusy]    = useState(false);
  const [notice,  setNotice]  = useState<AihEscalated | AihDenied | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const [invites,       setInvites]       = useState<InviteDTO[] | null>(null);
  const [trustUnits,    setTrustUnits]    = useState<TrustUnitDTO[]>([]);
  const [familyUnits,   setFamilyUnits]   = useState<FamilyUnitDTO[]>([]);

  const loadData = useCallback(async () => {
    const [invR, tuR, fuR] = await Promise.all([
      listInvites(), listTrustUnits(), listFamilyUnits(),
    ]);
    if (invR.kind === "ok") setInvites(invR.data.items);
    if (tuR.kind === "ok")  setTrustUnits(tuR.data.items);
    if (fuR.kind === "ok")  setFamilyUnits(fuR.data.items);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    if (!trustUnitId && !familyUnitId) {
      setError("Choose a space or family group to invite this person into.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setSuccess(null);
    const r = await sendInvite({
      recipientEmail: email.trim(),
      relationship,
      ...(trustUnitId  ? { trustUnitId }  : {}),
      ...(familyUnitId ? { familyUnitId } : {}),
      ...(ageTierHint  ? { targetAgeTier: ageTierHint } : {}),
    });
    setBusy(false);
    if (r.kind === "ok") {
      setSuccess(`Invite sent to ${r.data.recipientEmail}.`);
      setEmail("");
      loadData();
    } else if (r.kind === "pending" || r.kind === "denied") {
      setNotice(r);
    } else {
      setError(r.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Their email address
          </label>
          <input
            type="email"
            style={inputStyle}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
        </div>

        {/* Relationship */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Your relationship to them
          </label>
          <select style={selectStyle} value={relationship} onChange={e => setRelationship(e.target.value)}>
            {RELATIONSHIPS.map(r => (
              <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {/* Age tier hint — only used when account doesn't exist yet */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Their approximate age <span style={{ fontWeight: 400, color: "#a8a29e" }}>(if inviting a minor)</span>
          </label>
          <select style={selectStyle} value={ageTierHint} onChange={e => setAgeTierHint(e.target.value)}>
            {AGE_TIER_HINTS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
            Only used when the person doesn't have an account yet. Ignored if they do.
          </p>
        </div>

        {/* Space / family group selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
              Invite into space
            </label>
            <select
              style={selectStyle}
              value={trustUnitId}
              onChange={e => { setTrustUnitId(e.target.value); if (e.target.value) setFamilyUnitId(""); }}
            >
              <option value="">— none —</option>
              {trustUnits.map(u => (
                <option key={u.id} value={u.id}>{u.kind} · {u.id.slice(0, 6)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
              Invite into family group
            </label>
            <select
              style={selectStyle}
              value={familyUnitId}
              onChange={e => { setFamilyUnitId(e.target.value); if (e.target.value) setTrustUnitId(""); }}
            >
              <option value="">— none —</option>
              {familyUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>⚠ {error}</p>
        )}

        <button
          type="submit"
          style={busy ? { ...primaryBtn, opacity: 0.45, cursor: "not-allowed" } : primaryBtn}
          disabled={busy}
        >
          {busy ? "Sending…" : "Send invite"}
        </button>
      </form>

      {success && (
        <p style={{ fontSize: 13, color: "#059669", marginTop: 10 }}>✓ {success}</p>
      )}
      {notice && (
        <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />
      )}

      {/* Sent invites list */}
      {invites && invites.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: "#a8a29e", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Sent invites
          </div>
          {invites.map(inv => (
            <div
              key={inv.id}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:        "10px 14px",
                borderRadius:   10,
                border:         "1px solid #e7e5e4",
                marginBottom:   6,
                background:     "#fafaf9",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>
                  {inv.recipientEmail}
                </div>
                <div style={{ fontSize: 12, color: "#78716c" }}>
                  {RELATIONSHIP_LABELS[inv.relationship] ?? inv.relationship}
                  {" · expires "}{new Date(inv.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <span
                style={{
                  fontSize:     11,
                  fontWeight:   600,
                  color:        STATUS_COLORS[inv.status] ?? "#78716c",
                  background:   "#f5f5f4",
                  borderRadius: 6,
                  padding:      "3px 8px",
                }}
              >
                {inv.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {invites && invites.length === 0 && (
        <p style={{ fontSize: 13, color: "#a8a29e", marginTop: 14 }}>
          No invites sent yet. Invite someone you trust.
        </p>
      )}
    </div>
  );
}
