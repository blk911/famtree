"use client";

import { WorkflowPanel } from "@/components/vmb/workflows/WorkflowPanel";
import { toInviteQueueItem } from "@/lib/vmb/presentation/labels";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  drafts: VmbInviteDraft[];
  onClose: () => void;
  onPreview: (draftId: string) => void;
};

export function InviteQueue({ drafts, onClose, onPreview }: Props) {
  return (
    <WorkflowPanel title="Invite Queue" onClose={onClose}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 0 }}>
        {drafts.map((draft) => {
          const item = toInviteQueueItem(draft);
          return (
            <li
              key={draft.draftId}
              style={{
                padding: "16px 0",
                borderBottom: `1px solid ${VMB_THEME.line}`,
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>{item.clientName}</p>
              <p style={{ margin: "0 0 2px", fontSize: 14, color: VMB_THEME.ink }}>
                {item.tier}
                {item.visits ? ` · ${item.visits}` : ""}
              </p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: VMB_THEME.muted }}>
                Why: {item.why}
              </p>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: VMB_THEME.muted }}>
                Suggested action: {item.suggestedAction}
              </p>
              <button
                type="button"
                onClick={() => onPreview(draft.draftId)}
                style={{
                  padding: 0,
                  border: "none",
                  background: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  color: VMB_THEME.accent,
                  cursor: "pointer",
                }}
              >
                Preview →
              </button>
            </li>
          );
        })}
      </ul>
    </WorkflowPanel>
  );
}
