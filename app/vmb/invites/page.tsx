import type { Metadata } from "next";
import { VmbInvitesClient } from "@/components/vmb/VmbInvitesClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Invites",
};

type Props = {
  searchParams: Promise<{ analysis?: string; section?: string }>;
};

export default async function VmbInvitesPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbInvitesClient
      initialAnalysisId={ctx.activeAnalysisId ?? params.analysis?.trim()}
      initialSection={params.section?.trim()}
      salonName={ctx.salonName}
    />
  );
}
