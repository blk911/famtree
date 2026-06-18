"use client";

import { useEffect, useState } from "react";
import { INVITE_SECTION_LABELS } from "@/lib/vmb/invites/sections";
import { buildOutreachLockedFooter } from "@/lib/vmb/invites/outreach-message-presets";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  draft: VmbInviteDraft;
  salonName?: string;
  onClose: () => void;
  onSave?: (message: string) => void;
  onApprove?: (message: string) => void;
  onSkip?: () => void;
  saving?: boolean;
  previewOnly?: boolean;
};

export function InviteDraftPreviewModal({
  draft,
  salonName = "Your Salon",
  onClose,
  onSave,
  onApprove,
  onSkip,
  saving = false,
  previewOnly = false,
}: Props) {
  const [message, setMessage] = useState(draft.editableMessage);
  const categoryLabel = INVITE_SECTION_LABELS[draft.inviteCategory] ?? draft.inviteCategory;

  useEffect(() => {
    setMessage(draft.editableMessage);
  }, [draft.draftId, draft.editableMessage]);

  const footer =
    draft.lockedFooter || buildOutreachLockedFooter(salonName);

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

        <LockedRow label="Recipient" value={draft.clientName} />
        {draft.email ? <LockedRow label="Email" value={draft.email} /> : null}
        {draft.phone ? <LockedRow label="Phone" value={draft.phone} /> : null}
        <LockedRow label="Category" value={categoryLabel} />
        <LockedRow label="Subject" value={draft.subject} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: VMB_THEME.muted }}>
          Message{previewOnly ? "" : " (editable)"}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          readOnly={previewOnly}
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
          {footer}
        </pre>

        {previewOnly ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModalButton label="Close" variant="secondary" onClick={onClose} />
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <ModalButton label="Save" variant="secondary" disabled={saving} onClick={() => onSave?.(message)} />
            <ModalButton label="Approve" disabled={saving} onClick={() => onApprove?.(message)} />
            <ModalButton label="Skip" variant="secondary" disabled={saving} onClick={() => onSkip?.()} />
          </div>
        )}
      </div>
    </div>
  );
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14, fontSize: 14 }}>
      <div style={{ color: VMB_THEME.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: label === "Recipient" ? 700 : 500 }}>{value}</div>
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
