import type { Metadata } from "next";
import { TemplateLibraryAdminClient } from "@/components/vmb/admin/TemplateLibraryAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Library · Invites",
};

export default async function AdminInvitesOffersPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <TemplateLibraryAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ctx.workspace?.ownerName}
    />
  );
}
