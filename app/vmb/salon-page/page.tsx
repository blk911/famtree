import type { Metadata } from "next";
import { SalonPageClient } from "@/components/vmb/salon/SalonPageClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Salon Page",
};

export default async function VmbSalonPageRoute() {
  const ctx = await loadVmbPageContext({});
  const ownerName = ctx.workspace?.ownerName?.trim() || undefined;
  return (
    <SalonPageClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ownerName}
    />
  );
}
