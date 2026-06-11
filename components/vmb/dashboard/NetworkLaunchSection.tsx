"use client";

import { useState } from "react";
import { ActionButton, OperatingSection, statRowStyle } from "@/components/vmb/dashboard/OperatingSection";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { InviteDraftRow } from "@/components/vmb/dashboard/InviteDraftRow";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type Props = {
  drafts: VmbInviteDraft[];
  loading?: boolean;
  saving?: boolean;
  readyThisWeek: number;
  onApproveAll: () => void;
  onPatchDraft: (
    draftId: string,
    patch: { status?: VmbInviteDraft["status"]; editableMessage?: string },
  ) => Promise<boolean>;
};

export function NetworkLaunchSection({
  drafts,
  loading = false,
  saving = false,
  readyThisWeek,
  onApproveAll,
  onPatchDraft,
}: Props) {
  const [listOpen, setListOpen] = useState(true);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const activeDraft = drafts.find((d) => d.draftId === activeDraftId) ?? null;
  const invited = drafts.filter((d) => d.status === "approved" || d.status === "sent").length;
  const joined = drafts.filter((d) => d.status === "sent").length;
  const remaining = drafts.filter((d) => d.status === "draft" || d.status === "approved").length;

  async function handleApprove(message: string) {
    if (!activeDraft) return;
    await onPatchDraft(activeDraft.draftId, { editableMessage: message, status: "approved" });
    setActiveDraftId(null);
  }

  async function handleSkip() {
    if (!activeDraft) return;
    await onPatchDraft(activeDraft.draftId, { status: "skipped" });
    setActiveDraftId(null);
  }

  return (
    <>
      <OperatingSection
        title="Launch My Private Client Network"
        subtitle="One-time launch engine — invite your best clients into a private network."
      >
        <div style={statRowStyle}>
          <span>
            Top Candidates: <strong style={{ color: VMB_THEME.ink }}>{drafts.length}</strong>
          </span>
          <span>
            Invited: <strong style={{ color: VMB_THEME.ink }}>{invited}</strong>
          </span>
          <span>
            Joined: <strong style={{ color: VMB_THEME.ink }}>{joined}</strong>
          </span>
          <span>
            Remaining: <strong style={{ color: VMB_THEME.ink }}>{remaining}</strong>
          </span>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: VMB_THEME.ink }}>
          Ready This Week: {readyThisWeek} Private Client Invites
        </p>

        {loading ? (
          <p style={{ margin: "0 0 16px", fontSize: 14, color: VMB_THEME.muted }}>Loading invite batch…</p>
        ) : null}

        {listOpen && drafts.length > 0 ? (
          <div
            style={{
              margin: "0 0 16px",
              padding: "8px 12px",
              borderRadius: 12,
              background: VMB_THEME.warmBg,
              border: `1px solid ${VMB_THEME.line}`,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.4fr 1fr 0.7fr 0.7fr auto",
                gap: 8,
                padding: "6px 0 8px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: VMB_THEME.muted,
                borderBottom: `1px solid ${VMB_THEME.line}`,
              }}
            >
              <span>Client</span>
              <span>Reason</span>
              <span>Type</span>
              <span>Value</span>
              <span>Status</span>
              <span />
            </div>
            {drafts.map((draft) => (
              <InviteDraftRow
                key={draft.draftId}
                draft={draft}
                onPreview={() => setActiveDraftId(draft.draftId)}
                onEdit={() => setActiveDraftId(draft.draftId)}
              />
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <ActionButton
            label={listOpen ? "Hide Invites" : "Preview Invites"}
            variant="secondary"
            onClick={() => setListOpen((open) => !open)}
            disabled={loading || drafts.length === 0}
          />
          <ActionButton
            label="Approve This Week"
            onClick={onApproveAll}
            disabled={loading || saving || readyThisWeek <= 0}
          />
        </div>
      </OperatingSection>

      {activeDraft ? (
        <InviteDraftPreviewModal
          draft={activeDraft}
          saving={saving}
          onClose={() => setActiveDraftId(null)}
          onSave={async (message) => {
            await onPatchDraft(activeDraft.draftId, { editableMessage: message });
            setActiveDraftId(null);
          }}
          onApprove={handleApprove}
          onSkip={handleSkip}
        />
      ) : null}
    </>
  );
}
