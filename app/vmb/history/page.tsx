import type { Metadata } from "next";
import { VmbHistoryClient } from "@/components/vmb/VmbHistoryClient";

export const metadata: Metadata = {
  title: "History",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  return <VmbHistoryClient initialAnalysisId={params.analysis?.trim()} />;
}
