import type { Metadata } from "next";
import { LegacyAdminPathNotice } from "@/components/admin/workspaces/LegacyAdminPathNotice";
import { CardTemplateAdminClient } from "@/components/vmb/admin/CardTemplateAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Templates (legacy)",
};

/** @deprecated Use /admin/invites/templates — VMB product shell compatibility route. */
export default async function VmbAdminTemplatesPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">
        <LegacyAdminPathNotice
          legacyPath="/vmb/admin/templates"
          canonicalPath="/admin/invites/templates"
          label="Card templates admin"
        />
      </div>
      <CardTemplateAdminClient
        salonId={ctx.trialId}
        salonName={ctx.salonName}
        ownerName={ctx.workspace?.ownerName}
      />
    </>
  );
}
