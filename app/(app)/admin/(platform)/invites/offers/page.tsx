import type { Metadata } from "next";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";
import { OfferCatalogAdminClient } from "@/components/vmb/admin/OfferCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offer Catalog · Invites",
};

export default async function AdminInvitesOffersPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-4 pt-2 sm:px-6 lg:px-8">
        <InvitesWorkspaceBreadcrumb current="Offers" />
      </div>
      <OfferCatalogAdminClient salonId={ctx.trialId} />
    </>
  );
}