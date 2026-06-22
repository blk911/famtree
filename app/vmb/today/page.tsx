import type { Metadata } from "next";
import { VmbTodayClient } from "@/components/vmb/VmbTodayClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";
import { buildClientOpportunities } from "@/lib/vmb/client-opportunities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbTodayPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  const clientOpportunities = ctx.activeAnalysis
    ? buildClientOpportunities(ctx.activeAnalysis).rows
    : [];
  return (
    <VmbTodayClient
      salonName={ctx.salonName}
      operatorName={ctx.workspace?.ownerName}
      hasCompletedFirstIngest={ctx.hasCompletedFirstIngest}
      wouldUnlockToday={ctx.wouldUnlockToday}
      lockReason={ctx.lockReason}
      activeAnalysisId={ctx.activeAnalysisId}
      recordCount={ctx.activeAnalysis?.recordCount ?? 0}
      clientCount={ctx.activeAnalysis?.recordCount ?? 0}
      pageContext={{
        trialId: ctx.trialId,
        hasSession: ctx.hasSession,
        hasCompletedFirstIngest: ctx.hasCompletedFirstIngest,
        wouldUnlockToday: ctx.wouldUnlockToday,
        lockReason: ctx.lockReason,
        activeAnalysisId: ctx.activeAnalysisId,
        recordCount: ctx.activeAnalysis?.recordCount ?? 0,
      }}
      clientOpportunities={clientOpportunities}
    />
  );
}
