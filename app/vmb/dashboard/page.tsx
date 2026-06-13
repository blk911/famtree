import type { Metadata } from "next";
import { VmbDashboardClient } from "@/components/vmb/VmbDashboardClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Home",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return <VmbDashboardClient analysisId={ctx.activeAnalysisId ?? params.analysis?.trim()} />;
}
