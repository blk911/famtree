"use client";
// AIH Safe — create a trust unit + list existing ones.
// Handles 201 (created), 202 (guardian approval needed), 403 (denied).

import { useState, useEffect, useCallback } from "react";
import {
  createTrustUnit,
  listTrustUnits,
  type AihEscalated,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";

const KINDS = [
  { value: "family",   label: "Family",   desc: "Your household or close relatives" },
  { value: "peer",     label: "Peer",     desc: "A pod of trusted friends" },
  { value: "extended", label: "Extended", desc: "A wider circle — cousins, community" },
  { value: "guardian", label: "Guardian", desc: "Parents and caregivers only" },
] as const;

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

export function TrustUnitCreatePanel() {
  const [kind,    setKind]    = useState<string>("peer");
  const [name,    setName]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [notice,  setNotice]  = useState<AihEscalated | AihDenied | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [units,   setUnits]   = useState<TrustUnitDTO[] | null>(null);

  const loadUnits = useCallback(async () => {
    const r = await listTrustUnits();
    if (r.kind === "ok") setUnits(r.data.items);
  }, []);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    setSuccess(null);
    const r = await createTrustUnit(kind, name.trim() || undefined);
    setBusy(false);
    if (r.kind === "ok") {
      setSuccess(`${r.data.kind} space created.`);
      setName("");
      loadUnits();
    } else if (r.kind === "pending" || r.kind === "denied") {
      setNotice(r);
    }
  }

  const kindMeta = KINDS.find(k => k.value === kind);

  return (
    <div>
      <form onSubmit={handleCreate}>
        {/* Kind picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 8 }}>
            Space type
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {KINDS.map(k => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                style={{
                  padding:      "8px 14px",
                  borderRadius: 10,
                  border:       kind === k.value ? "2px solid #1c1917" : "1px solid #d6d3d1",
                  background:   kind === k.value ? "#1c1917" : "#fafaf9",
                  color:        kind === k.value ? "#fff" : "#44403c",
                  fontSize:     13,
                  fontWeight:   kind === k.value ? 700 : 500,
                  cursor:       "pointer",
                }}
              >
                {k.label}
              </button>
            ))}
          </div>
          {kindMeta && (
            <p style={{ fontSize: 12, color: "#78716c", marginTop: 6 }}>{kindMeta.desc}</p>
          )}
        </div>

        {/* Optional name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Name <span style={{ fontWeight: 400, color: "#a8a29e" }}>(optional)</span>
          </label>
          <input
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Summer pod · Book club · …"
            maxLength={80}
          />
        </div>

        <button
          type="submit"
          style={busy ? { ...primaryBtn, opacity: 0.45, cursor: "not-allowed" } : primaryBtn}
          disabled={busy}
        >
          {busy ? "Creating…" : "Create space"}
        </button>
      </form>

      {success && (
        <p style={{ fontSize: 13, color: "#059669", marginTop: 10 }}>✓ {success}</p>
      )}
      {notice && (
        <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />
      )}

      {/* Existing trust units */}
      {units && units.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: "#a8a29e", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Your spaces
          </div>
          {units.map(u => (
            <div
              key={u.id}
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
                  {u.kind} space
                </div>
                <div style={{ fontSize: 12, color: "#78716c" }}>
                  {u.members.length} {u.members.length === 1 ? "member" : "members"}
                  {" · "}max {u.maxMemberCount}
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#a8a29e" }}>
                {u.id.slice(0, 8)}…
              </span>
            </div>
          ))}
        </div>
      )}

      {units && units.length === 0 && (
        <p style={{ fontSize: 13, color: "#a8a29e", marginTop: 14 }}>
          No spaces yet. Shared spaces are how families and teams stay close.
        </p>
      )}
    </div>
  );
}
