import type { Metadata } from "next";
import { LegacyAdminPathNotice } from "@/components/admin/workspaces/LegacyAdminPathNotice";
import { OfferCatalogAdminClient } from "@/components/vmb/admin/OfferCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offer Catalog (legacy)",
};

/** @deprecated Use /admin/invites/offers — VMB product shell compatibility route. */
export default async function VmbAdminOffersPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">
        <LegacyAdminPathNotice
          legacyPath="/vmb/admin/offers"
          canonicalPath="/admin/invites/offers"
          label="Offer catalog admin"
        />
      </div>
      <OfferCatalogAdminClient salonId={ctx.trialId} />
    </>
  );
}
