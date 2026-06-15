import type { Metadata } from "next";
import { ServiceCatalogAdminClient } from "@/components/vmb/admin/ServiceCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Catalog · Invites",
};

export default async function AdminInvitesServicesPage() {
  const ctx = await loadVmbPageContext({});
  return <ServiceCatalogAdminClient salonId={ctx.trialId} />;
}
