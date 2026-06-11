import type { Metadata } from "next";
import { VmbInvitesClient } from "@/components/vmb/VmbInvitesClient";

export const metadata: Metadata = {
  title: "Invites",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbInvitesPage({ searchParams }: Props) {
  const params = await searchParams;
  return <VmbInvitesClient initialAnalysisId={params.analysis?.trim()} />;
}
