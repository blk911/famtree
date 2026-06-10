"use client";

import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  draft: VmbInviteDraft;
  onPreview: () => void;
  onEdit: () => void;
};

const STATUS_COLORS: Record<VmbInviteDraft["status"], string> = {
  draft: VMB_THEME.muted,
  approved: "#15803d",
  skipped: "#a8a29e",
  sent: VMB_THEME.accent,
};

export function InviteDraftRow({ draft, onPreview, onEdit }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1.4fr 1fr 0.7fr 0.7fr auto",
        gap: 8,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px solid ${VMB_THEME.line}`,
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 600, color: VMB_THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {draft.clientName}
      </span>
      <span style={{ color: VMB_THEME.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {draft.reasonSelected}
      </span>
      <span style={{ color: VMB_THEME.muted, fontSize: 12 }}>Private Network</span>
      <span style={{ fontWeight: 600, color: VMB_THEME.ink }}>${draft.potentialValue}</span>
      <span style={{ fontWeight: 700, color: STATUS_COLORS[draft.status], textTransform: "capitalize" }}>
        {draft.status}
      </span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <RowButton label="Preview" onClick={onPreview} />
        <RowButton label="✎" onClick={onEdit} title="Edit message" />
      </div>
    </div>
  );
}

function RowButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: "4px 8px",
        borderRadius: 8,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
        fontSize: 12,
        fontWeight: 600,
        color: VMB_THEME.ink,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
