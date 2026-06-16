import type { Metadata } from "next";
import { SalonOffersClient } from "@/components/vmb/salon/SalonOffersClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers",
};

export default async function VmbOffersPage() {
  const ctx = await loadVmbPageContext({});
  return <SalonOffersClient salonId={ctx.trialId} salonName={ctx.salonName} />;
}
