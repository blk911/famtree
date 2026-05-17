"use client";

import { useState } from "react";
import {
  createTrustUnit,
  type AihEscalated,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import {
  VAULT_SPACE_TYPES,
  vaultSpaceTypeShortLabel,
  type VaultSpaceType,
} from "@/lib/aihsafe/vault-space";

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
  background:   "#7c3aed",
  color:        "#fff",
  borderRadius: 10,
  padding:      "10px 22px",
  border:       "none",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};

export function TrustUnitCreatePanel() {
  const [vaultSpaceType, setVaultSpaceType] = useState<VaultSpaceType>("CUSTOM");
  const [name,           setName]           = useState("");
  const [description,    setDescription]    = useState("");
  const [busy,           setBusy]           = useState(false);
  const [notice,         setNotice]         = useState<AihEscalated | AihDenied | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setNotice(null);
    setSuccess(null);
    const r = await createTrustUnit({
      vaultSpaceType,
      name: trimmed,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
    setBusy(false);
    if (r.kind === "ok") {
      setSuccess(`${vaultSpaceTypeShortLabel(r.data.vaultSpaceType)} space created.`);
      setName("");
      setDescription("");
    } else if (r.kind === "pending" || r.kind === "denied") {
      setNotice(r);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Space name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend hiking circle"
            maxLength={80}
            required
            aria-required="true"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Space type
          </label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={vaultSpaceType}
            onChange={(e) => setVaultSpaceType(e.target.value as VaultSpaceType)}
          >
            {VAULT_SPACE_TYPES.map((t) => (
              <option key={t} value={t}>
                {vaultSpaceTypeShortLabel(t)}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: "#78716c", margin: "6px 0 0" }}>
            This category labels your space everywhere — posts and activity stay inside this trusted circle.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
            Description <span style={{ fontWeight: 400, color: "#a8a29e" }}>(optional)</span>
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this space is for…"
            maxLength={2000}
          />
        </div>

        <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 16px", lineHeight: 1.5 }}>
          <strong style={{ color: "#57534e" }}>Initial members:</strong> invite people after creation from each space
          card — invites keep guardian and consent flows intact.
        </p>

        <button
          type="submit"
          style={busy || !name.trim() ? { ...primaryBtn, opacity: 0.45, cursor: "not-allowed" } : primaryBtn}
          disabled={busy || !name.trim()}
        >
          {busy ? "Creating…" : "Create trusted space"}
        </button>
      </form>

      {success && (
        <p style={{ fontSize: 13, color: "#059669", marginTop: 10 }}>✓ {success}</p>
      )}
      {notice && (
        <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />
      )}
    </div>
  );
}
