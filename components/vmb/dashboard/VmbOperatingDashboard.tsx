"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NetworkLaunchSection } from "@/components/vmb/dashboard/NetworkLaunchSection";
import { NewClientsSection } from "@/components/vmb/dashboard/NewClientsSection";
import { StandardOffersSection } from "@/components/vmb/dashboard/StandardOffersSection";
import { WeeklyRevenueSection } from "@/components/vmb/dashboard/WeeklyRevenueSection";
import { buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
import {
  readNetworkInviteState,
  writeNetworkInviteState,
} from "@/lib/vmb/operating-system/local-state";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type Props = {
  analysis: VmbBookAnalysisResult;
  isDemo?: boolean;
};

export function VmbOperatingDashboard({ analysis, isDemo = false }: Props) {
  const [inviteState, setInviteState] = useState(() =>
    readNetworkInviteState(analysis.analysisId),
  );
  const [networkPreviewOpen, setNetworkPreviewOpen] = useState(false);
  const [revenuePreviewOpen, setRevenuePreviewOpen] = useState(false);
  const [welcomePreviewId, setWelcomePreviewId] = useState<string | null>(null);
  const [approvedWelcomeIds, setApprovedWelcomeIds] = useState<string[]>([]);

  const snapshot = useMemo(
    () => buildVmbOperatingSnapshot(analysis, { inviteState }),
    [analysis, inviteState],
  );

  if (!snapshot) return null;

  function handleApproveNetwork() {
    setInviteState((prev) => {
      const snap = buildVmbOperatingSnapshot(analysis, { inviteState: prev });
      const ready = snap?.network.readyThisWeek ?? 0;
      const next = { invited: prev.invited + ready, joined: prev.joined };
      writeNetworkInviteState(analysis.analysisId, next);
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px 72px" }}>
      {isDemo ? (
        <p
          style={{
            margin: "0 0 20px",
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fff",
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 14,
            color: VMB_THEME.muted,
          }}
        >
          Sample operating view.{" "}
          <Link href="/vmb/start" style={{ color: VMB_THEME.accent, fontWeight: 700 }}>
            Find The Money →
          </Link>
        </p>
      ) : null}

      <header style={{ marginBottom: 28 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: VMB_THEME.accent,
          }}
        >
          {snapshot.salonName}
        </p>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          What should I do this week?
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
          Grow your network, welcome new clients, generate revenue, and use your standard offers.
        </p>
      </header>

      <NetworkLaunchSection
        summary={snapshot.network}
        previewOpen={networkPreviewOpen}
        onPreview={() => setNetworkPreviewOpen((open) => !open)}
        onApprove={handleApproveNetwork}
      />

      <NewClientsSection
        summary={{
          ...snapshot.newClients,
          rows: snapshot.newClients.rows.filter((row) => !approvedWelcomeIds.includes(row.id)),
        }}
        previewId={welcomePreviewId}
        onPreview={(id) => setWelcomePreviewId((current) => (current === id ? null : id))}
        onApprove={(id) => {
          setApprovedWelcomeIds((ids) => [...ids, id]);
          setWelcomePreviewId(null);
        }}
      />

      <WeeklyRevenueSection
        summary={snapshot.weeklyRevenue}
        analysisId={analysis.analysisId}
        showOpportunities={revenuePreviewOpen}
        onToggleOpportunities={() => setRevenuePreviewOpen((open) => !open)}
      />

      <StandardOffersSection offers={snapshot.standardOffers} />
    </div>
  );
}
