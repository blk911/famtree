import type { Metadata } from "next";

import { CardTemplateAdminClient } from "@/components/vmb/admin/CardTemplateAdminClient";
import { getCurrentUser } from "@/lib/auth";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Templates · Invites",
};

export default async function AdminInvitesTemplatesPage() {
  const [ctx, user] = await Promise.all([loadVmbPageContext({}), getCurrentUser()]);
  const ownerPhotoUrl = user?.photoUrl?.trim() || undefined;

  return (
    <CardTemplateAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ctx.workspace?.ownerName}
      ownerPhotoUrl={ownerPhotoUrl}
    />
  );
}

