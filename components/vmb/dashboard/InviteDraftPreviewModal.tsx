"use client";

import { useEffect, useState } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  draft: VmbInviteDraft;
  onClose: () => void;
  onSaveDraft: (message: string) => void;
  onApprove: (message: string) => void;
  onSkip: () => void;
  saving?: boolean;
};

export function InviteDraftPreviewModal({
  draft,
  onClose,
  onSaveDraft,
  onApprove,
  onSkip,
  saving = false,
}: Props) {
  const [message, setMessage] = useState(draft.editableMessage);

  useEffect(() => {
    setMessage(draft.editableMessage);
  }, [draft.draftId, draft.editableMessage]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-draft-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(28, 25, 23, 0.45)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: 18,
          background: "#fff",
          border: `1px solid ${VMB_THEME.line}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          padding: "24px 22px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h3
            id="invite-draft-modal-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 800, color: VMB_THEME.ink }}
          >
            Invite Preview
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              color: VMB_THEME.muted,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <LockedField label="Recipient" value={draft.clientName} />
          <LockedField label="Email" value={draft.email || "Not on file"} />
          <LockedField label="Phone" value={draft.phone || "Not on file"} />
          <LockedField label="Subject" value={draft.subject} />
        </div>

        <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: VMB_THEME.muted }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 14,
            lineHeight: 1.5,
            resize: "vertical",
            fontFamily: "inherit",
            marginBottom: 8,
          }}
        />
        <pre
          style={{
            margin: "0 0 16px",
            padding: "10px 12px",
            borderRadius: 10,
            background: VMB_THEME.warmBg,
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 12,
            lineHeight: 1.45,
            color: VMB_THEME.muted,
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {draft.lockedFooter}
        </pre>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <ModalButton
            label="Save Draft"
            variant="secondary"
            disabled={saving}
            onClick={() => onSaveDraft(message)}
          />
          <ModalButton label="Approve" disabled={saving} onClick={() => onApprove(message)} />
          <ModalButton label="Skip" variant="secondary" disabled={saving} onClick={onSkip} />
        </div>
      </div>
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: VMB_THEME.muted, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: VMB_THEME.warmBg,
          border: `1px solid ${VMB_THEME.line}`,
          fontSize: 14,
          color: VMB_THEME.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ModalButton({
  label,
  onClick,
  variant = "primary",
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        border: isPrimary ? "none" : `1px solid ${VMB_THEME.line}`,
        background: isPrimary ? VMB_THEME.accent : "#fff",
        color: isPrimary ? "#fff" : VMB_THEME.ink,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
