import type { Metadata } from "next";
import { VmbClientsClient } from "@/components/vmb/VmbClientsClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Client Book",
};

type Props = {
  searchParams: Promise<{ analysis?: string; view?: string }>;
};

export default async function VmbClientsPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });

  return (
    <VmbClientsClient
      initialAnalysisId={ctx.activeAnalysisId ?? params.analysis?.trim()}
      initialView={params.view?.trim()}
    />
  );
}
