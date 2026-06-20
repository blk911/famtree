"use client";

import { ApprovedInvitationCard } from "@/components/vmb/salon/ApprovedInvitationCard";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { SalonInvitationApproval } from "@/types/vmb/salon-invitation-approval";

type Props = {
  approvals: SalonInvitationApproval[];
  actionBusyId: string | null;
  onPreview: (approval: SalonInvitationApproval) => void;
  onReviewSendPackage: (approval: SalonInvitationApproval) => void;
  onPause: (approval: SalonInvitationApproval) => void;
};

export function ApprovedInvitationsSection({
  approvals,
  actionBusyId,
  onPreview,
  onReviewSendPackage,
  onPause,
}: Props) {
  return (
    <section>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          Approved Invitations ({approvals.length})
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
          Ready to prepare send package.
        </p>
      </header>
      {approvals.length === 0 ? (
        <EmptyPanel message="No invitations approved yet." />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {approvals.map((approval) => (
            <ApprovedInvitationCard
              key={approval.id}
              approval={approval}
              busy={actionBusyId === approval.id}
              onPreview={() => onPreview(approval)}
              onReviewSendPackage={() => onReviewSendPackage(approval)}
              onPause={() => onPause(approval)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px 20px",
        borderRadius: 14,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
      }}
    >
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: VMB_THEME.muted }}>{message}</p>
    </div>
  );
}
