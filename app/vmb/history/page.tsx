import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "History",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbPlaceholderPage
      title="History"
      purpose="Sent invites, replies, and campaign history for your salon."
      context={ctx}
    />
  );
}
