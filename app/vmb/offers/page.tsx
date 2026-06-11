import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Service Offers",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbPlaceholderPage
      title="Service Offers"
      purpose="Standard offers and salon promotions tied to your active book."
      context={ctx}
    />
  );
}
