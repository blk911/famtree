"use client";

import { useEffect, useState } from "react";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  copy: SalonInviteLocalCopy;
  saving?: boolean;
  onClose: () => void;
  onSave: (patch: { headline: string; body: string; ctaLabel: string }) => void;
};

export function SalonInvitationEditCopyModal({ copy, saving = false, onClose, onSave }: Props) {
  const [headline, setHeadline] = useState(copy.snapshot.headline);
  const [body, setBody] = useState(copy.snapshot.body);
  const [ctaLabel, setCtaLabel] = useState(copy.snapshot.ctaLabel);

  useEffect(() => {
    setHeadline(copy.snapshot.headline);
    setBody(copy.snapshot.body);
    setCtaLabel(copy.snapshot.ctaLabel);
  }, [copy]);

  return (
    <div className="vmb-admin-salon-invite-review-modal" role="presentation" onClick={onClose}>
      <div
        className="vmb-admin-salon-invite-review-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="salon-invitation-edit-copy-title"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <header className="vmb-admin-salon-invite-review-modal__header">
          <h2 id="salon-invitation-edit-copy-title">Edit Invitation Copy</h2>
          <button type="button" className="vmb-admin-salon-invite-review-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="vmb-admin-salon-invite-review-modal__body" style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>
            Update salon inventory copy for {copy.snapshot.templateName}. Admin library templates are unchanged.
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: VMB_THEME.muted }}>Headline</span>
            <input
              type="text"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: VMB_THEME.muted }}>Body</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: VMB_THEME.muted }}>Call to action</span>
            <input
              type="text"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={buttonStyle()}>
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave({ headline, body, ctaLabel })}
              style={buttonStyle("primary")}
            >
              {saving ? "Saving…" : "Save Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${VMB_THEME.line}`,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

function buttonStyle(variant: "primary" | "default" = "default") {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${variant === "primary" ? VMB_THEME.accent : VMB_THEME.line}`,
    background: variant === "primary" ? VMB_THEME.accentSoft : "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  } as const;
}
