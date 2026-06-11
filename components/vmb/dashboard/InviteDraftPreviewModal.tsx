"use client";

import { useEffect, useState } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  draft: VmbInviteDraft;
  onClose: () => void;
  onApprove: (message: string) => void;
  onSkip: () => void;
  saving?: boolean;
};

export function InviteDraftPreviewModal({
  draft,
  onClose,
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
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
          maxWidth: 480,
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: 16,
          background: "#fff",
          border: `1px solid ${VMB_THEME.line}`,
          padding: "22px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Preview</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
              color: VMB_THEME.muted,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 14, fontSize: 14 }}>
          <div style={{ color: VMB_THEME.muted, marginBottom: 4 }}>To:</div>
          <div style={{ fontWeight: 700 }}>{draft.clientName}</div>
        </div>

        <div style={{ marginBottom: 14, fontSize: 14 }}>
          <div style={{ color: VMB_THEME.muted, marginBottom: 4 }}>Subject:</div>
          <div>{draft.subject}</div>
        </div>

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: VMB_THEME.muted }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={9}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
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
            margin: "0 0 18px",
            padding: "10px 12px",
            borderRadius: 8,
            background: VMB_THEME.warmBg,
            fontSize: 12,
            lineHeight: 1.45,
            color: VMB_THEME.muted,
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {draft.lockedFooter}
        </pre>

        <div style={{ display: "flex", gap: 10 }}>
          <ModalButton label="Approve" disabled={saving} onClick={() => onApprove(message)} />
          <ModalButton label="Skip" variant="secondary" disabled={saving} onClick={onSkip} />
        </div>
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
        padding: "10px 18px",
        borderRadius: 10,
        border: isPrimary ? "none" : `1px solid ${VMB_THEME.line}`,
        background: isPrimary ? VMB_THEME.accent : "#fff",
        color: isPrimary ? "#fff" : VMB_THEME.ink,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
