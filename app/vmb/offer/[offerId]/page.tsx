import type { Metadata } from "next";
import { SalonOfferClaimClient } from "@/components/vmb/salon/SalonOfferClaimClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim Offer",
};

type Props = {
  params: Promise<{ offerId: string }>;
};

export default async function SalonOfferClaimPage({ params }: Props) {
  const { offerId } = await params;
  const ctx = await loadVmbPageContext({});
  return (
    <SalonOfferClaimClient
      offerId={offerId}
      salonId={ctx.trialId}
      salonName={ctx.salonName}
    />
  );
}
