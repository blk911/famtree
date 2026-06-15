import type { Metadata } from "next";
import { OfferCatalogAdminClient } from "@/components/vmb/admin/OfferCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offer Catalog",
};

export default async function VmbAdminOffersPage() {
  const ctx = await loadVmbPageContext({});
  return <OfferCatalogAdminClient salonId={ctx.trialId} />;
}
