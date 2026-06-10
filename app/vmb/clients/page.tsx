import type { Metadata } from "next";
import { VmbClientsClient } from "@/components/vmb/VmbClientsClient";

export const metadata: Metadata = {
  title: "Client Opportunities",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbClientsPage({ searchParams }: Props) {
  const params = await searchParams;
  return <VmbClientsClient initialAnalysisId={params.analysis?.trim()} />;
}
