import type { Metadata } from "next";

import { NailInviteCatalogAdminClient } from "@/components/vmb/admin/NailInviteCatalogAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nail Invite Catalog · Invites",
};

export default async function AdminNailInviteCatalogPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <NailInviteCatalogAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      providerName={ctx.workspace?.ownerName}
    />
  );
}
