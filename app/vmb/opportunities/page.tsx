import type { Metadata } from "next";
import { VmbOpportunitiesCenterClient } from "@/components/vmb/VmbOpportunitiesCenterClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Opportunities",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbOpportunitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });

  return (
    <VmbOpportunitiesCenterClient
      initialAnalysisId={ctx.activeAnalysisId ?? params.analysis?.trim()}
    />
  );
}
