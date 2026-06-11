"use client";

import { useMemo, useState } from "react";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { SimplePreviewModal } from "@/components/vmb/dashboard/SimplePreviewModal";
import { WeeklyHomeItem } from "@/components/vmb/dashboard/WeeklyHomeItem";
import { useInviteDrafts } from "@/components/vmb/dashboard/useInviteDrafts";
import { buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

const HOME_OFFERS = [
  "Gel X Refresh",
  "Gloss + Blowout",
  "Birthday Touch",
  "Bring A Friend",
] as const;

type Props = {
  analysis: VmbBookAnalysisResult;
};

export function VmbOperatingDashboard({ analysis }: Props) {
  const { drafts, loading: draftsLoading, saving, patchDraft } = useInviteDrafts({
    analysis,
    isDemo: false,
  });

  const [inviteListOpen, setInviteListOpen] = useState(false);
  const [welcomeListOpen, setWelcomeListOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const snapshot = useMemo(
    () => buildVmbOperatingSnapshot(analysis, { inviteState: { invited: 0, joined: 0 } }),
    [analysis],
  );

  if (!snapshot) return null;

  const inviteReady = drafts.length > 0 ? drafts.filter((d) => d.status === "draft").length : 10;
  const topCandidates = drafts.slice(0, 5).map((d) => d.clientName);
  const activeDraft = drafts.find((d) => d.draftId === activeDraftId) ?? null;

  const welcomeRows = snapshot.newClients.rows;
  const revenue = snapshot.weeklyRevenue;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px 80px" }}>
      <header style={{ marginBottom: 8, paddingBottom: 20, borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 13,
            fontWeight: 600,
            color: VMB_THEME.muted,
          }}
        >
          {snapshot.salonName}
        </p>
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(30px, 4vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          This Week
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
          VMB found the next relationship moves in your client book.
        </p>
      </header>

      <WeeklyHomeItem
        title="Launch My Private Client Network"
        summary={`${inviteReady} invites ready`}
        detail={
          draftsLoading ? (
            "Loading candidates…"
          ) : topCandidates.length > 0 ? (
            <span>{topCandidates.join(" · ")}</span>
          ) : (
            "Top candidates from your active analysis."
          )
        }
        ctaLabel="Preview Invites"
        onCta={() => setInviteListOpen(true)}
        ctaDisabled={draftsLoading || drafts.length === 0}
      />

      <WeeklyHomeItem
        title="Welcome New Clients"
        summary={`${welcomeRows.length} welcomes ready`}
        detail={
          welcomeRows.length > 0 ? (
            <span>{welcomeRows.map((r) => r.clientName).join(" · ")}</span>
          ) : (
            "New clients ready for a personal welcome."
          )
        }
        ctaLabel="Preview Welcomes"
        onCta={() => setWelcomeListOpen(true)}
        ctaDisabled={welcomeRows.length === 0}
      />

      <WeeklyHomeItem
        title="Revenue Moves"
        summary={`${revenue.readyThisWeek} touches ready · $${revenue.potentialRevenue.toLocaleString()} potential`}
        detail={
          revenue.opportunities.length > 0 ? (
            <span>
              {revenue.opportunities
                .slice(0, 4)
                .map((o) => o.clientName)
                .join(" · ")}
            </span>
          ) : (
            "Win-back and rebooking opportunities from your book."
          )
        }
        ctaLabel="Review Revenue Moves"
        ctaHref={appendVmbAnalysisQuery("/vmb/clients", analysis.analysisId, "this-week")}
      />

      <WeeklyHomeItem
        title="Standard Offers"
        summary="Your go-to offers for this week"
        detail={
          <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
            {HOME_OFFERS.map((offer) => (
              <li key={offer} style={{ marginBottom: 4 }}>
                {offer}
              </li>
            ))}
          </ul>
        }
        ctaLabel="Coming Soon"
        ctaDisabled
      />

      {inviteListOpen ? (
        <SimplePreviewModal
          title="Private Client Invites"
          rows={drafts.map((d) => ({
            id: d.draftId,
            label: d.clientName,
            sublabel: d.reasonSelected,
          }))}
          onClose={() => setInviteListOpen(false)}
          onSelectRow={(id) => {
            setInviteListOpen(false);
            setActiveDraftId(id);
          }}
        />
      ) : null}

      {welcomeListOpen ? (
        <SimplePreviewModal
          title="Welcome Messages"
          rows={welcomeRows.map((r) => ({
            id: r.id,
            label: r.clientName,
            body: r.welcomeMessage,
          }))}
          onClose={() => setWelcomeListOpen(false)}
        />
      ) : null}

      {activeDraft ? (
        <InviteDraftPreviewModal
          draft={activeDraft}
          saving={saving}
          onClose={() => setActiveDraftId(null)}
          onSaveDraft={(message) => {
            void patchDraft(activeDraft.draftId, { editableMessage: message, status: "draft" });
            setActiveDraftId(null);
          }}
          onApprove={(message) => {
            void patchDraft(activeDraft.draftId, { editableMessage: message, status: "approved" });
            setActiveDraftId(null);
          }}
          onSkip={() => {
            void patchDraft(activeDraft.draftId, { status: "skipped" });
            setActiveDraftId(null);
          }}
        />
      ) : null}
    </div>
  );
}
