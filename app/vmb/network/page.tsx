import type { Metadata } from "next";
import { VmbNetworkClient } from "@/components/vmb/VmbNetworkClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Private Client Network",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbNetworkPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbNetworkClient initialAnalysisId={ctx.activeAnalysisId ?? params.analysis?.trim()} />
  );
}
