import type { Metadata } from "next";
import { SalonServicesClient } from "@/components/vmb/salon/SalonServicesClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
};

export default async function VmbServicesPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <SalonServicesClient salonId={ctx.trialId} salonName={ctx.salonName} />
  );
}
