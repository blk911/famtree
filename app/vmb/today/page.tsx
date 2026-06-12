import type { Metadata } from "next";
import { VmbTodayClient } from "@/components/vmb/VmbTodayClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Today",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbTodayPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbTodayClient
      salonName={ctx.salonName}
      operatorName={ctx.workspace?.ownerName}
      hasCompletedFirstIngest={ctx.hasCompletedFirstIngest}
      activeAnalysisId={ctx.activeAnalysisId}
    />
  );
}
