import type { Metadata } from "next";

import { CardTemplateAdminClient } from "@/components/vmb/admin/CardTemplateAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Nail Invite Templates · Invites",
};

export default async function AdminInvitesTemplatesPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <CardTemplateAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ctx.workspace?.ownerName}
    />
  );
}

