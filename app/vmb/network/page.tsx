import type { Metadata } from "next";
import { VmbNetworkClient } from "@/components/vmb/VmbNetworkClient";

export const metadata: Metadata = {
  title: "Private Client Network",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbNetworkPage({ searchParams }: Props) {
  const params = await searchParams;
  return <VmbNetworkClient initialAnalysisId={params.analysis?.trim()} />;
}
