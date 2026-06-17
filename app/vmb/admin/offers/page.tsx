import type { Metadata } from "next";
import { LegacyAdminPathNotice } from "@/components/admin/workspaces/LegacyAdminPathNotice";
import { TemplateLibraryAdminClient } from "@/components/vmb/admin/TemplateLibraryAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Library (legacy)",
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
          label="Template library admin"
        />
      </div>
      <TemplateLibraryAdminClient
        salonId={ctx.trialId}
        salonName={ctx.salonName}
        ownerName={ctx.workspace?.ownerName}
      />
    </>
  );
}
