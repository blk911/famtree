import type { Metadata } from "next";
import { LegacyAdminPathNotice } from "@/components/admin/workspaces/LegacyAdminPathNotice";
import { ServiceCatalogAdminClient } from "@/components/vmb/admin/ServiceCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Catalog (legacy)",
};

/** @deprecated Use /admin/invites/services — VMB product shell compatibility route. */
export default async function VmbAdminServicesPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">
        <LegacyAdminPathNotice
          legacyPath="/vmb/admin/services"
          canonicalPath="/admin/invites/services"
          label="Service catalog admin"
        />
      </div>
      <ServiceCatalogAdminClient salonId={ctx.trialId} />
    </>
  );
}
