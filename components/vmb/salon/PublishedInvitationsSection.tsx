"use client";

import { PublishedInvitationInventoryCard } from "@/components/vmb/salon/PublishedInvitationInventoryCard";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  copies: SalonInviteLocalCopy[];
  tokenContext?: InviteTemplateTokenContext;
  actionBusyId: string | null;
  title?: string;
  description?: string;
  emptyMessage?: string;
  onPreview: (copy: SalonInviteLocalCopy) => void;
  onEditCopy: (copy: SalonInviteLocalCopy) => void;
  onPause: (copy: SalonInviteLocalCopy) => void;
};

export function PublishedInvitationsSection({
  copies,
  tokenContext,
  actionBusyId,
  title = "Published Invitations",
  description = "Active invitations available for TAIKOS matching and salon outreach.",
  emptyMessage = "No invitations have been published to your salon yet.",
  onPreview,
  onEditCopy,
  onPause,
}: Props) {
  return (
    <section>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          {title} ({copies.length})
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
          {description}
        </p>
      </header>
      {copies.length === 0 ? (
        <EmptyPanel message={emptyMessage} />
      ) : (
        <div className="vmb-published-invite-grid">
          {copies.map((copy) => (
            <PublishedInvitationInventoryCard
              key={copy.id}
              copy={copy}
              tokenContext={tokenContext}
              busy={actionBusyId === copy.id}
              onPreview={() => onPreview(copy)}
              onEditCopy={() => onEditCopy(copy)}
              onPause={() => onPause(copy)}
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
