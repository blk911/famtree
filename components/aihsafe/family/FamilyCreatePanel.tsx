"use client";
// AIH Safe — create a family unit + list existing ones.
// Handles 201 (created), 202 (guardian approval needed), 403 (denied).

import { useState, useEffect, useCallback } from "react";
import {
  createFamilyUnit,
  listFamilyUnits,
  type AihResult,
  type AihEscalated,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { FamilyUnitDTO } from "@/types/aihsafe/dto";

// ─── Shared micro-styles ──────────────────────────────────────────────────────

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

const disabledBtn: React.CSSProperties = {
  ...primaryBtn,
  opacity: 0.45,
  cursor:  "not-allowed",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FamilyCreatePanel() {
  const [name,    setName]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [notice,  setNotice]  = useState<AihEscalated | AihDenied | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [units,   setUnits]   = useState<FamilyUnitDTO[] | null>(null);

  const loadUnits = useCallback(async () => {
    const r = await listFamilyUnits();
    if (r.kind === "ok") setUnits(r.data.items);
  }, []);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    setSuccess(null);
    const r = await createFamilyUnit(name.trim());
    setBusy(false);
    if (r.kind === "ok") {
      setSuccess(`"${r.data.name}" created.`);
      setName("");
      loadUnits();
    } else if (r.kind === "pending" || r.kind === "denied") {
      setNotice(r);
    }
    // "error" kind: generic; leave form intact so user can retry
  }

  return (
    <div>
      {/* Create form */}
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Family group name
          </label>
          <input
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="The Smiths · Holiday Squad · …"
            maxLength={80}
            required
          />
        </div>
        <button
          type="submit"
          style={!name.trim() || busy ? disabledBtn : primaryBtn}
          disabled={!name.trim() || busy}
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </form>

      {success && (
        <p style={{ fontSize: 13, color: "#059669", marginTop: 10 }}>✓ {success}</p>
      )}

      {notice && (
        <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />
      )}

      {/* Existing family units */}
      {units && units.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: "#a8a29e", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Your family groups
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
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "#78716c" }}>
                  {u.members.length} {u.members.length === 1 ? "member" : "members"} · {u.status}
                </div>
              </div>
              <span
                style={{
                  fontSize:     11,
                  color:        u.status === "active" ? "#059669" : "#78716c",
                  fontWeight:   600,
                  background:   u.status === "active" ? "#d1fae5" : "#f5f5f4",
                  borderRadius: 6,
                  padding:      "3px 8px",
                }}
              >
                {u.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {units && units.length === 0 && (
        <p style={{ fontSize: 13, color: "#a8a29e", marginTop: 14 }}>
          No family groups yet. Start with your real people.
        </p>
      )}
    </div>
  );
}
