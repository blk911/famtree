"use client";

import { useMemo, useState } from "react";
import {
  createGuardianLink,
  type AihDenied,
  type AihEscalated,
  type AihResult,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { GuardianLinkDTO } from "@/types/aihsafe/dto";
import type { MemberCandidate } from "@/components/aihsafe/people/memberCandidates";

export type GuardianLinkModalMode = "guardian" | "trusted_adult";

interface Props {
  mode:       GuardianLinkModalMode;
  candidates: MemberCandidate[];
  /** User IDs that already have an active link with the current user as guardian. */
  linkedChildIds: Set<string>;
  onClose:    () => void;
  onCreated:  (link: GuardianLinkDTO) => void;
}

const GUARDIAN_KINDS = [
  { value: "parent",         label: "Parent" },
  { value: "grandparent",    label: "Grandparent" },
  { value: "legal_guardian", label: "Legal guardian" },
] as const;

const PERMISSION_LEVELS = [
  { value: "view_only",    label: "View only — see activity in approved circles" },
  { value: "approver",     label: "Approver — can approve requests" },
  { value: "full_control", label: "Full stewardship — approve and manage settings" },
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

export function GuardianLinkModal({
  mode,
  candidates,
  linkedChildIds,
  onClose,
  onCreated,
}: Props) {
  const available = useMemo(
    () => candidates.filter((c) => !linkedChildIds.has(c.userId)),
    [candidates, linkedChildIds],
  );

  const [childUserId, setChildUserId] = useState("");
  const [kind, setKind] = useState<(typeof GUARDIAN_KINDS)[number]["value"]>("parent");
  const [permissionLevel, setPermissionLevel] =
    useState<GuardianLinkDTO["permissionLevel"]>("approver");
  const [submitting, setSubmitting] = useState(false);
  const [govResult, setGovResult] = useState<AihEscalated | AihDenied | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const title =
    mode === "trusted_adult"
      ? "Add a trusted adult"
      : "Connect as a guardian";

  const description =
    mode === "trusted_adult"
      ? "Trusted adults can support someone in your approved circle with the permission level you choose. You will be listed as their steward for this link."
      : "You will be listed as this person’s guardian. Choose how much oversight you need — they stay in your approved circle.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childUserId || submitting) return;

    setSubmitting(true);
    setGovResult(null);
    setFormError(null);

    const resolvedKind: GuardianLinkDTO["kind"] =
      mode === "trusted_adult" ? "trusted_adult" : kind;

    const result: AihResult<GuardianLinkDTO> = await createGuardianLink({
      childUserId,
      kind:            resolvedKind,
      permissionLevel,
    });

    setSubmitting(false);

    if (result.kind === "ok") {
      onCreated(result.data);
      onClose();
      return;
    }
    if (result.kind === "pending" || result.kind === "denied") {
      setGovResult(result);
      return;
    }
    setFormError(result.message);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardian-link-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.45)",
        zIndex:         60,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        20,
      }}
    >
      <div
        style={{
          background:   "#fff",
          borderRadius: 18,
          padding:      "24px 26px",
          maxWidth:     440,
          width:        "100%",
          boxShadow:    "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          id="guardian-link-modal-title"
          style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 18px", lineHeight: 1.55 }}>
          {description}
        </p>

        {mode === "guardian" && (
          <p
            style={{
              fontSize: 12,
              color:      "#57534e",
              background: "#fafaf9",
              border:       "1px solid #e7e5e4",
              borderRadius: 10,
              padding:      "10px 12px",
              margin:       "0 0 16px",
              lineHeight:   1.5,
            }}
          >
            Another adult can become a guardian by signing in and creating their own link, or by
            joining through your invite flow.
          </p>
        )}

        {govResult && (
          <div style={{ marginBottom: 14 }}>
            <DecisionNotice result={govResult} onDismiss={() => setGovResult(null)} />
          </div>
        )}

        {formError && (
          <div
            role="alert"
            style={{
              background:   "#fef2f2",
              border:       "1px solid #fca5a5",
              borderRadius: 10,
              padding:      "10px 14px",
              fontSize:     13,
              color:        "#dc2626",
              marginBottom: 14,
            }}
          >
            {formError}
          </div>
        )}

        {available.length === 0 ? (
          <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 16px" }}>
            Add people to a family group or trusted space first, then you can link them here.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>
                Person in your approved circle
              </span>
              <select
                required
                value={childUserId}
                onChange={(e) => setChildUserId(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              >
                <option value="">Select someone…</option>
                {available.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.displayName}
                    {c.sources.length > 0 ? ` · ${c.sources.join(", ")}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {mode === "guardian" && (
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>
                  Your role
                </span>
                <select
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as (typeof GUARDIAN_KINDS)[number]["value"])
                  }
                  style={{ ...inputStyle, marginTop: 6 }}
                >
                  {GUARDIAN_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>
                Permission level
              </span>
              <select
                value={permissionLevel}
                onChange={(e) =>
                  setPermissionLevel(e.target.value as GuardianLinkDTO["permissionLevel"])
                }
                style={{ ...inputStyle, marginTop: 6 }}
              >
                {PERMISSION_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding:      "10px 16px",
                  borderRadius: 10,
                  border:       "1px solid #e7e5e4",
                  background:   "#fff",
                  fontWeight:   600,
                  fontSize:     13,
                  cursor:       "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !childUserId}
                style={{
                  padding:      "10px 18px",
                  borderRadius: 10,
                  border:       "none",
                  background:   "#1c1917",
                  color:        "#fff",
                  fontWeight:   700,
                  fontSize:     13,
                  cursor:       submitting ? "default" : "pointer",
                  opacity:      submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Saving…" : "Save link"}
              </button>
            </div>
          </form>
        )}

        {available.length === 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding:      "10px 16px",
                borderRadius: 10,
                border:       "1px solid #e7e5e4",
                background:   "#fff",
                fontWeight:   600,
                fontSize:     13,
                cursor:       "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
